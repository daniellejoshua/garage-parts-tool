import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadDatabaseCatalog } from "@/lib/reference/catalog-db";
import { findBrand, findModel } from "@/lib/reference/slug";
import { prisma } from "@/lib/server/db";
import { getBrandsForSelection } from "@/lib/server/catalog-queries";
import { emptyPartFormValues } from "@/lib/validations/part";
import { PartMultiStepForm } from "@/components/parts/part-multi-step-form";
import { listingsPath } from "@/lib/modules";

export const metadata: Metadata = {
  title: "Add part listing",
};

export const dynamic = "force-dynamic";

export default async function NewPartListingPage({
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

  const dbModel = await prisma.vehicleModel.findFirst({
    where: { name: model.name, brand: { name: brand.name } },
    select: { id: true },
  });
  if (!dbModel) notFound();

  const allBrands = await getBrandsForSelection();

  const defaults = emptyPartFormValues();
  const context = { brandSlug, modelSlug };
  const navigatedModelId = dbModel.id.toString();
  const initialSelected = [
    {
      id: navigatedModelId,
      label: `${brand.name} ${model.name}`,
      brandName: brand.name,
    },
  ];

  return (
    <div>
      <PartMultiStepForm
        mode="create"
        context={context}
        defaults={defaults}
        backHref={listingsPath("parts", brandSlug, modelSlug)}
        allBrands={allBrands}
        initialSelected={initialSelected}
        navigatedModelId={navigatedModelId}
        vehicleLabel={`${brand.name} ${model.name}`}
      />
    </div>
  );
}
