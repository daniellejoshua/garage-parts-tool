import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadDatabaseCatalog } from "@/lib/reference/catalog-db";
import { findBrand, findModel } from "@/lib/reference/slug";
import { prisma } from "@/lib/server/db";
import { findPartById } from "@/lib/server/part-queries";
import { getBrandsForSelection, getVehicleModelNames } from "@/lib/server/catalog-queries";
import { serializePart } from "@/lib/server/serialize-part";
import { partToFormDefaults } from "@/lib/server/serialize-part";
import { getMediaByParent } from "@/lib/server/media-queries";
import { PartMultiStepForm } from "@/components/parts/part-multi-step-form";
import { partListingsPath, partViewPath } from "@/lib/part-routes";

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

  const navigatedModelId = navigatedModel.id.toString();
  const allBrands = await getBrandsForSelection();
  const initialSelected = await getVehicleModelNames(
    row.compatibleModelIds,
  );

  const context = { brandSlug, modelSlug };

  const partId = BigInt(id);
  const media = await getMediaByParent("part", partId);

  return (
    <div>
      <PartMultiStepForm
        mode="edit"
        context={context}
        partId={id}
        defaults={defaults}
        backHref={partListingsPath(brandSlug, modelSlug)}
        viewHref={partViewPath(brandSlug, modelSlug, id)}
        allBrands={allBrands}
        initialSelected={initialSelected}
        navigatedModelId={navigatedModelId}
        vehicleLabel={`${brand.name} ${model.name}`}
        initialMedia={media}
      />
    </div>
  );
}
