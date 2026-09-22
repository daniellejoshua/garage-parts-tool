import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadDatabaseCatalog } from "@/lib/reference/catalog-db";
import { findBrand, findModel } from "@/lib/reference/slug";
import { prisma } from "@/lib/server/db";
import { findPartById } from "@/lib/server/part-queries";
import { getAllVehicleModelsWithBrands } from "@/lib/server/part-queries";
import { serializePart } from "@/lib/server/serialize-part";
import { partToFormDefaults } from "@/lib/server/serialize-part";
import { getMediaByParent } from "@/lib/server/media-queries";
import { Trail } from "@/components/app/trail";
import { PageHeading } from "@/components/app/page-heading";
import { PartMultiStepForm } from "@/components/parts/part-multi-step-form";
import { modelsPath } from "@/lib/modules";
import { partListingsPath, partViewPath } from "@/lib/part-routes";
import type { MultiSelectOption } from "@/components/ui/multi-select";

export const metadata: Metadata = {
  title: "Edit part listing",
};

export const dynamic = "force-dynamic";

export default async function EditPartListingPage({
  params,
}: {
  params: Promise<{ brand: string; model: string; id: string }>;
}) {
  const { brand: brandSlug, model: modelSlug, id } = await params;
  const catalog = await loadDatabaseCatalog();
  const brand = findBrand(catalog, brandSlug);
  if (!brand) notFound();
  const model = findModel(brand, modelSlug);
  if (!model) notFound();

  const part = await findPartById(id);
  if (!part) notFound();

  const row = serializePart(part, part.compatibilities.map((c) => c.vehicleModelId.toString()));
  const defaults = partToFormDefaults(row);

  const navigatedModel = await prisma.vehicleModel.findFirst({
    where: { name: model.name, brand: { name: brand.name } },
    select: { id: true },
  });
  if (!navigatedModel) notFound();

  const dbModels = await getAllVehicleModelsWithBrands();
  const allModels: MultiSelectOption[] = dbModels.map((m) => ({
    value: m.id,
    label: `${m.brandName} ${m.name}`,
    group: m.brandRegion,
  }));

  const context = { brandSlug, modelSlug };

  const partId = BigInt(id);
  const media = await getMediaByParent("part", partId);

  return (
    <div className="flex flex-col gap-6">
      <Trail
        items={[
          { label: "Car Parts", href: "/parts/brands" },
          { label: brand.name, href: modelsPath("parts", brandSlug) },
          { label: model.name, href: partListingsPath(brandSlug, modelSlug) },
          { label: row.title },
          { label: "Edit" },
        ]}
      />
      <PageHeading
        title="Edit part listing"
        description={`Update ${row.title} for ${brand.name} ${model.name}.`}
      />
      <PartMultiStepForm
        mode="edit"
        context={context}
        partId={id}
        defaults={defaults}
        cancelHref={partViewPath(brandSlug, modelSlug, id)}
        allModels={allModels}
        navigatedModelId={navigatedModel.id.toString()}
        vehicleLabel={`${brand.name} ${model.name}`}
        initialMedia={media}
      />
    </div>
  );
}
