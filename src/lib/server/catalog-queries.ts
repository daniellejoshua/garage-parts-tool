import { prisma } from "@/lib/server/db";
import { partIdToBigInt } from "@/lib/server/part-queries";

export interface VehicleBrandSummary {
  id: string;
  name: string;
  region: string;
  modelCount: number;
}

export interface VehicleModelRef {
  id: string;
  name: string;
  brandName: string;
  region: string;
}

export interface SelectedModelRef {
  id: string;
  label: string;
  brandName: string;
}

interface ModelResult {
  id: bigint;
  name: string;
  brand: { name: string; region: string };
}

function toModelRef(model: ModelResult): VehicleModelRef {
  return {
    id: model.id.toString(),
    name: model.name,
    brandName: model.brand.name,
    region: model.brand.region,
  };
}

export async function getBrandsForSelection(): Promise<VehicleBrandSummary[]> {
  const brands = await prisma.vehicleBrand.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      region: true,
      _count: { select: { models: true } },
    },
  });
  return brands.map((brand) => ({
    id: brand.id.toString(),
    name: brand.name,
    region: brand.region,
    modelCount: brand._count.models,
  }));
}

export async function getModelsByBrandId(brandId: string): Promise<VehicleModelRef[]> {
  const id = partIdToBigInt(brandId);
  if (id === null) return [];
  const models = await prisma.vehicleModel.findMany({
    where: { vehicleBrandId: id },
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      brand: { select: { name: true, region: true } },
    },
  });
  return models.map(toModelRef);
}

export async function searchVehicleModels(query: string): Promise<VehicleModelRef[]> {
  const models = await prisma.vehicleModel.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { brand: { name: { contains: query, mode: "insensitive" } } },
      ],
    },
    orderBy: [{ vehicleBrandId: "asc" }, { id: "asc" }],
    take: 50,
    select: {
      id: true,
      name: true,
      brand: { select: { name: true, region: true } },
    },
  });
  return models.map(toModelRef);
}

export async function getVehicleModelNames(
  modelIds: string[],
): Promise<SelectedModelRef[]> {
  const bigints = modelIds
    .map((raw) => ({ raw, id: partIdToBigInt(raw) }))
    .filter((entry): entry is { raw: string; id: bigint } => entry.id !== null)
    .map((entry) => entry.id);
  if (bigints.length === 0) return [];

  const models = await prisma.vehicleModel.findMany({
    where: { id: { in: bigints } },
    orderBy: [{ vehicleBrandId: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      brand: { select: { name: true, region: true } },
    },
  });
  return models.map((model) => ({
    id: model.id.toString(),
    label: `${model.brand.name} ${model.name}`,
    brandName: model.brand.name,
  }));
}