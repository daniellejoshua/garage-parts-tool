import type { Metadata } from "next";
import { PageHeading } from "@/components/app/page-heading";
import { Trail } from "@/components/app/trail";
import {
  PartListingsTable,
  type PartListingContext,
} from "@/components/parts/part-listings-table";
import { toSlug } from "@/lib/reference/slug";
import { findAllParts } from "@/lib/server/part-queries";
import { serializePart } from "@/lib/server/serialize-part";

export const metadata: Metadata = {
  title: "All part listings",
};

export const dynamic = "force-dynamic";

export default async function AllPartListingsPage() {
  const records = await findAllParts();
  const parts = records.map((part) =>
    serializePart(part, part.compatibilities.map((compatibility) => compatibility.vehicleModelId.toString())),
  );
  const contexts: Record<string, PartListingContext> = Object.fromEntries(
    records.flatMap((part) => {
      const compatibility = part.compatibilities[0];
      if (!compatibility) return [];

      const context: PartListingContext = {
        brandSlug: toSlug(compatibility.vehicleModel.brand.name),
        modelSlug: toSlug(compatibility.vehicleModel.name),
        brandName: compatibility.vehicleModel.brand.name,
        modelName: compatibility.vehicleModel.name,
      };
      return [[part.id.toString(), context]];
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <Trail items={[{ label: "Vehicle Catalog", href: "/" }, { label: "All part listings" }]} />
      <PageHeading
        title="All part listings"
        description="Review compatible part listings across the shared vehicle catalog."
        backHref="/"
      />
      <PartListingsTable parts={parts} contexts={contexts} exportScope="part" />
    </div>
  );
}
