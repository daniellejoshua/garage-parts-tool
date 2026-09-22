import type { Metadata } from "next";
import { loadDatabaseCatalog } from "@/lib/reference/catalog-db";
import { BrandSelector } from "@/components/app/brand-selector";

export const metadata: Metadata = {
  title: "Cars brands",
};

export const dynamic = "force-dynamic";

export default async function CarBrandsPage() {
  const catalog = await loadDatabaseCatalog();
  return <BrandSelector module="cars" catalog={catalog} />;
}