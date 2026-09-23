import { HeadObjectCommand } from "@aws-sdk/client-s3";
import type { Car, Media, PartCompatibility, Parts, VehicleBrand, VehicleModel } from "@prisma/client";
import { PART_CATEGORIES, PART_CONDITIONS } from "@/lib/part-values";
import { loadDatabaseCatalog } from "@/lib/reference/catalog-db";
import { findBrandByName, findModelByName } from "@/lib/reference/slug";
import type { VehicleCatalog } from "@/lib/reference/types";
import { prisma } from "@/lib/server/db";
import { getBucket, getS3Client } from "@/lib/server/storage";

export type ExportScope = "car" | "part";

export interface TransferValidationError {
  type:
    | "missing_required_field"
    | "missing_seller"
    | "missing_compatibility"
    | "invalid_category"
    | "invalid_condition"
    | "invalid_value"
    | "catalog_mismatch"
    | "orphan_media"
    | "invalid_primary"
    | "invalid_order"
    | "missing_minio_object";
  entityType: "car" | "part" | "media" | "export";
  entityId: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface TransferValidationWarning {
  type: "suspicious_value" | "low_image_count" | "high_image_count" | "missing_image";
  entityType: "car" | "part" | "media";
  entityId: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface TransferValidationResult {
  success: boolean;
  scope: ExportScope | "all";
  timestamp: string;
  summary: {
    totalCars: number;
    totalParts: number;
    totalMedia: number;
    validCars: number;
    validParts: number;
    validMedia: number;
    orphanMedia: number;
    missingSellers: number;
    missingCompatibility: number;
    missingImages: number;
    invalidPrimary: number;
    invalidOrder: number;
    missingMinioObjects: number;
  };
  errors: TransferValidationError[];
  warnings: TransferValidationWarning[];
}

type PartWithCompatibility = Parts & {
  compatibilities: Array<
    PartCompatibility & {
      vehicleModel: VehicleModel & { brand: VehicleBrand };
    }
  >;
};

function requiredText(
  value: string,
  field: string,
  entityType: "car" | "part",
  entityId: string,
  errors: TransferValidationError[],
) {
  if (value.trim()) return true;
  errors.push({
    type: "missing_required_field",
    entityType,
    entityId,
    message: `${entityType === "car" ? "Car" : "Part"} ${entityId} has an empty ${field}.`,
    details: { field },
  });
  return false;
}

function validateCar(
  car: Car,
  catalog: VehicleCatalog,
  errors: TransferValidationError[],
  warnings: TransferValidationWarning[],
) {
  const id = car.id.toString();
  let valid = true;
  valid = requiredText(car.title, "title", "car", id, errors) && valid;
  valid = requiredText(car.brand, "brand", "car", id, errors) && valid;
  valid = requiredText(car.model, "model", "car", id, errors) && valid;
  valid = requiredText(car.status, "status", "car", id, errors) && valid;

  if (car.sellerId <= BigInt(0)) {
    errors.push({
      type: "missing_seller",
      entityType: "car",
      entityId: id,
      message: `Car ${id} has an invalid seller_id.`,
      details: { seller_id: car.sellerId.toString() },
    });
    valid = false;
  }

  const brand = findBrandByName(catalog, car.brand);
  if (!brand || !findModelByName(brand, car.model)) {
    errors.push({
      type: "catalog_mismatch",
      entityType: "car",
      entityId: id,
      message: `Car ${id} references a brand/model pair outside the vehicle catalog.`,
      details: { brand: car.brand, model: car.model },
    });
    valid = false;
  }

  if (car.price.isNegative() || car.originalPrice?.isNegative()) {
    errors.push({
      type: "invalid_value",
      entityType: "car",
      entityId: id,
      message: `Car ${id} has a negative price value.`,
    });
    valid = false;
  }
  if (car.mileageKm < 0) {
    errors.push({
      type: "invalid_value",
      entityType: "car",
      entityId: id,
      message: `Car ${id} has negative mileage_km.`,
    });
    valid = false;
  }
  if (car.year < 1900 || car.year > new Date().getFullYear() + 2) {
    warnings.push({
      type: "suspicious_value",
      entityType: "car",
      entityId: id,
      message: `Car ${id} has an unusual manufacturing year.`,
      details: { year: car.year },
    });
  }
  if (car.rating && (car.rating.isNegative() || car.rating.greaterThan(10))) {
    errors.push({
      type: "invalid_value",
      entityType: "car",
      entityId: id,
      message: `Car ${id} has a rating outside 0-10.`,
      details: { rating: car.rating.toString() },
    });
    valid = false;
  }
  return valid;
}

function validatePart(
  part: PartWithCompatibility,
  catalog: VehicleCatalog,
  errors: TransferValidationError[],
) {
  const id = part.id.toString();
  let valid = true;
  valid = requiredText(part.title, "title", "part", id, errors) && valid;
  valid = requiredText(part.brand, "brand", "part", id, errors) && valid;
  valid = requiredText(part.status, "status", "part", id, errors) && valid;

  if (!PART_CATEGORIES.includes(part.category as (typeof PART_CATEGORIES)[number])) {
    errors.push({
      type: "invalid_category",
      entityType: "part",
      entityId: id,
      message: `Part ${id} has an unsupported category.`,
      details: { category: part.category },
    });
    valid = false;
  }
  if (!PART_CONDITIONS.includes(part.condition as (typeof PART_CONDITIONS)[number])) {
    errors.push({
      type: "invalid_condition",
      entityType: "part",
      entityId: id,
      message: `Part ${id} has an unsupported condition.`,
      details: { condition: part.condition },
    });
    valid = false;
  }
  if (part.quantity < 1 || part.price.isNegative() || part.originalPrice?.isNegative()) {
    errors.push({
      type: "invalid_value",
      entityType: "part",
      entityId: id,
      message: `Part ${id} has an invalid quantity or price value.`,
    });
    valid = false;
  }
  if (part.compatibilities.length === 0) {
    errors.push({
      type: "missing_compatibility",
      entityType: "part",
      entityId: id,
      message: `Part ${id} has no structured vehicle compatibility.`,
    });
    return false;
  }

  for (const compatibility of part.compatibilities) {
    const brand = findBrandByName(catalog, compatibility.vehicleModel.brand.name);
    if (!brand || !findModelByName(brand, compatibility.vehicleModel.name)) {
      errors.push({
        type: "missing_compatibility",
        entityType: "part",
        entityId: id,
        message: `Part ${id} references compatibility outside the vehicle catalog.`,
        details: {
          brand: compatibility.vehicleModel.brand.name,
          model: compatibility.vehicleModel.name,
        },
      });
      valid = false;
    }
  }
  return valid;
}

async function validateMedia(
  media: Media,
  expectedType: ExportScope,
  parentIds: Set<string>,
  errors: TransferValidationError[],
) {
  const id = media.id.toString();
  const initialErrorCount = errors.length;
  if (media.mediableType !== expectedType) {
    errors.push({
      type: "orphan_media",
      entityType: "media",
      entityId: id,
      message: `Media ${id} has mediable_type ${media.mediableType}, expected ${expectedType}.`,
    });
  }
  if (!parentIds.has(media.mediableId.toString())) {
    errors.push({
      type: "orphan_media",
      entityType: "media",
      entityId: id,
      message: `Media ${id} references a missing ${media.mediableType} listing.`,
      details: { mediable_id: media.mediableId.toString() },
    });
  }
  if (!media.filePath) {
    errors.push({
      type: "missing_minio_object",
      entityType: "media",
      entityId: id,
      message: `Media ${id} has no file_path.`,
    });
  } else {
    try {
      const result = await getS3Client().send(
        new HeadObjectCommand({ Bucket: getBucket(), Key: media.filePath }),
      );
      if (
        media.sizeBytes !== null &&
        result.ContentLength !== undefined &&
        BigInt(result.ContentLength) !== media.sizeBytes
      ) {
        errors.push({
          type: "missing_minio_object",
          entityType: "media",
          entityId: id,
          message: `Media ${id} size does not match its MinIO object.`,
          details: {
            database_size_bytes: media.sizeBytes.toString(),
            object_size_bytes: String(result.ContentLength),
          },
        });
      }
    } catch {
      errors.push({
        type: "missing_minio_object",
        entityType: "media",
        entityId: id,
        message: `Media ${id} is missing from MinIO.`,
        details: { file_path: media.filePath },
      });
    }
  }
  return errors.length === initialErrorCount;
}

export async function validateTransferReadiness(
  scope: ExportScope | "all" = "all",
  selectedSourceIds?: readonly bigint[],
): Promise<TransferValidationResult> {
  const errors: TransferValidationError[] = [];
  const warnings: TransferValidationWarning[] = [];
  let cars: Car[] = [];
  let parts: PartWithCompatibility[] = [];
  let media: Media[] = [];
  let validCars = 0;
  let validParts = 0;
  let validMedia = 0;

  try {
    const catalog = await loadDatabaseCatalog();
    if (scope !== "part") {
      cars = await prisma.car.findMany({
        where: selectedSourceIds ? { id: { in: [...selectedSourceIds] } } : undefined,
        orderBy: { id: "asc" },
      });
      validCars = cars.filter((car) => validateCar(car, catalog, errors, warnings)).length;
    }
    if (scope !== "car") {
      parts = await prisma.parts.findMany({
        where: selectedSourceIds ? { id: { in: [...selectedSourceIds] } } : undefined,
        include: {
          compatibilities: {
            include: { vehicleModel: { include: { brand: true } } },
            orderBy: { vehicleModelId: "asc" },
          },
        },
        orderBy: { id: "asc" },
      });
      validParts = parts.filter((part) => validatePart(part, catalog, errors)).length;
    }

    const carIds = new Set(cars.map((car) => car.id.toString()));
    const partIds = new Set(parts.map((part) => part.id.toString()));
    const exportedIds = scope === "car" ? carIds : scope === "part" ? partIds : new Set([...carIds, ...partIds]);
    if (carIds.size !== cars.length || partIds.size !== parts.length) {
      errors.push({
        type: "invalid_value",
        entityType: "export",
        entityId: "source_listing_ids",
        message: "Exported listings do not have unique source_listing_id values.",
      });
    }
    if (selectedSourceIds) {
      for (const selectedId of selectedSourceIds) {
        if (!exportedIds.has(selectedId.toString())) {
          errors.push({
            type: "missing_required_field",
            entityType: "export",
            entityId: selectedId.toString(),
            message: `Requested ${scope} source_listing_id ${selectedId} does not exist.`,
          });
        }
      }
    }
    const mediaTypes = scope === "all" ? ["car", "part"] : [scope];
    media = await prisma.media.findMany({
      where: {
        mediableType: { in: mediaTypes },
        ...(selectedSourceIds ? { mediableId: { in: [...selectedSourceIds] } } : {}),
      },
      orderBy: [{ mediableType: "asc" }, { mediableId: "asc" }, { order: "asc" }],
    });

    for (const item of media) {
      const parentIds = item.mediableType === "car" ? carIds : partIds;
      const expectedType = scope === "all"
        ? item.mediableType === "car" ? "car" : "part"
        : scope;
      if (await validateMedia(item, expectedType, parentIds, errors)) validMedia += 1;
    }

    const listings = [
      ...cars.map((car) => ({ type: "car" as const, id: car.id.toString() })),
      ...parts.map((part) => ({ type: "part" as const, id: part.id.toString() })),
    ];
    for (const listing of listings) {
      const listingMedia = media.filter(
        (item) =>
          item.mediableType === listing.type && item.mediableId.toString() === listing.id,
      );
      if (listingMedia.length === 0) {
        warnings.push({
          type: "missing_image",
          entityType: listing.type,
          entityId: listing.id,
          message: `${listing.type === "car" ? "Car" : "Part"} ${listing.id} has no Media images.`,
        });
        continue;
      }
      if (listingMedia.length < 3) {
        warnings.push({
          type: "low_image_count",
          entityType: listing.type,
          entityId: listing.id,
          message: `${listing.type === "car" ? "Car" : "Part"} ${listing.id} has fewer than three images.`,
          details: { image_count: listingMedia.length },
        });
      }
      if (listingMedia.length > 20) {
        warnings.push({
          type: "high_image_count",
          entityType: listing.type,
          entityId: listing.id,
          message: `${listing.type === "car" ? "Car" : "Part"} ${listing.id} has more than 20 images.`,
          details: { image_count: listingMedia.length },
        });
      }
      if (listingMedia.filter((item) => item.isPrimary).length > 1) {
        errors.push({
          type: "invalid_primary",
          entityType: listing.type,
          entityId: listing.id,
          message: `Listing ${listing.id} has more than one primary image.`,
        });
      }
      const orders = listingMedia.map((item) => item.order).sort((a, b) => a - b);
      if (orders.some((order, index) => order !== index)) {
        errors.push({
          type: "invalid_order",
          entityType: listing.type,
          entityId: listing.id,
          message: `Listing ${listing.id} image order must be contiguous from zero.`,
          details: { orders },
        });
      }
    }
  } catch (error) {
    errors.push({
      type: "invalid_value",
      entityType: "export",
      entityId: "all",
      message: `Preflight could not complete: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  const countErrors = (type: TransferValidationError["type"]) =>
    errors.filter((error) => error.type === type).length;
  const countWarnings = (type: TransferValidationWarning["type"]) =>
    warnings.filter((warning) => warning.type === type).length;
  return {
    success: errors.length === 0,
    scope,
    timestamp: new Date().toISOString(),
    summary: {
      totalCars: cars.length,
      totalParts: parts.length,
      totalMedia: media.length,
      validCars,
      validParts,
      validMedia,
      orphanMedia: countErrors("orphan_media"),
      missingSellers: countErrors("missing_seller"),
      missingCompatibility: countErrors("missing_compatibility"),
      missingImages: countWarnings("missing_image"),
      invalidPrimary: countErrors("invalid_primary"),
      invalidOrder: countErrors("invalid_order"),
      missingMinioObjects: countErrors("missing_minio_object"),
    },
    errors,
    warnings,
  };
}
