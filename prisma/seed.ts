import "dotenv/config";

import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { loadVehicleCatalog } from "../src/lib/reference/loader";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type TxClient = Prisma.TransactionClient;

interface Summary {
  brandsFile: number;
  brandsCreated: number;
  brandsUpdated: number;
  modelsFile: number;
  modelsCreated: number;
  modelsUpdated: number;
  orphanBrands: string[];
  orphanModels: string[];
}

function printSummary(summary: Summary): void {
  const lines = [
    "Vehicle catalog seed complete:",
    `  brands   file=${summary.brandsFile} created=${summary.brandsCreated} updated=${summary.brandsUpdated}`,
    `  models   file=${summary.modelsFile} created=${summary.modelsCreated} updated=${summary.modelsUpdated}`,
  ];
  if (summary.orphanBrands.length > 0) {
    lines.push(
      `  brands in DB but missing from file (kept): ${summary.orphanBrands.join(", ")}`,
    );
  }
  if (summary.orphanModels.length > 0) {
    lines.push(
      `  models in DB but missing from file (kept): ${summary.orphanModels.join(", ")}`,
    );
  }
  console.log(lines.join("\n"));
}

async function main(): Promise<void> {
  const catalog = await loadVehicleCatalog();
  if (catalog.issue !== "ok") {
    throw new Error(
      `Vehicle catalog seed aborted: ${catalog.message ?? "catalog unavailable"}`,
    );
  }

  await prisma.$transaction(async (tx: TxClient) => {
    const fileBrandNames = new Set<string>();
    const fileModelKeys = new Set<string>();
    let modelsFile = 0;
    for (const brand of catalog.brands) {
      fileBrandNames.add(brand.name);
      for (const model of brand.models) {
        fileModelKeys.add(`${brand.name}::${model.name}`);
        modelsFile += 1;
      }
    }

    const existingBrands = await tx.vehicleBrand.findMany({
      select: { id: true, name: true },
    });
    const existingBrandNames = new Set(
      existingBrands.map((brand) => brand.name),
    );

    const existingModels = await tx.vehicleModel.findMany({
      select: { id: true, vehicleBrandId: true, name: true },
    });
    const existingModelKeys = new Set(
      existingModels.map(
        (model) =>
          `${existingBrands.find((b) => b.id === model.vehicleBrandId)?.name ?? ""}::${model.name}`,
      ),
    );

    let brandsCreated = 0;
    let brandsUpdated = 0;
    let modelsCreated = 0;
    let modelsUpdated = 0;

    for (const brand of catalog.brands) {
      const brandNew = !existingBrandNames.has(brand.name);
      const brandRow = await tx.vehicleBrand.upsert({
        where: { name: brand.name },
        update: { region: brand.region },
        create: { name: brand.name, region: brand.region },
      });
      if (brandNew) brandsCreated += 1;
      else brandsUpdated += 1;

      for (const model of brand.models) {
        const modelKey = `${brand.name}::${model.name}`;
        const modelNew = !existingModelKeys.has(modelKey);
        await tx.vehicleModel.upsert({
          where: {
            vehicleBrandId_name: {
              vehicleBrandId: brandRow.id,
              name: model.name,
            },
          },
          update: { productionStatus: model.productionStatus },
          create: {
            vehicleBrandId: brandRow.id,
            name: model.name,
            productionStatus: model.productionStatus,
          },
        });
        if (modelNew) modelsCreated += 1;
        else modelsUpdated += 1;
      }
    }

    const afterBrands = await tx.vehicleBrand.findMany({
      select: { id: true, name: true },
    });
    const afterBrandNames = new Set(afterBrands.map((b) => b.name));
    const orphanBrands = [...afterBrandNames].filter(
      (name) => !fileBrandNames.has(name),
    );

    const idToBrandName = new Map(
      afterBrands.map((brand) => [brand.id, brand.name]),
    );
    const afterModels = await tx.vehicleModel.findMany({
      select: { vehicleBrandId: true, name: true },
    });
    const orphanModels = afterModels
      .map(
        (model) =>
          `${idToBrandName.get(model.vehicleBrandId) ?? ""}::${model.name}`,
      )
      .filter((key) => !fileModelKeys.has(key));

    printSummary({
      brandsFile: catalog.brands.length,
      brandsCreated,
      brandsUpdated,
      modelsFile,
      modelsCreated,
      modelsUpdated,
      orphanBrands,
      orphanModels,
    });
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });