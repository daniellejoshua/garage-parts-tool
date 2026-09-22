import type { ReactNode } from "react";
import Link from "next/link";
import {
  CalendarIcon,
  CarFrontIcon,
  ChevronDownIcon,
  CircleGaugeIcon,
  ClipboardCheckIcon,
  ClockIcon,
  FuelIcon,
  GaugeIcon,
  IdCardIcon,
  MapPinIcon,
  PaletteIcon,
  PencilIcon,
  Settings2Icon,
  StarIcon,
  TagIcon,
  UserIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteCarButton } from "@/components/cars/delete-car-button";
import { VehicleGallery } from "@/components/cars/vehicle-gallery";
import { VehicleDetailTabs } from "@/components/cars/vehicle-detail-tabs";
import type { CarRow } from "@/lib/server/serialize-car";
import type { CarNavContext } from "@/lib/server/car-actions";
import type { MediaRow } from "@/lib/server/media-queries";
import { carEditPath } from "@/lib/car-routes";
import { displayValue, formatDateTime, formatWhole } from "@/lib/car-format";

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

function formatPeso(value: number) {
  return pesoFormatter.format(value);
}

function statusTone(status: string) {
  return ["active", "available", "published", "ready"].includes(status.toLowerCase())
    ? "bg-status-current text-status-current-foreground"
    : "bg-status-unknown text-status-unknown-foreground";
}

function SpecItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[20px_minmax(0,1fr)] gap-2.5">
      <span className="mt-0.5 text-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-words text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function MetadataItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[20px_minmax(0,1fr)] gap-2.5">
      <span className="mt-0.5 text-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-words text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function MoreActions() {
  return (
    <details className="relative">
      <summary className="flex h-8 cursor-pointer list-none items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[0.8rem] font-medium text-foreground transition hover:bg-muted [&::-webkit-details-marker]:hidden">
        More
        <ChevronDownIcon className="size-4" />
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-border bg-card p-1 text-sm shadow-lg">
        <span className="block rounded-md px-3 py-2 text-muted-foreground">No additional actions</span>
      </div>
    </details>
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
  const statusClassName = statusTone(car.status);
  const specGroups = [
    {
      title: "Vehicle",
      items: [
        { label: "Brand", value: car.brand },
        { label: "Model", value: car.model },
        { label: "Year", value: String(car.year) },
        { label: "Body style", value: bodyStyle },
        { label: "Color", value: displayValue(car.color) },
        { label: "VIN", value: displayValue(car.vin) },
      ],
    },
    {
      title: "Mechanical",
      items: [
        { label: "Mileage", value: `${formatWhole(car.mileageKm)} km` },
        { label: "Transmission", value: displayValue(car.transmission) },
        { label: "Fuel type", value: displayValue(car.fuelType) },
        { label: "Condition", value: displayValue(car.condition) },
        { label: "Inspection score", value: displayValue(car.inspectionScore) },
        { label: "Rating", value: displayValue(car.rating) },
      ],
    },
    {
      title: "Listing",
      items: [
        { label: "Status", value: car.status },
        { label: "Tag", value: displayValue(car.tag) },
        { label: "Seller ID", value: car.sellerId },
        { label: "Price", value: formatPeso(car.price) },
        { label: "Original price", value: car.originalPrice === null ? "—" : formatPeso(car.originalPrice) },
        { label: "Location", value: location },
      ],
    },
  ];

  return (
    <div className="space-y-3">
      <section className="flex flex-col gap-3 border-b border-border pb-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-[-0.025em] text-foreground sm:text-2xl">{car.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {car.brand} <span className="mx-2">•</span> {car.model} <span className="mx-2">•</span> {car.year} <span className="mx-2">•</span> {bodyStyle}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-40 text-xs text-muted-foreground">
            <Badge className={statusClassName}>{car.status}</Badge>
            <p className="mt-1.5">Listing #{car.id}</p>
            <p>Created {formatDateTime(car.createdAt)}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" render={<Link href={carEditPath(context.brandSlug, context.modelSlug, car.id)} />}>
              <PencilIcon />
              Edit Listing
            </Button>
            <MoreActions />
            <DeleteCarButton context={context} carId={car.id} carTitle={car.title} variant="outline" size="sm" />
          </div>
        </div>
      </section>

      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
        <div className="space-y-3">
          <VehicleGallery media={media} />
          <VehicleDetailTabs description={car.description} groups={specGroups} />
        </div>

        <aside className="space-y-3 xl:sticky xl:top-[4.5rem]">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border px-4 py-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <TagIcon className="size-4" />
                Listing Summary
              </CardTitle>
              <Badge className={statusClassName}>{car.status}</Badge>
            </CardHeader>
            <CardContent className="space-y-3 px-4 py-3">
              <div>
                <p className="text-xl font-semibold tracking-[-0.03em] text-primary sm:text-2xl">{formatPeso(car.price)}</p>
                {car.originalPrice !== null ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Original Price <span className="ml-4 line-through">{formatPeso(car.originalPrice)}</span>
                  </p>
                ) : null}
              </div>

              <div className="border-t border-border" />

              <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                <SpecItem icon={<CalendarIcon className="size-4" />} label="Year" value={String(car.year)} />
                <SpecItem icon={<CarFrontIcon className="size-4" />} label="Body Style" value={bodyStyle} />
                <SpecItem icon={<GaugeIcon className="size-4" />} label="Mileage" value={`${formatWhole(car.mileageKm)} km`} />
                <SpecItem icon={<Settings2Icon className="size-4" />} label="Transmission" value={displayValue(car.transmission)} />
                <SpecItem icon={<FuelIcon className="size-4" />} label="Fuel Type" value={displayValue(car.fuelType)} />
                <SpecItem icon={<ClipboardCheckIcon className="size-4" />} label="Condition" value={displayValue(car.condition)} />
                <SpecItem icon={<PaletteIcon className="size-4" />} label="Color" value={displayValue(car.color)} />
                <SpecItem icon={<MapPinIcon className="size-4" />} label="Location" value={location} />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="border-b border-border px-4 py-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <ClipboardCheckIcon className="size-4" />
                Administrative Details
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-3">
              <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 xl:grid-cols-2">
                <MetadataItem icon={<UserIcon className="size-4" />} label="Seller ID" value={car.sellerId} />
                <MetadataItem icon={<IdCardIcon className="size-4" />} label="VIN" value={displayValue(car.vin)} />
                <MetadataItem icon={<StarIcon className="size-4" />} label="Rating" value={displayValue(car.rating)} />
                <MetadataItem icon={<CircleGaugeIcon className="size-4" />} label="Inspection Score" value={displayValue(car.inspectionScore)} />
                <MetadataItem icon={<CalendarIcon className="size-4" />} label="Published At" value={formatDateTime(car.publishedAt)} />
                <MetadataItem icon={<CalendarIcon className="size-4" />} label="Sold At" value={formatDateTime(car.soldAt)} />
                <MetadataItem icon={<ClockIcon className="size-4" />} label="Created At" value={formatDateTime(car.createdAt)} />
                <MetadataItem icon={<ClockIcon className="size-4" />} label="Last Updated" value={formatDateTime(car.updatedAt)} />
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
