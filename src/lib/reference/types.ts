export type CatalogIssue = "ok" | "missing" | "invalid";

export type ProductionStatus = "current" | "discontinued" | "unknown";

export interface VehicleModel {
  name: string;
  productionStatus: ProductionStatus;
}

export interface VehicleBrand {
  name: string;
  region: string;
  models: VehicleModel[];
}

export interface VehicleCatalog {
  issue: CatalogIssue;
  filePath: string;
  message: string | null;
  regions: string[];
  brands: VehicleBrand[];
}