import "dotenv/config";

import { z } from "zod";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { partSeedSchema, type PartSeed } from "@/lib/seed/schemas";
import {
  buildCatalogIndex,
  createPrisma,
  loadFixtures,
  unresolvedCatalogRefs,
} from "@/lib/seed/support";
import { getBucket, getS3Client } from "@/lib/server/storage";

const FIXTURE_PATH = "data/seed/parts.json";

function partKey(brand: string, title: string, partNumber: string | null): string {
  return `${brand}::${title}::${partNumber ?? ""}`;
}

function identity(fixture: PartSeed): string {
  return partKey(fixture.brand, fixture.title, fixture.part_number);
}

async function main(): Promise<void> {
  const prisma = createPrisma();
  try {
    const raw = loadFixtures<unknown[]>(FIXTURE_PATH);
    const parsed = z.array(partSeedSchema).safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `Invalid parts.json: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`,
      );
    }
    const fixtures = parsed.data;

    const catalog = await buildCatalogIndex(prisma);
    const missing = unresolvedCatalogRefs(
      catalog,
      fixtures.flatMap((fixture) => fixture.compatibility),
    );
    if (missing.length > 0) {
      throw new Error(
        `parts.json compatibility references unknown catalog vehicles: ${missing.join(", ")}`,
      );
    }

    const seededIdentities = new Set(fixtures.map(identity));
    const existing = await prisma.parts.findMany();
    const toRecreate = existing.filter((part) =>
      seededIdentities.has(partKey(part.brand, part.title, part.partNumber)),
    );
    const toRecreateIds = toRecreate.map((part) => part.id);
    const mediaRows =
      toRecreateIds.length > 0
        ? await prisma.media.findMany({
            where: { mediableType: "part", mediableId: { in: toRecreateIds } },
          })
        : [];

    let created = 0;
    await prisma.$transaction(async (tx) => {
      if (toRecreateIds.length > 0) {
        await tx.media.deleteMany({
          where: { mediableType: "part", mediableId: { in: toRecreateIds } },
        });
        await tx.parts.deleteMany({ where: { id: { in: toRecreateIds } } });
      }
      for (const fixture of fixtures) {
        await tx.parts.create({
          data: {
            title: fixture.title,
            category: fixture.category,
            brand: fixture.brand,
            partNumber: fixture.part_number,
            oemNumber: fixture.oem_number,
            condition: fixture.condition,
            quantity: fixture.quantity,
            price: fixture.price,
            originalPrice: fixture.original_price,
            tag: fixture.tag,
            freeShipping: fixture.free_shipping,
            city: fixture.city,
            location: fixture.location,
            status: fixture.status,
            compatibilities: {
              create: fixture.compatibility.map(({ brand, model }) => ({
                vehicleModelId: catalog.modelIds.get(`${brand}::${model}`)!,
              })),
            },
          },
        });
        created += 1;
      }
    });

    let minioFailures = 0;
    if (mediaRows.length > 0) {
      const client = getS3Client();
      const bucket = getBucket();
      for (const media of mediaRows) {
        if (!media.filePath) continue;
        try {
          await client.send(
            new DeleteObjectCommand({ Bucket: bucket, Key: media.filePath }),
          );
        } catch {
          minioFailures += 1;
        }
      }
    }

    console.log(
      [
        "Part listings seed complete:",
        `  fixtures=${fixtures.length}`,
        `  created=${created}`,
        `  replaced=${toRecreate.length}`,
        `  media records removed=${mediaRows.length}`,
        ...(minioFailures > 0 ? [`  MinIO object delete failures=${minioFailures}`] : []),
      ].join("\n"),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});