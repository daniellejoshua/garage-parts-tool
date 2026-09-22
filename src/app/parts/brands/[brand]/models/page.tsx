import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadDatabaseCatalog } from "@/lib/reference/catalog-db";
import { findBrand } from "@/lib/reference/slug";
import { ModelSelector } from "@/components/app/model-selector";

export const metadata: Metadata = {
  title: "Car Parts models",
};

export const dynamic = "force-dynamic";

export default async function PartsModelsPage({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const { brand: brandSlug } = await params;
  const catalog = await loadDatabaseCatalog();
  const brand = findBrand(catalog, brandSlug);
  if (!brand) notFound();

  return <ModelSelector module="parts" brand={brand} brandSlug={brandSlug} />;
}