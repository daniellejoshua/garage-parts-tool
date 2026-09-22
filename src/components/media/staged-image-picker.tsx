"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { GripVerticalIcon, ImagePlusIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MIN_WIDTH = 400;
const MIN_HEIGHT = 300;
const MAX_WIDTH = 4000;
const MAX_HEIGHT = 4000;

export interface StagedImage {
  file: File;
  id: string;
  url: string;
}

async function validateImage(file: File) {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return "Only JPEG, PNG, and WebP images are supported.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "Images must be 10 MB or smaller.";
  }

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    bitmap.close();

    if (width < MIN_WIDTH || height < MIN_HEIGHT) {
      return `Images must be at least ${MIN_WIDTH}x${MIN_HEIGHT}px.`;
    }
    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
      return `Images must be no larger than ${MAX_WIDTH}x${MAX_HEIGHT}px.`;
    }
  } catch {
    return "The image could not be read.";
  }

  return null;
}

export function StagedImagePicker({
  images,
  onChange,
  maxCount = 20,
  compact = false,
}: {
  images: StagedImage[];
  onChange: (images: StagedImage[]) => void;
  maxCount?: number;
  compact?: boolean;
}) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const imagesRef = useRef(images);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => () => {
    imagesRef.current.forEach((image) => URL.revokeObjectURL(image.url));
  }, []);

  async function addFiles(selectedFiles: File[]) {
    const availableSlots = maxCount - images.length;
    if (availableSlots <= 0) {
      toast.error(`A listing can have up to ${maxCount} images.`);
      return;
    }
    if (selectedFiles.length > availableSlots) {
      toast.error(`Only the first ${availableSlots} selected images were added.`);
    }

    const accepted: File[] = [];
    for (const file of selectedFiles.slice(0, availableSlots)) {
      const error = await validateImage(file);
      if (error) {
        toast.error(`${file.name}: ${error}`);
      } else {
        accepted.push(file);
      }
    }

    if (accepted.length > 0) {
      onChange([
        ...images,
        ...accepted.map((file) => ({
          file,
          id: crypto.randomUUID(),
          url: URL.createObjectURL(file),
        })),
      ]);
    }
  }

  return (
    <section className="space-y-4">
      <div
        className={cn(
          "relative rounded-xl border border-dashed text-center transition-colors",
          compact ? "p-3" : "p-8 sm:p-10",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/35",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void addFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={images.length >= maxCount}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          onChange={(event) => {
            void addFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
        <label htmlFor={inputId} className="cursor-pointer">
          <span className={cn("mx-auto flex items-center justify-center rounded-full bg-primary/10 text-primary", compact ? "size-8" : "size-11")}>
            <ImagePlusIcon className={cn(compact ? "size-4" : "size-5")} />
          </span>
          <p className={cn("font-medium", compact ? "mt-2 text-sm" : "mt-3 text-base")}>Add listing images</p>
          <p className={cn("text-muted-foreground", compact ? "text-[11px]" : "text-sm")}>Drag and drop or click to browse</p>
          <p className={cn("text-muted-foreground", compact ? "mt-1 text-[10px]" : "mt-2 text-xs")}>
            JPEG, PNG, WebP · 400x300 to 4000x4000px · Max 10 MB · {maxCount - images.length} slots remaining
          </p>
        </label>
      </div>

      {images.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Drag images to reorder them. The first image is the primary image.
          </p>
          <div className={cn("grid", compact ? "grid-cols-5 gap-1.5 sm:grid-cols-8 xl:grid-cols-10" : "grid-cols-2 gap-3 sm:grid-cols-4")}>
            {images.map((image, index) => (
            <div
              key={image.id}
              draggable
              onDragStart={() => setDraggedIndex(index)}
              onDragEnd={() => setDraggedIndex(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (draggedIndex === null || draggedIndex === index) return;
                const reordered = [...images];
                const [dragged] = reordered.splice(draggedIndex, 1);
                reordered.splice(index, 0, dragged);
                onChange(reordered);
                setDraggedIndex(null);
              }}
              className={cn(
                "group relative aspect-[4/3] cursor-grab overflow-hidden rounded-lg border bg-muted active:cursor-grabbing",
                draggedIndex === index && "opacity-50",
              )}
            >
              <Image
                src={image.url}
                alt={`Selected image ${index + 1}`}
                fill
                unoptimized
                sizes="160px"
                className="object-cover"
              />
              {index === 0 ? (
                <span className="absolute bottom-2 left-2 rounded bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground">
                  Primary
                </span>
              ) : null}
              <span className="absolute bottom-2 right-2 flex size-7 items-center justify-center rounded bg-black/55 text-white" aria-hidden="true">
                <GripVerticalIcon className="size-4" />
              </span>
              <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                aria-label={`Remove ${image.file.name}`}
                className="absolute right-2 top-2 opacity-90"
                onClick={() => {
                  URL.revokeObjectURL(image.url);
                  onChange(images.filter((_, imageIndex) => imageIndex !== index));
                }}
              >
                <XIcon />
              </Button>
            </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export async function uploadStagedImages({
  files,
  parentType,
  parentId,
  brandSlug,
  modelSlug,
}: {
  files: File[];
  parentType: "car" | "part";
  parentId: string;
  brandSlug: string;
  modelSlug: string;
}) {
  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("parentType", parentType);
    formData.append("parentId", parentId);
    formData.append("brandSlug", brandSlug);
    formData.append("modelSlug", modelSlug);

    const response = await fetch("/api/media/upload", {
      method: "POST",
      body: formData,
    });
    const result = (await response.json()) as { ok: boolean; error?: string };

    if (!response.ok || !result.ok) {
      throw new Error(result.error ?? `Could not upload ${file.name}.`);
    }
  }
}
