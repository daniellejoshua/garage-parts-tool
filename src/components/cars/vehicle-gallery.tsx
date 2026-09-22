"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon, ImageIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import type { MediaRow } from "@/lib/server/media-queries";
import { usePresignedMediaUrls } from "@/components/media/use-presigned-media-urls";

export function VehicleGallery({ media }: { media: MediaRow[] }) {
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const primaryIndex = media.findIndex((item) => item.isPrimary);
    return primaryIndex >= 0 ? primaryIndex : 0;
  });
  const urls = usePresignedMediaUrls("car", media);
  const selected = media[selectedIndex];
  const selectedUrl = selected ? urls[selected.id] : null;
  const hasMultiple = media.length > 1;

  function move(direction: -1 | 1) {
    setSelectedIndex((current) => (current + direction + media.length) % media.length);
  }

  if (media.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-card p-2 shadow-sm">
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-md bg-muted/35 px-6 text-center text-muted-foreground md:min-h-[280px]">
          <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-card text-primary shadow-sm">
            <ImageIcon className="size-6" />
          </span>
          <h2 className="text-base font-semibold text-foreground">No vehicle images uploaded</h2>
          <p className="mt-1 max-w-sm text-sm">Images added from the edit page will appear in this gallery.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card p-2 shadow-sm">
      <div className="flex flex-col gap-2 md:grid md:grid-cols-[minmax(0,1fr)_96px]">
        <div className="relative min-h-[220px] overflow-hidden rounded-md bg-muted/35 md:min-h-[280px]">
          {selectedUrl ? (
            <Image
              src={selectedUrl}
              alt={selected.caption ?? selected.fileName ?? `Vehicle image ${selectedIndex + 1}`}
              fill
              unoptimized
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-contain"
              priority={selectedIndex === 0}
            />
          ) : selected && !(selected.id in urls) ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Loading image...</div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-muted-foreground">
              <ImageIcon className="mb-3 size-8" />
              <p className="text-sm font-medium text-foreground">Image unavailable</p>
            </div>
          )}

          {hasMultiple ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-card/95 shadow-sm"
                aria-label="Previous image"
                onClick={() => move(-1)}
              >
                <ChevronLeftIcon />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-card/95 shadow-sm"
                aria-label="Next image"
                onClick={() => move(1)}
              >
                <ChevronRightIcon />
              </Button>
            </>
          ) : null}

          <span className="absolute bottom-3 right-3 rounded-md bg-foreground/70 px-2.5 py-1 text-xs font-medium text-background">
            {selectedIndex + 1} / {media.length}
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 md:max-h-[280px] md:flex-col md:overflow-y-auto md:overflow-x-hidden md:pb-0 md:pr-1">
          {media.map((item, index) => {
            const url = urls[item.id];
            const isSelected = index === selectedIndex;
            return (
              <button
                key={item.id}
                type="button"
                aria-label={`Show vehicle image ${index + 1}`}
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  "relative h-14 w-20 shrink-0 overflow-hidden rounded-md border bg-muted/35 transition md:h-12 md:w-full",
                  isSelected ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50",
                )}
              >
                {url ? (
                  <Image src={url} alt="" fill unoptimized sizes="132px" className="object-cover" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="size-5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
