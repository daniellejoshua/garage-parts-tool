

import { prisma } from "@/lib/server/db";
import type {
  ProductionStatus,
  VehicleBrand,
  VehicleCatalog,
  VehicleModel,
} from "./types";

function databaseErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}

export async function loadDatabaseCatalog(): Promise<VehicleCatalog> {
  let brands;
  try {
    brands = await prisma.vehicleBrand.findMany({
      orderBy: { id: "asc" },
      include: { models: { orderBy: { id: "asc" } } },
    });
  } catch (error) {
    return {
      issue: "invalid",
      filePath: "gap_admin PostgreSQL database",
      message: `Could not read the vehicle catalog from the database: ${databaseErrorMessage(error)}. Start the database, apply pending migrations with \`pnpm prisma migrate deploy\`, and seed with \`pnpm db:seed\`.`,
      regions: [],
      brands: [],
    };
  }

  if (brands.length === 0) {
    return {
      issue: "missing",
      filePath: "gap_admin PostgreSQL database",
      message:
        "The vehicle catalog tables are empty. Seed the catalog from data/vehicle-catalog.json with `pnpm db:seed`.",
      regions: [],
      brands: [],
    };
  }

  const regions: string[] = [];
  const regionKeys = new Set<string>();
  const catalogBrands: VehicleBrand[] = brands.map((brand) => {
    const regionKey = brand.region.toLowerCase();
    if (!regionKeys.has(regionKey)) {
      regionKeys.add(regionKey);
      regions.push(brand.region);
    }
    const models: VehicleModel[] = brand.models.map((model) => ({
      name: model.name,
      productionStatus: model.productionStatus as ProductionStatus,
    }));
    return { name: brand.name, region: brand.region, models };
  });

  return {
    issue: "ok",
    filePath: "gap_admin PostgreSQL database",
    message: null,
    regions,
    brands: catalogBrands,
  };
}