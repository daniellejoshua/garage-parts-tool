import type { ReactNode } from "react";
import Link from "next/link";
import {
  CarFrontIcon,
  PencilIcon,
  TagIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteCarButton } from "@/components/cars/delete-car-button";
import { CarListingCard } from "@/components/cars/car-listing-card";
import { carToFormDefaults } from "@/lib/server/serialize-car";
import type { CarRow } from "@/lib/server/serialize-car";
import type { CarNavContext } from "@/lib/server/car-actions";
import type { MediaRow } from "@/lib/server/media-queries";
import { carEditPath } from "@/lib/car-routes";
import { displayValue, formatDateTime, formatWhole } from "@/lib/car-format";
import { listingStatusClassName } from "@/lib/listing-status";

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 border-b border-border/60 pb-2 last:border-b-0">
      <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-[13px] font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function CarDetail({
  car,
  context,
  media,
}: {
  car: CarRow;
  context: CarNavContext;
  media: MediaRow[];
}) {
  const location = [car.city, car.location].filter(Boolean).join(", ") || "—";
  const bodyStyle = displayValue(car.bodyStyle);
  const statusClassName = listingStatusClassName(car.status);

  return (
    <div className="space-y-3">
      <section className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-[-0.025em] sm:text-xl">{car.title}</h1>
          <p className="text-xs text-muted-foreground">
            {car.brand} <span className="mx-1.5">•</span> {car.model} <span className="mx-1.5">•</span> {car.year} <span className="mx-1.5">•</span> {bodyStyle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={statusClassName}>{car.status}</Badge>
          <span className="text-xs text-muted-foreground">#{car.id}</span>
          <Button variant="ghost" size="sm" render={<Link href={carEditPath(context.brandSlug, context.modelSlug, car.id)} />}>
            <PencilIcon className="size-3.5" />
            <span className="sr-only">Edit {car.title}</span>
          </Button>
          <DeleteCarButton context={context} carId={car.id} carTitle={car.title} variant="ghost" size="sm" iconOnly />
        </div>
      </section>

      <div className="grid items-stretch gap-3 lg:h-[calc(100dvh-13rem)] lg:min-h-0 lg:grid-cols-[minmax(0,32fr)_minmax(0,38fr)_minmax(0,30fr)]">
        <div className="min-h-0">
          <CarListingCard values={carToFormDefaults(car)} media={media} detailPanel />
        </div>

        <Card className="h-full min-h-0 gap-0 rounded-xl py-0" size="sm">
          <CardHeader className="h-[72px] shrink-0 border-b border-border bg-muted/20 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <CarFrontIcon className="size-4" /> Vehicle Details
            </CardTitle>
            <CardDescription className="text-xs">Vehicle specifications and listing attributes.</CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <dl className="grid grid-cols-2 gap-x-5 gap-y-2.5">
              <Detail label="Year" value={car.year} />
              <Detail label="Mileage" value={`${formatWhole(car.mileageKm)} km`} />
              <Detail label="Body style" value={bodyStyle} />
              <Detail label="Fuel type" value={displayValue(car.fuelType)} />
              <Detail label="Transmission" value={displayValue(car.transmission)} />
              <Detail label="Condition" value={displayValue(car.condition)} />
              <Detail label="Color" value={displayValue(car.color)} />
              <Detail label="Location" value={location} />
              <Detail label="Tag" value={displayValue(car.tag)} />
              <Detail label="Status" value={car.status} />
            </dl>
            {car.description ? (
              <div className="mt-4 border-t border-border pt-3">
                <h3 className="text-xs font-medium text-muted-foreground">Description</h3>
                <p className="mt-1 whitespace-pre-wrap text-[13px] leading-5">{car.description}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="h-full min-h-0 gap-0 rounded-xl py-0" size="sm">
          <CardHeader className="h-[72px] shrink-0 border-b border-border bg-muted/20 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TagIcon className="size-4" /> Record details
            </CardTitle>
            <CardDescription className="text-xs">Internal listing fields and publication history.</CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <dl className="grid grid-cols-2 gap-x-5 gap-y-2.5">
              <Detail label="VIN" value={displayValue(car.vin)} />
              <Detail label="Seller ID" value={car.sellerId} />
              <Detail label="Rating" value={displayValue(car.rating)} />
              <Detail label="Inspection score" value={displayValue(car.inspectionScore)} />
              <Detail label="Published" value={formatDateTime(car.publishedAt)} />
              <Detail label="Sold" value={formatDateTime(car.soldAt)} />
              <Detail label="Created" value={formatDateTime(car.createdAt)} />
              <Detail label="Last updated" value={formatDateTime(car.updatedAt)} />
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
