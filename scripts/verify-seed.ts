#!/usr/bin/env tsx

import "dotenv/config";

import { createPrisma } from "@/lib/seed/support";

async function main(): Promise<void> {
  const prisma = createPrisma();
  try {
    const [cars, parts, media, compat] = await Promise.all([
      prisma.car.findMany({ select: { title: true, status: true } }),
      prisma.parts.findMany({ select: { title: true, status: true } }),
      prisma.media.count(),
      prisma.partCompatibility.count(),
    ]);

    const status = (rows: { status: string }[]) =>
      rows.reduce<Record<string, number>>((acc, row) => {
        acc[row.status] = (acc[row.status] ?? 0) + 1;
        return acc;
      }, {});

    console.log(`cars=${cars.length}  parts=${parts.length}  media=${media}  compat=${compat}`);
    console.log("car statuses ", JSON.stringify(status(cars)));
    console.log("part statuses", JSON.stringify(status(parts)));

    const titleGarbage = [...cars, ...parts].filter((r) => /test/i.test(r.title));
    console.log(titleGarbage.length === 0 ? "titles: clean" : `titles: GARBAGE ${JSON.stringify(titleGarbage)}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});