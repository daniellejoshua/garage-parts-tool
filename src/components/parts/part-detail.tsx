import type { ReactNode } from "react";
import Link from "next/link";
import { PackageIcon, PencilIcon, TagIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeletePartButton } from "@/components/parts/delete-part-button";
import { PartListingCard } from "@/components/parts/part-listing-card";
import type { PartRow } from "@/lib/server/serialize-part";
import { partToFormDefaults } from "@/lib/server/serialize-part";
import type { PartNavContext } from "@/lib/server/part-actions";
import type { MediaRow } from "@/lib/server/media-queries";
import { partEditPath } from "@/lib/part-routes";
import {
  displayValue,
  formatDateTime,
} from "@/lib/car-format";
import { listingStatusClassName } from "@/lib/listing-status";

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

export function PartDetail({
  part,
  context,
  media,
  vehicleLabel,
}: {
  part: PartRow;
  context: PartNavContext;
  media: MediaRow[];
  vehicleLabel: string;
}) {
  return (
    <div className="space-y-3">
      <section className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-[-0.025em] sm:text-xl">{part.title}</h1>
          <p className="text-xs text-muted-foreground">
            {part.brand} <span className="mx-1.5">•</span> {part.category.replace(/_/g, " ")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={listingStatusClassName(part.status)}>{part.status}</Badge>
          <span className="text-xs text-muted-foreground">#{part.id}</span>
          <Button variant="ghost" size="sm" render={<Link href={partEditPath(context.brandSlug, context.modelSlug, part.id)} />}>
            <PencilIcon /> Edit
          </Button>
          <DeletePartButton context={context} partId={part.id} partTitle={part.title} variant="ghost" size="sm" />
        </div>
      </section>
      <div className="grid items-stretch gap-3 lg:h-[calc(100dvh-13rem)] lg:min-h-0 lg:grid-cols-[minmax(0,32fr)_minmax(0,38fr)_minmax(0,30fr)]">
        <div className="min-h-0">
          <PartListingCard values={partToFormDefaults(part)} vehicleLabel={vehicleLabel} media={media} compact detailPanel />
        </div>
        <Card className="h-full min-h-0 gap-0 rounded-xl py-0" size="sm">
          <CardHeader className="h-[72px] shrink-0 border-b border-border bg-muted/20 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <PackageIcon className="size-4" /> Part Details
            </CardTitle>
            <CardDescription className="text-xs">Inventory, fitment, and marketplace attributes.</CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <dl className="grid grid-cols-2 gap-x-5 gap-y-2.5">
              <Detail label="Category" value={part.category.replace(/_/g, " ")} />
              <Detail label="Part brand" value={part.brand} />
              <Detail label="Condition" value={part.condition} />
              <Detail label="Quantity" value={part.quantity} />
              <Detail label="Shipping" value={part.freeShipping ? "Free" : "Standard"} />
              <Detail label="Location" value={[part.city, part.location].filter(Boolean).join(", ") || "—"} />
              <Detail label="Tag" value={displayValue(part.tag)} />
              <Detail label="Status" value={part.status} />
              <Detail label="Compatible vehicle" value={vehicleLabel} />
              <Detail label="Compatible models" value={`${part.compatibleModelIds.length} model${part.compatibleModelIds.length === 1 ? "" : "s"}`} />
            </dl>
          </CardContent>
        </Card>
        <Card className="h-full min-h-0 gap-0 rounded-xl py-0" size="sm">
          <CardHeader className="h-[72px] shrink-0 border-b border-border bg-muted/20 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TagIcon className="size-4" /> Record details
            </CardTitle>
            <CardDescription className="text-xs">Internal identifiers and listing history.</CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <dl className="grid grid-cols-2 gap-x-5 gap-y-2.5">
              <Detail label="Part number" value={displayValue(part.partNumber)} />
              <Detail label="OEM number" value={displayValue(part.oemNumber)} />
              <Detail label="Listing id" value={part.id} />
              <Detail label="Compatible models" value={`${part.compatibleModelIds.length} model${part.compatibleModelIds.length === 1 ? "" : "s"}`} />
              <Detail label="Created" value={formatDateTime(part.createdAt)} />
              <Detail label="Last updated" value={formatDateTime(part.updatedAt)} />
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
