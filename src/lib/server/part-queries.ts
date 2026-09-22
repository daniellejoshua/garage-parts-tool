

import type { Parts, PartCompatibility } from "@prisma/client";
import { prisma } from "@/lib/server/db";

export function partIdToBigInt(rawId: string): bigint | null {
  try {
    const id = BigInt(rawId);
    return id >= BigInt(0) ? id : null;
  } catch {
    return null;
  }
}

export async function findPartsByVehicleModelId(modelId: bigint): Promise<
  Array<
    Parts & {
      compatibilities: PartCompatibility[];
    }
  >
> {
  return prisma.parts.findMany({
    where: { compatibilities: { some: { vehicleModelId: modelId } } },
    include: { compatibilities: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function findPartById(rawId: string): Promise<
  | (Parts & {
      compatibilities: PartCompatibility[];
    })
  | null
> {
  const id = partIdToBigInt(rawId);
  if (id === null) return null;
  return prisma.parts.findFirst({
    where: { id },
    include: { compatibilities: true },
  });
}

export async function getAllVehicleModelsForSelection(): Promise<
  Array<{ id: bigint; vehicleBrandId: bigint; name: string }>
> {
  return prisma.vehicleModel.findMany({
    orderBy: [{ vehicleBrandId: "asc" }, { id: "asc" }],
    select: { id: true, vehicleBrandId: true, name: true },
  });
}

export interface VehicleModelWithBrand {
  id: string;
  name: string;
  brandName: string;
  brandRegion: string;
}

export async function getAllVehicleModelsWithBrands(): Promise<VehicleModelWithBrand[]> {
  const models = await prisma.vehicleModel.findMany({
    orderBy: [{ vehicleBrandId: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      brand: { select: { name: true, region: true } },
    },
  });
  return models.map((model) => ({
    id: model.id.toString(),
    name: model.name,
    brandName: model.brand.name,
    brandRegion: model.brand.region,
  }));
}