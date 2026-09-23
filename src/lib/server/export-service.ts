import "server-only";

import { basename } from "node:path";
import { PassThrough, Readable } from "node:stream";
import { once } from "node:events";
import { ZipArchive } from "archiver";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/server/db";
import { getBucket, getS3Client } from "@/lib/server/storage";
import {
  validateTransferReadiness,
  type ExportScope,
  type TransferValidationError,
  type TransferValidationResult,
} from "@/lib/server/transfer-service";

interface CarExportPayload {
  seller_id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: string;
  original_price: string | null;
  mileage_km: number;
  body_style: string | null;
  fuel_type: string | null;
  transmission: string | null;
  condition: string | null;
  tag: string | null;
  color: string | null;
  vin: string | null;
  description: string | null;
  city: string | null;
  location: string | null;
  status: string;
  rating: string | null;
  inspection_score: number | null;
  published_at: string | null;
  sold_at: string | null;
}

interface PartExportPayload {
  title: string;
  category: string;
  brand: string;
  part_number: string | null;
  oem_number: string | null;
  compatibility: Array<{ brand: string; model: string }>;
  condition: string;
  quantity: number;
  price: string;
  original_price: string | null;
  tag: string | null;
  free_shipping: boolean;
  city: string | null;
  location: string | null;
  status: string;
  images: string | null;
}

interface MediaExportPayload {
  source_media_id: string;
  mediable_type: string;
  mediable_id: string;
  url: string | null;
  type: string | null;
  is_primary: boolean;
  order: number;
  caption: string | null;
  file_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: string | null;
}

