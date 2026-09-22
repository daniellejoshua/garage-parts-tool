import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadDatabaseCatalog } from "@/lib/reference/catalog-db";
import { findBrand, findModel } from "@/lib/reference/slug";
import { prisma } from "@/lib/server/db";
import { getAllVehicleModelsWithBrands } from "@/lib/server/part-queries";
import { emptyPartFormValues } from "@/lib/validations/part";
import { Trail } from "@/components/app/trail";
import { PageHeading } from "@/components/app/page-heading";
import { PartMultiStepForm } from "@/components/parts/part-multi-step-form";
import { modelsPath } from "@/lib/modules";
import type { MultiSelectOption } from "@/components/ui/multi-select";

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

  const dbModels = await getAllVehicleModelsWithBrands();
  const allModels: MultiSelectOption[] = dbModels.map((m) => ({
    value: m.id,
    label: `${m.brandName} ${m.name}`,
    group: m.brandRegion,
  }));

  const defaults = emptyPartFormValues();
  const context = { brandSlug, modelSlug };

  return (
    <div className="flex flex-col gap-6">
      <Trail
        items={[
          { label: "Car Parts", href: "/parts/brands" },
          { label: brand.name, href: modelsPath("parts", brandSlug) },
          { label: model.name, href: listingsPath("parts", brandSlug, modelSlug) },
          { label: "Add listing" },
        ]}
      />
      <PageHeading
        title={`Add part listing for ${brand.name} ${model.name}`}
        description={`Create a new part listing compatible with ${brand.name} ${model.name}.`}
      />
      <PartMultiStepForm
        mode="create"
        context={context}
        defaults={defaults}
        cancelHref={listingsPath("parts", brandSlug, modelSlug)}
        allModels={allModels}
        navigatedModelId={dbModel.id.toString()}
        vehicleLabel={`${brand.name} ${model.name}`}
      />
    </div>
  );
}

import { listingsPath } from "@/lib/modules";
