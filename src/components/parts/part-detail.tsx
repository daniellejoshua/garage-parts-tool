import type { ReactNode } from "react";
import Link from "next/link";
import { PencilIcon, TagIcon } from "lucide-react";
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
      <section className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Badge className="bg-status-unknown text-status-unknown-foreground">{part.status}</Badge>
            <span className="text-xs text-muted-foreground">Listing #{part.id}</span>
          </div>
          <h1 className="text-xl font-semibold tracking-[-0.025em] sm:text-2xl">{part.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {part.brand} <span className="mx-1.5">•</span> {part.category.replace(/_/g, " ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" render={<Link href={partEditPath(context.brandSlug, context.modelSlug, part.id)} />}>
            <PencilIcon /> Edit
          </Button>
          <DeletePartButton context={context} partId={part.id} partTitle={part.title} size="sm" />
        </div>
      </section>
      <div className="grid items-start gap-3 lg:grid-cols-[minmax(300px,400px)_minmax(0,1fr)]">
        <PartListingCard values={partToFormDefaults(part)} vehicleLabel={vehicleLabel} media={media} compact />
        <Card size="sm">
          <CardHeader className="border-b border-border bg-muted/20 pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TagIcon className="size-4" /> Record details
            </CardTitle>
            <CardDescription className="text-xs">Internal identifiers and listing history.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <Detail label="Part number" value={displayValue(part.partNumber)} />
              <Detail label="OEM number" value={displayValue(part.oemNumber)} />
              <Detail label="Listing id" value={part.id} />
              <Detail label="Compatible models" value={`${part.compatibleModelIds.length} model${part.compatibleModelIds.length === 1 ? "" : "s"}`} />
            </dl>
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              Created {formatDateTime(part.createdAt)} · Last updated {formatDateTime(part.updatedAt)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
