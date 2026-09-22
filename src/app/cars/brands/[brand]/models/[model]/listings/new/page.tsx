import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadDatabaseCatalog } from "@/lib/reference/catalog-db";
import { findBrand, findModel } from "@/lib/reference/slug";
import { carListingsPath } from "@/lib/car-routes";
import { emptyCarFormValues } from "@/lib/validations/car";
import { CarMultiStepForm } from "@/components/cars/car-multi-step-form";

export const metadata: Metadata = {
  title: "Add car listing",
};

export const dynamic = "force-dynamic";

export default async function NewCarListingPage({
  params,
}: {
  params: Promise<{ brand: string; model: string }>;
}) {
  const { brand: brandSlug, model: modelSlug } = await params;
  const catalog = await loadDatabaseCatalog();
  const brand = findBrand(catalog, brandSlug);
  if (!brand) notFound();
  const model = findModel(brand, modelSlug);
  if (!model) notFound();

  const context = { brandSlug, modelSlug };

  return (
    <div>
      <CarMultiStepForm
        mode="create"
        context={context}
        defaults={emptyCarFormValues(brand.name, model.name)}
        backHref={carListingsPath(brandSlug, modelSlug)}
      />
    </div>
  );
}
