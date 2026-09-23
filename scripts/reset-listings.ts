#!/usr/bin/env tsx

import "dotenv/config";

import { createPrisma } from "@/lib/seed/support";

const digitsOnly = /^\d+$/;

async function main(): Promise<void> {
  const prisma = createPrisma();
  try {
    const [cars, parts, media] = await Promise.all([
      prisma.car.findMany({ select: { title: true, city: true, condition: true, status: true } }),
      prisma.parts.findMany({ select: { title: true, city: true, condition: true, status: true } }),
      prisma.media.findMany({ select: { id: true } }),
    ]);

    const carStatus = new Map<string, number>();
    const partStatus = new Map<string, number>();
    for (const car of cars) carStatus.set(car.status, (carStatus.get(car.status) ?? 0) + 1);
    for (const part of parts) partStatus.set(part.status, (partStatus.get(part.status) ?? 0) + 1);

    const garbage = [
      ...cars
        .filter(
          (row) =>
            /test/i.test(row.title) ||
            /test/i.test(row.city ?? "") ||
            (row.city != null && digitsOnly.test(row.city.trim())) ||
            (row.condition != null && (row.condition.trim() === "" || /test/i.test(row.condition))),
        )
        .map((row) => `car::${row.title}`),
      ...parts
        .filter(
          (row) =>
            /test/i.test(row.title) ||
            /test/i.test(row.city ?? "") ||
            (row.city != null && digitsOnly.test(row.city.trim())) ||
            (row.condition != null && (row.condition.trim() === "" || /test/i.test(row.condition))),
        )
        .map((row) => `part::${row.title}`),
    ];

    console.log("Before reset:");
    console.log(`  cars=${cars.length} parts=${parts.length} media=${media.length}`);
    console.log(`  car statuses  ${JSON.stringify(Object.fromEntries(carStatus))}`);
    console.log(`  part statuses ${JSON.stringify(Object.fromEntries(partStatus))}`);
    if (garbage.length > 0) {
      console.log("  flagged garbage rows:");
      for (const row of garbage) console.log(`    - ${row}`);
    } else {
      console.log("  flagged garbage rows: none detected");
    }

    const compat = await prisma.partCompatibility.deleteMany({});
    const mediaDeleted = await prisma.media.deleteMany({});
    const partsDeleted = await prisma.parts.deleteMany({});
    const carsDeleted = await prisma.car.deleteMany({});

    console.log("Deleted:");
    console.log(`  media=${mediaDeleted.count} part_compatibilities=${compat.count} parts=${partsDeleted.count} cars=${carsDeleted.count}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});