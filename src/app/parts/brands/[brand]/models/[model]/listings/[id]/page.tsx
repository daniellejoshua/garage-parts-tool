import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadDatabaseCatalog } from "@/lib/reference/catalog-db";
import { findBrand, findModel } from "@/lib/reference/slug";
import { findPartById } from "@/lib/server/part-queries";
import { serializePart } from "@/lib/server/serialize-part";
import { getMediaByParent } from "@/lib/server/media-queries";
import { Trail } from "@/components/app/trail";
import { PartDetail } from "@/components/parts/part-detail";
import { modelsPath } from "@/lib/modules";
import { listingsPath } from "@/lib/modules";
import { prisma } from "@/lib/server/db";

export const metadata: Metadata = {
  title: "Part listing",
};

export const dynamic = "force-dynamic";

export default async function PartListingDetailPage({
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

  const databaseModel = await prisma.vehicleModel.findFirst({
    where: { name: model.name, brand: { name: brand.name } },
    select: { id: true },
  });
  if (
    !databaseModel ||
    !part.compatibilities.some(
      (compatibility) => compatibility.vehicleModelId === databaseModel.id,
    )
  ) {
    notFound();
  }

  const row = serializePart(part, part.compatibilities.map((c) => c.vehicleModelId.toString()));
  const context = { brandSlug, modelSlug };

  const partId = BigInt(id);
  const media = await getMediaByParent("part", partId);

  return (
    <div className="flex flex-col gap-3">
      <Trail
        items={[
          { label: "Car Parts", href: "/parts/brands" },
          { label: brand.name, href: modelsPath("parts", brandSlug) },
          { label: model.name, href: listingsPath("parts", brandSlug, modelSlug) },
          { label: row.title },
        ]}
      />
      <PartDetail part={row} context={context} media={media} vehicleLabel={`${brand.name} ${model.name}`} />
    </div>
  );
}
