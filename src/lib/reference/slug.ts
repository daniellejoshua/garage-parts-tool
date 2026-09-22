import type { VehicleBrand, VehicleCatalog, VehicleModel } from "./types";

export function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^[-]+|[-]+$/g, "");
}

export function findBrand(
  catalog: VehicleCatalog,
  slug: string,
): VehicleBrand | undefined {
  return catalog.brands.find((brand) => toSlug(brand.name) === slug);
}

export function findModel(
  brand: VehicleBrand,
  slug: string,
): VehicleModel | undefined {
  return brand.models.find((model) => toSlug(model.name) === slug);
}
export function findBrandByName(
  catalog: VehicleCatalog,
  name: string,
): VehicleBrand | undefined {
  return catalog.brands.find((brand) => brand.name === name);
}

export function findModelByName(
  brand: VehicleBrand,
  name: string,
): VehicleModel | undefined {
  return brand.models.find((model) => model.name === name);
}
