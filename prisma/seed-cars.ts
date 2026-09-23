import "dotenv/config";

import { z } from "zod";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { carSeedSchema, type CarSeed } from "@/lib/seed/schemas";
import {
  buildCatalogIndex,
  createPrisma,
  loadFixtures,
  unresolvedCatalogRefs,
} from "@/lib/seed/support";
import { getBucket, getS3Client } from "@/lib/server/storage";

const FIXTURE_PATH = "data/seed/cars.json";

function carKey(brand: string, model: string, title: string): string {
  return `${brand}::${model}::${title}`;
}

function identity(fixture: CarSeed): string {
  return carKey(fixture.brand, fixture.model, fixture.title);
}

async function main(): Promise<void> {
  const prisma = createPrisma();
  try {
    const raw = loadFixtures<unknown[]>(FIXTURE_PATH);
    const parsed = z.array(carSeedSchema).safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `Invalid cars.json: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`,
      );
    }
    const fixtures = parsed.data;

    const catalog = await buildCatalogIndex(prisma);
    const missing = unresolvedCatalogRefs(
      catalog,
      fixtures.map(({ brand, model }) => ({ brand, model })),
    );
    if (missing.length > 0) {
      throw new Error(
        `cars.json references unknown catalog vehicles: ${missing.join(", ")}`,
      );
    }

    const seededIdentities = new Set(fixtures.map(identity));
    const existing = await prisma.car.findMany();
    const toRecreate = existing.filter((car) =>
      seededIdentities.has(carKey(car.brand, car.model, car.title)),
    );
    const toRecreateIds = toRecreate.map((car) => car.id);
    const mediaRows =
      toRecreateIds.length > 0
        ? await prisma.media.findMany({
            where: { mediableType: "car", mediableId: { in: toRecreateIds } },
          })
        : [];

    let created = 0;
    await prisma.$transaction(async (tx) => {
      if (toRecreateIds.length > 0) {
        await tx.media.deleteMany({
          where: { mediableType: "car", mediableId: { in: toRecreateIds } },
        });
        await tx.car.deleteMany({ where: { id: { in: toRecreateIds } } });
      }
      for (const fixture of fixtures) {
        await tx.car.create({
          data: {
            sellerId: BigInt(fixture.seller_id),
            title: fixture.title,
            brand: fixture.brand,
            model: fixture.model,
            year: fixture.year,
            price: fixture.price,
            originalPrice: fixture.original_price,
            mileageKm: fixture.mileage_km,
            bodyStyle: fixture.body_style,
            fuelType: fixture.fuel_type,
            transmission: fixture.transmission,
            condition: fixture.condition,
            tag: fixture.tag,
            color: fixture.color,
            vin: fixture.vin,
            description: fixture.description,
            city: fixture.city,
            location: fixture.location,
            status: fixture.status,
            rating: fixture.rating,
            inspectionScore: fixture.inspection_score,
            publishedAt: fixture.published_at
              ? new Date(fixture.published_at)
              : null,
            soldAt: fixture.sold_at ? new Date(fixture.sold_at) : null,
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
        "Car listings seed complete:",
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