import "dotenv/config";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export function createPrisma(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export function loadFixtures<T>(relativePath: string): T {
  const fixture = readFileSync(resolve(process.cwd(), relativePath), "utf-8");
  return JSON.parse(fixture) as T;
}

export interface CatalogIndex {
  modelIds: Map<string, bigint>;
}

export async function buildCatalogIndex(prisma: PrismaClient): Promise<CatalogIndex> {
  const brands = await prisma.vehicleBrand.findMany({ include: { models: true } });
  const modelIds = new Map<string, bigint>();
  for (const brand of brands) {
    for (const model of brand.models) {
      modelIds.set(`${brand.name}::${model.name}`, model.id);
    }
  }
  return { modelIds };
}

export function unresolvedCatalogRefs(
  catalog: CatalogIndex,
  pairs: readonly { brand: string; model: string }[],
): string[] {
  const missing: string[] = [];
  for (const pair of pairs) {
    if (!catalog.modelIds.has(`${pair.brand}::${pair.model}`)) {
      missing.push(`${pair.brand} ${pair.model}`);
    }
  }
  return missing;
}