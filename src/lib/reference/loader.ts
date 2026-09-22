import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  ProductionStatus,
  VehicleBrand,
  VehicleCatalog,
  VehicleModel,
} from "./types";

const DEFAULT_CATALOG_FILE = "vehicle-catalog.json";

const PRODUCTION_STATUSES: readonly ProductionStatus[] = [
  "current",
  "discontinued",
  "unknown",
];

function normalizeName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized || null;
}

function parseProductionStatus(value: unknown): ProductionStatus | null {
  return PRODUCTION_STATUSES.includes(value as ProductionStatus)
    ? (value as ProductionStatus)
    : null;
}

function parseCatalog(
  parsed: unknown,
): { regions: string[]; brands: VehicleBrand[] } | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const root = parsed as { regions?: unknown };
  if (!Array.isArray(root.regions)) return null;

  const regions: string[] = [];
  const brands: VehicleBrand[] = [];
  const regionKeys = new Set<string>();
  const brandKeys = new Set<string>();

  for (const regionEntry of root.regions) {
    if (typeof regionEntry !== "object" || regionEntry === null) continue;
    const entry = regionEntry as {
      region?: unknown;
      brands?: unknown;
    };
    const regionName = normalizeName(entry.region);
    if (!regionName) continue;
    const regionKey = regionName.toLowerCase();
    if (!regionKeys.has(regionKey)) {
      regionKeys.add(regionKey);
      regions.push(regionName);
    }

    if (!Array.isArray(entry.brands)) continue;
    for (const brandEntry of entry.brands) {
      if (typeof brandEntry !== "object" || brandEntry === null) continue;
      const brand = brandEntry as { name?: unknown; models?: unknown };
      const brandName = normalizeName(brand.name);
      if (!brandName) continue;
      const brandKey = brandName.toLowerCase();
      if (brandKeys.has(brandKey)) continue;

      const models: VehicleModel[] = [];
      if (Array.isArray(brand.models)) {
        let valid = true;
        for (const modelEntry of brand.models) {
          if (typeof modelEntry !== "object" || modelEntry === null) continue;
          const model = modelEntry as {
            name?: unknown;
            production_status?: unknown;
          };
          const modelName = normalizeName(model.name);
          if (!modelName) continue;
          const productionStatus = parseProductionStatus(model.production_status);
          if (!productionStatus) {
            valid = false;
            break;
          }
          models.push({ name: modelName, productionStatus });
        }
        if (!valid) return null;
      }

      brandKeys.add(brandKey);
      brands.push({ name: brandName, region: regionName, models });
    }
  }

  return { regions, brands };
}

export function parseCatalogJson(
  text: string,
): { regions: string[]; brands: VehicleBrand[] } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  return parseCatalog(parsed);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}

export async function loadVehicleCatalog(): Promise<VehicleCatalog> {
  const configured = process.env.VEHICLE_REFERENCE_PATH?.trim();
  const fileName = configured || DEFAULT_CATALOG_FILE;
  const displayPath = path.join("data", fileName);

  if (configured) {
    const escapesRoot = fileName.split(/[\\/]+/).includes("..");
    if (path.isAbsolute(fileName) || escapesRoot) {
      return {
        issue: "invalid",
        filePath: displayPath,
        message:
          "VEHICLE_REFERENCE_PATH must be a plain file name resolved inside the project data/ directory (e.g. vehicle-catalog.json). Absolute or parent-directory paths are rejected.",
        regions: [],
        brands: [],
      };
    }
  }

  const resolved = path.join(process.cwd(), "data", fileName);

  let text: string;
  try {
    text = await readFile(resolved, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return {
      issue: code === "ENOENT" ? "missing" : "invalid",
      filePath: displayPath,
      message:
        code === "ENOENT"
          ? "The vehicle catalog file has not been provided yet. Add it to data/, or set VEHICLE_REFERENCE_PATH to its file name."
          : `Could not read the catalog file: ${errorMessage(error)}`,
      regions: [],
      brands: [],
    };
  }

  const parsed = parseCatalogJson(text);
  if (parsed === null) {
    return {
      issue: "invalid",
      filePath: displayPath,
      message:
        "The vehicle catalog is not valid JSON with the expected structure: a `regions` array of { region, brands: [{ name, models: [{ name, production_status }] }] }, where production_status is one of current, discontinued, or unknown. See data/REFERENCE.md for the expected format.",
      regions: [],
      brands: [],
    };
  }

  return { issue: "ok", filePath: displayPath, message: null, ...parsed };
}