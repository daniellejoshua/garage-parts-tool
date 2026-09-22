import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadDatabaseCatalog } from "@/lib/reference/catalog-db";
import { findBrand, findModel } from "@/lib/reference/slug";
import { prisma } from "@/lib/server/db";
import { findPartsByVehicleModelId } from "@/lib/server/part-queries";
import { serializePart } from "@/lib/server/serialize-part";
import { Trail } from "@/components/app/trail";
import { PageHeading } from "@/components/app/page-heading";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PartListingsTable } from "@/components/parts/part-listings-table";
import { modelsPath } from "@/lib/modules";
import { partNewPath } from "@/lib/part-routes";
import { listingsPath } from "@/lib/modules";

export const metadata: Metadata = {
  title: "Parts listings",
};

export const dynamic = "force-dynamic";

export default async function PartsListingsPage({
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

  const partsWithCompat = await findPartsByVehicleModelId(dbModel.id);
  const parts = partsWithCompat.map((part) =>
    serializePart(part, part.compatibilities.map((c) => c.vehicleModelId.toString())),
  );

  return (
    <div className="flex flex-col gap-6">
      <Trail
        items={[
          { label: "Car Parts", href: "/parts/brands" },
          { label: brand.name, href: modelsPath("parts", brandSlug) },
          { label: model.name, href: listingsPath("parts", brandSlug, modelSlug) },
          { label: "Compatible Parts" },
        ]}
      />
      <PageHeading
        title={`${brand.name} ${model.name} compatible parts`}
        description="Manage individual part listings compatible with this vehicle."
        aside={
          <Button render={<Link href={partNewPath(brandSlug, modelSlug)} />}>
            Add part listing
          </Button>
        }
      />

      <PartListingsTable
        parts={parts}
        context={{ brandSlug, modelSlug }}
      />
    </div>
  );
}
