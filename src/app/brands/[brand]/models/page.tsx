import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ModelSelector } from "@/components/app/model-selector";
import { RecentBrandTracker } from "@/components/app/recent-brand-tracker";
import { loadDatabaseCatalog } from "@/lib/reference/catalog-db";
import { findBrand } from "@/lib/reference/slug";

export const metadata: Metadata = {
  title: "Vehicle models",
};

export const dynamic = "force-dynamic";

export default async function CatalogModelsPage({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const { brand: brandSlug } = await params;
  const catalog = await loadDatabaseCatalog();
  const brand = findBrand(catalog, brandSlug);
  if (!brand) notFound();

  return (
    <>
      <RecentBrandTracker brandSlug={brandSlug} />
      <ModelSelector module="cars" brand={brand} brandSlug={brandSlug} catalogEntry />
    </>
  );
}
