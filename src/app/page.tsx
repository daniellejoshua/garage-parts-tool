import type { Metadata } from "next";
import { VehicleCatalog } from "@/components/app/vehicle-catalog";
import { loadDatabaseCatalog } from "@/lib/reference/catalog-db";

export const metadata: Metadata = {
  title: "Vehicle Catalog",
};

export const dynamic = "force-dynamic";

export default async function VehicleCatalogPage() {
  const catalog = await loadDatabaseCatalog();
  return <VehicleCatalog catalog={catalog} />;
}
