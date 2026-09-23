"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Image from "next/image";
import {
  CalendarIcon,
  CarFrontIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleGaugeIcon,
  EyeIcon,
  FuelIcon,
  ImageIcon,
  MapPinIcon,
  PaletteIcon,
  Settings2Icon,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { MediaRow } from "@/lib/server/media-queries";
import type { StagedImage } from "@/components/media/staged-image-picker";
import { usePresignedMediaUrls } from "@/components/media/use-presigned-media-urls";
import { formatPrice, formatWhole } from "@/lib/car-format";
import { listingStatusClassName } from "@/lib/listing-status";
import type { CarFormValues } from "@/lib/validations/car";

function PreviewItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[22px_minmax(0,1fr)] gap-2.5">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-xs font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function CarListingCard({
  values,
  media,
  stagedImages = [],
  detailPanel = false,
}: {
  values: CarFormValues;
  media: MediaRow[];
  stagedImages?: StagedImage[];
  preview?: boolean;
  detailPanel?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    media.find((item) => item.isPrimary)?.id ?? media[0]?.id ?? null,
  );
  const urls = usePresignedMediaUrls("car", media);
  const items = [
    ...media.map((item) => ({
      id: item.id,
      url: urls[item.id],
      alt: item.caption ?? item.fileName ?? "Listing image",
      resolved: item.id in urls,
    })),
    ...stagedImages.map((item) => ({ id: item.id, url: item.url, alt: item.file.name, resolved: true })),
  ];
  const selectedIndex = Math.max(0, items.findIndex((item) => item.id === selectedId));
  const selected = items[selectedIndex] ?? items[0];
  const value = (input: string | number | null | undefined) =>
    input === null || input === undefined || input === "" ? "Not set" : String(input);
  const location = [values.city, values.location].filter(Boolean).join(", ") || "Not set";
  const status = values.status.trim() || "Draft";

  function moveImage(direction: -1 | 1) {
    if (items.length < 2) return;
    const nextIndex = (selectedIndex + direction + items.length) % items.length;
    setSelectedId(items[nextIndex].id);
  }

  return (
    <Card className={cn("gap-0 rounded-xl py-0 shadow-sm", detailPanel && "h-full min-h-0")}>
      <CardHeader className={cn("border-b border-border px-4 py-3", detailPanel && "h-[72px] shrink-0 bg-muted/20")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <EyeIcon className="mt-0.5 size-5 text-foreground" />
            <div>
              <h2 className="text-base font-semibold">Listing Preview</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {detailPanel ? "Marketplace presentation." : "This is how your listing will appear to buyers."}
              </p>
            </div>
          </div>
          <span className={cn("rounded-md px-3 py-1 text-xs font-medium", listingStatusClassName(status))}>{status}</span>
        </div>
      </CardHeader>

      <CardContent className={cn("space-y-2.5 px-4 py-3.5", detailPanel && "min-h-0 flex-1 overflow-y-auto py-4")}>
        <div className={cn("relative h-52 overflow-hidden rounded-lg bg-muted/45", detailPanel && "h-[clamp(11rem,27vh,15rem)]")}>
          {selected?.url ? (
            <Image src={selected.url} alt={selected.alt} fill unoptimized sizes="(min-width: 1024px) 34vw, 100vw" className="object-contain" />
          ) : selected && !selected.resolved ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Loading image...</div>
          ) : selected ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-muted-foreground">
              <ImageIcon className="mb-2 size-6" />
              <p className="text-xs font-medium text-foreground">Image unavailable</p>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-muted-foreground">
              <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-card"><ImageIcon className="size-5" /></span>
              <p className="text-sm font-medium text-foreground">No images uploaded</p>
              <p className="mt-1 text-xs">Add photos in Media & Review.</p>
            </div>
          )}

          {items.length > 1 ? (
            <>
              <Button type="button" variant="outline" size="icon-sm" aria-label="Previous preview image" onClick={() => moveImage(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-card/95">
                <ChevronLeftIcon />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" aria-label="Next preview image" onClick={() => moveImage(1)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-card/95">
                <ChevronRightIcon />
              </Button>
            </>
          ) : null}
          {items.length > 0 ? (
            <span className="absolute bottom-2 right-2 rounded bg-foreground/70 px-2 py-1 text-xs font-medium text-background">{selectedIndex + 1} / {items.length}</span>
          ) : null}
        </div>

        {items.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {items.slice(0, 6).map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                aria-label={`Show preview image ${index + 1}`}
                className={cn(
                  "relative aspect-[4/3] w-14 shrink-0 overflow-hidden rounded-md border bg-muted",
                  index === selectedIndex ? "border-primary ring-1 ring-primary" : "border-border",
                )}
              >
                {item.url ? <Image src={item.url} alt="" fill unoptimized sizes="56px" className="object-cover" /> : null}
              </button>
            ))}
          </div>
        ) : null}

        <div>
          <h3 className="text-[17px] font-semibold leading-snug text-foreground">{values.title || "Listing title"}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{values.brand} <span className="mx-1.5">•</span> {values.model}</p>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-[25px] font-semibold tracking-[-0.04em] text-primary">
            {values.price === null ? "Price not set" : `₱${formatPrice(values.price)}`}
          </p>
          {values.originalPrice !== null ? <p className="text-sm text-muted-foreground line-through">₱{formatPrice(values.originalPrice)}</p> : null}
        </div>

        {!detailPanel ? <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-border pt-3">
          <PreviewItem icon={<CalendarIcon className="size-4" />} label="Year" value={value(values.year)} />
          <PreviewItem icon={<CarFrontIcon className="size-4" />} label="Body Style" value={value(values.bodyStyle)} />
          <PreviewItem icon={<CircleGaugeIcon className="size-4" />} label="Mileage" value={values.mileageKm === null ? "Not set" : `${formatWhole(values.mileageKm)} km`} />
          <PreviewItem icon={<Settings2Icon className="size-4" />} label="Transmission" value={value(values.transmission)} />
          <PreviewItem icon={<FuelIcon className="size-4" />} label="Fuel Type" value={value(values.fuelType)} />
          <PreviewItem icon={<ImageIcon className="size-4" />} label="Condition" value={value(values.condition)} />
          <PreviewItem icon={<PaletteIcon className="size-4" />} label="Color" value={value(values.color)} />
          <PreviewItem icon={<MapPinIcon className="size-4" />} label="Location" value={location} />
        </div> : null}

        {!detailPanel ? <p className="text-center text-[11px] text-muted-foreground">Preview updates automatically as you edit the form.</p> : null}
      </CardContent>
    </Card>
  );
}