function json(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function safeFileName(value: string) {
  const cleaned = basename(value).replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned || "image";
}

export type ExportArchiveResult =
  | { ok: false; report: TransferValidationResult }
  | { ok: true; filename: string; stream: PassThrough };

export async function createExportArchive(
  scope: ExportScope,
  selectedSourceIds?: readonly bigint[],
): Promise<ExportArchiveResult> {
  const report = await validateTransferReadiness(scope, selectedSourceIds);
  if (!report.success) return { ok: false, report };

  const cars = scope === "car"
    ? await prisma.car.findMany({
        where: selectedSourceIds ? { id: { in: [...selectedSourceIds] } } : undefined,
        orderBy: { id: "asc" },
      })
    : [];
  const parts = scope === "part"
    ? await prisma.parts.findMany({
        where: selectedSourceIds ? { id: { in: [...selectedSourceIds] } } : undefined,
        include: {
          compatibilities: {
            include: { vehicleModel: { include: { brand: true } } },
            orderBy: { vehicleModelId: "asc" },
          },
        },
        orderBy: { id: "asc" },
      })
    : [];
  const media = await prisma.media.findMany({
    where: {
      mediableType: scope,
      ...(selectedSourceIds ? { mediableId: { in: [...selectedSourceIds] } } : {}),
    },
    orderBy: [{ mediableId: "asc" }, { order: "asc" }],
  });

  const mediaByListing = new Map<string, (typeof media)[number][]>();
  for (const item of media) {
    const key = item.mediableId.toString();
    const list = mediaByListing.get(key);
    if (list) list.push(item);
    else mediaByListing.set(key, [item]);
  }

  const listingPayloads: Array<
    | (CarExportPayload & { mediable_id: string; media_ids: string[] })
    | (PartExportPayload & { mediable_id: string; media_ids: string[] })
  > = scope === "car"
    ? cars.map((car) => ({
        mediable_id: car.id.toString(),
        media_ids: mediaByListing.get(car.id.toString())?.map((item) => item.id.toString()) ?? [],
        seller_id: car.sellerId.toString(),
        title: car.title,
        brand: car.brand,
        model: car.model,
        year: car.year,
        price: car.price.toString(),
        original_price: car.originalPrice?.toString() ?? null,
        mileage_km: car.mileageKm,
        body_style: car.bodyStyle,
        fuel_type: car.fuelType,
        transmission: car.transmission,
        condition: car.condition,
        tag: car.tag,
        color: car.color,
        vin: car.vin,
        description: car.description,
        city: car.city,
        location: car.location,
        status: car.status,
        rating: car.rating?.toString() ?? null,
        inspection_score: car.inspectionScore,
        published_at: car.publishedAt?.toISOString() ?? null,
        sold_at: car.soldAt?.toISOString() ?? null,
      }))
    : parts.map((part) => ({
        mediable_id: part.id.toString(),
        media_ids: mediaByListing.get(part.id.toString())?.map((item) => item.id.toString()) ?? [],
        title: part.title,
        category: part.category,
        brand: part.brand,
        part_number: part.partNumber,
        oem_number: part.oemNumber,
        compatibility: part.compatibilities.map((compatibility) => ({
          brand: compatibility.vehicleModel.brand.name,
          model: compatibility.vehicleModel.name,
        })),
        condition: part.condition,
        quantity: part.quantity,
        price: part.price.toString(),
        original_price: part.originalPrice?.toString() ?? null,
        tag: part.tag,
        free_shipping: part.freeShipping,
        city: part.city,
        location: part.location,
        status: part.status,
        images: part.images,
      }));

  const archivePaths = new Map(
    media.map((item) => {
      const sourceName = item.fileName ?? item.filePath ?? `media-${item.id}`;
      const fileName = `${String(item.order).padStart(2, "0")}-${item.id}-${safeFileName(sourceName)}`;
      return [item.id.toString(), `media/${scope}/${item.mediableId}/${fileName}`];
    }),
  );
  const mediaPayloads: MediaExportPayload[] = media.map((item) => ({
    source_media_id: item.id.toString(),
    mediable_type: item.mediableType,
    mediable_id: item.mediableId.toString(),
    url: item.url,
    type: item.type,
    is_primary: item.isPrimary,
    order: item.order,
    caption: item.caption,
    file_path: item.filePath,
    file_name: item.fileName,
    mime_type: item.mimeType,
    size_bytes: item.sizeBytes?.toString() ?? null,
  }));
  const sourceListings = scope === "car" ? cars : parts;
  const exportedSourceIds = new Set(sourceListings.map((listing) => listing.id.toString()));
  const manifest = {
    format_version: 4,
    scope,
    files: media.map((item) => ({
      source_media_id: item.id.toString(),
      mediable_type: item.mediableType,
      mediable_id: item.mediableId.toString(),
      file_path: item.filePath,
      packaged_path: archivePaths.get(item.id.toString()),
      is_primary: item.isPrimary,
      order: item.order,
    })),
  };
  const relationshipErrors: TransferValidationError[] = [];
  for (const item of media) {
    if (item.mediableType !== scope || !exportedSourceIds.has(item.mediableId.toString())) {
      relationshipErrors.push({
        type: "orphan_media",
        entityType: "media",
        entityId: item.id.toString(),
        message: `Media ${item.id} does not resolve to an exported ${scope} mediable_id.`,
      });
    }
    if (!archivePaths.get(item.id.toString())) {
      relationshipErrors.push({
        type: "missing_minio_object",
        entityType: "media",
        entityId: item.id.toString(),
        message: `Media ${item.id} has no packaged manifest path.`,
      });
    }
  }
  if (relationshipErrors.length > 0) {
    return {
      ok: false,
      report: {
        ...report,
        success: false,
        errors: [...report.errors, ...relationshipErrors],
      },
    };
  }
  const transferMetadata = {
    format_version: 4,
    scope,
    exported_at: new Date().toISOString(),
    relationship_mapping: {
      listing_key: "mediable_id",
      listing_media_ids_key: "media_ids",
      media_foreign_key: "mediable_id",
      media_type_key: "mediable_type",
      strip_listing_fields_before_insert: ["mediable_id", "media_ids"],
    },
    listing_mediable_ids: sourceListings.map((listing) => listing.id.toString()),
  };

  const output = new PassThrough();
  const archive = new ZipArchive({ zlib: { level: 6 } });
  archive.on("error", (error: Error) => output.destroy(error));
  archive.pipe(output);

  void (async () => {
    try {
      archive.append(json(listingPayloads), {
        name: scope === "car" ? "cars.json" : "parts.json",
      });
      archive.append(json(mediaPayloads), { name: "media.json" });
      archive.append(json(transferMetadata), { name: "transfer-metadata.json" });
      archive.append(json(manifest), { name: "manifest.json" });
      archive.append(json(report), { name: "preflight-report.json" });

      const client = getS3Client();
      const bucket = getBucket();
      for (const item of media) {
        if (!item.filePath) throw new Error(`Media ${item.id} has no file_path.`);
        const object = await client.send(
          new GetObjectCommand({ Bucket: bucket, Key: item.filePath }),
        );
        if (!object.Body) throw new Error(`MinIO returned no bytes for Media ${item.id}.`);

        const name = archivePaths.get(item.id.toString());
        if (!name) throw new Error(`Media ${item.id} has no archive path.`);
        if (object.Body instanceof Readable) {
          archive.append(object.Body, { name });
          await once(object.Body, "end");
        } else {
          archive.append(Buffer.from(await object.Body.transformToByteArray()), { name });
        }
      }
      await archive.finalize();
    } catch (error) {
      archive.abort();
      output.destroy(error instanceof Error ? error : new Error(String(error)));
    }
  })();

  return {
    ok: true,
    filename: `gap-${scope}-export-${new Date().toISOString().slice(0, 10)}.zip`,
    stream: output,
  };
}
