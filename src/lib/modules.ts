export type ModuleSlug = "cars" | "parts";

export interface ModuleDefinition {
  slug: ModuleSlug;
  label: string;
  listingLabel: string;
  description: string;
  brandsPath: string;
}

export const MODULES: Record<ModuleSlug, ModuleDefinition> = {
  cars: {
    slug: "cars",
    label: "Cars",
    listingLabel: "car",
    description:
      "Select an existing vehicle brand and model to manage individual car listings.",
    brandsPath: "/cars/brands",
  },
  parts: {
    slug: "parts",
    label: "Car Parts",
    listingLabel: "part",
    description:
      "Select an existing vehicle brand and model to manage individual part listings.",
    brandsPath: "/parts/brands",
  },
};

export function modelsPath(module: ModuleSlug, brandSlug: string): string {
  return `${MODULES[module].brandsPath}/${brandSlug}/models`;
}

export function catalogModelsPath(brandSlug: string): string {
  return `/brands/${brandSlug}/models`;
}

export function listingsPath(
  module: ModuleSlug,
  brandSlug: string,
  modelSlug: string,
): string {
  return `${modelsPath(module, brandSlug)}/${modelSlug}/listings`;
}
