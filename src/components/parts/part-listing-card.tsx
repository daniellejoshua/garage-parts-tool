"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Image from "next/image";
import {
  BoxesIcon,
  CircleDollarSignIcon,
  EyeIcon,
  ImageIcon,
  MapPinIcon,
  PackageIcon,
  Settings2Icon,
  ShieldCheckIcon,
  TagIcon,
  TruckIcon,
  WrenchIcon,
} from "lucide-react";
import { cn } from "cn";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { MediaRow } from "@/lib/server/media-queries";
import type { StagedImage } from "@/components/media/staged-image-picker";
import { usePresignedMediaUrls } from "@/components/media/use-presigned-media-urls";
import { formatPrice, formatWhole } from "@/lib/car-format";
import type { PartFormValues } from "@/lib/validations/part";

function PreviewItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[18px_76px_minmax(0,1fr)] items-center gap-2 text-xs">
      <span>{icon}</span>
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}

export function PartListingCard({
  values,
  vehicleLabel,
  media,
  stagedImages = [],
  preview = false,
  compact = false,
  detailPanel = false,
}: {
  values: PartFormValues;
  vehicleLabel: string;
  media: MediaRow[];
  stagedImages?: StagedImage[];
  preview?: boolean;
  compact?: boolean;
  detailPanel?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    media.find((item) => item.isPrimary)?.id ?? media[0]?.id ?? null,
  );
  const urls = usePresignedMediaUrls("part", media);
  const selected = media.find((item) => item.id === selectedId)
    ?? media.find((item) => item.isPrimary)
    ?? media[0];
  const selectedStaged = stagedImages.find((item) => item.id === selectedId)
    ?? stagedImages[0];
  const selectedUrl = selected ? urls[selected.id] : null;
  const value = (input: string | number | null | undefined) =>
    input === null || input === undefined || input === "" ? "Not set" : String(input);
  const location = [values.city, values.location].filter(Boolean).join(", ") || "Not set";

  return (
    <Card className={cn("shadow-sm", compact && "gap-3 py-3", detailPanel && "h-full min-h-0 gap-0 rounded-xl py-0")}>
      <CardHeader className={cn("border-b border-border bg-muted/20 pb-4", compact && "px-4 pb-3", detailPanel && "h-[72px] shrink-0 px-4 py-3")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {detailPanel ? (
            <div className="flex gap-3">
              <EyeIcon className="mt-0.5 size-5 text-foreground" />
              <div>
                <h2 className="text-base font-semibold">Listing Preview</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Marketplace presentation.</p>
              </div>
            </div>
          ) : null}
          <span className="rounded-lg bg-status-unknown px-3 py-1 text-xs font-medium text-status-unknown-foreground">
            {preview ? "Draft" : value(values.status)}
          </span>
          {preview ? <span className="flex items-center gap-2 text-xs text-muted-foreground"><EyeIcon className="size-4" /> Preview updates live</span> : null}
        </div>
      </CardHeader>
      <CardContent className={cn("space-y-4", compact && "space-y-3 px-4", detailPanel && "min-h-0 flex-1 overflow-y-auto py-4")}>
        <div>
          <h2 className={cn("text-lg font-semibold leading-snug", compact && "text-base")}>{values.title || "Listing title"}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Compatible with {vehicleLabel}</p>
        </div>
        <div className={cn("relative aspect-[16/10] overflow-hidden rounded-lg border border-border bg-muted/35", compact && "max-h-[250px]", detailPanel && "h-[clamp(11rem,27vh,15rem)] max-h-none aspect-auto")}>
          {selectedStaged ? (
            <Image src={selectedStaged.url} alt={selectedStaged.file.name} fill unoptimized sizes="(min-width: 1024px) 36vw, 100vw" className="object-contain" />
          ) : selected && selectedUrl ? (
            <Image src={selectedUrl} alt={selected.caption ?? selected.fileName ?? "Part image"} fill unoptimized sizes="(min-width: 1024px) 36vw, 100vw" className="object-contain" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-muted-foreground">
              <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-card"><ImageIcon className="size-5" /></span>
              <p className="text-sm font-medium text-foreground">No listing image</p>
              <p className="mt-1 text-xs">Actual uploaded images appear here.</p>
            </div>
          )}
        </div>
        {(stagedImages.length > 0 || media.length > 0) ? (
          <div className="grid grid-cols-4 gap-2">
            {(stagedImages.length > 0 ? stagedImages : media).slice(0, 4).map((item) => {
              const isStaged = "file" in item;
              const url = isStaged ? item.url : urls[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  aria-label={`Show image ${item.id}`}
                  className={cn("relative aspect-[4/3] overflow-hidden rounded-md border bg-muted", (isStaged ? selectedStaged?.id : selected?.id) === item.id && "border-primary ring-1 ring-primary")}
                >
                  {url ? <Image src={url} alt="" fill unoptimized sizes="100px" className="object-cover" /> : null}
                </button>
              );
            })}
          </div>
        ) : null}
        {!detailPanel ? <div className={cn("grid grid-cols-1 gap-x-4 gap-y-3 border-y border-border py-4 sm:grid-cols-2", compact && "gap-y-2.5 py-3")}>
          <PreviewItem icon={<TagIcon className="size-4" />} label="Status" value={value(values.status)} />
          <PreviewItem icon={<Settings2Icon className="size-4" />} label="Condition" value={value(values.condition)} />
          <PreviewItem icon={<PackageIcon className="size-4" />} label="Category" value={value(values.category).replace(/_/g, " ")} />
          <PreviewItem icon={<WrenchIcon className="size-4" />} label="Part brand" value={value(values.brand)} />
          <PreviewItem icon={<ShieldCheckIcon className="size-4" />} label="OEM no." value={value(values.oemNumber)} />
          <PreviewItem icon={<BoxesIcon className="size-4" />} label="Quantity" value={values.quantity === null ? "Not set" : formatWhole(values.quantity)} />
          <PreviewItem icon={<TruckIcon className="size-4" />} label="Shipping" value={values.freeShipping ? "Free" : "Standard"} />
          <PreviewItem icon={<MapPinIcon className="size-4" />} label="Location" value={location} />
          <PreviewItem icon={<WrenchIcon className="size-4" />} label="Fitment" value={`${values.compatibleModelIds.length} model${values.compatibleModelIds.length === 1 ? "" : "s"}`} />
          <PreviewItem icon={<TagIcon className="size-4" />} label="Tag" value={value(values.tag)} />
        </div> : null}
        <div className={cn("grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2", compact && "gap-y-2.5", detailPanel && "border-t border-border pt-3")}>
          <PreviewItem icon={<CircleDollarSignIcon className="size-4" />} label="Price" value={values.price === null ? "Not set" : formatPrice(values.price)} />
          <PreviewItem icon={<CircleDollarSignIcon className="size-4" />} label="Original" value={values.originalPrice === null ? "Not set" : formatPrice(values.originalPrice)} />
        </div>
      </CardContent>
    </Card>
  );
}
