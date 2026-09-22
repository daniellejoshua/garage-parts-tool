"use client";

import { useCallback, useState } from "react";
import { UploadIcon, CheckIcon, XIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface UploadProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  mediaId?: string;
}

interface DropZoneProps {
  parentType: "car" | "part";
  parentId: string;
  brandSlug: string;
  modelSlug: string;
  currentCount: number;
  maxCount: number;
  onUploadComplete: () => void;
  disabled?: boolean;
  compact?: boolean;
}

export function DropZone({
  parentType,
  parentId,
  brandSlug,
  modelSlug,
  currentCount,
  maxCount,
  onUploadComplete,
  disabled,
  compact = false,
}: DropZoneProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [caption, setCaption] = useState("");

  const canUpload = currentCount < maxCount && !disabled;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canUpload) setIsDragging(true);
  }, [canUpload]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (!canUpload) return;
      const files = Array.from(e.dataTransfer.files);
      await processFiles(files);
    },
    [canUpload],
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!canUpload) return;
      const files = Array.from(e.target.files ?? []);
      await processFiles(files);
      e.target.value = "";
    },
    [canUpload],
  );

  const processFiles = async (files: File[]) => {
    const availableSlots = maxCount - currentCount;
    const filesToUpload = files.slice(0, availableSlots);

    if (filesToUpload.length === 0) return;

    for (const file of filesToUpload) {
      const uploadId = `${file.name}-${Date.now()}`;
      setUploads((prev) => [...prev, { fileName: file.name, progress: 0, status: "pending" }]);

      try {
        setUploads((prev) =>
          prev.map((u) =>
            u.fileName === file.name && u.status === "pending"
              ? { ...u, status: "uploading", progress: 0 }
              : u,
          ),
        );

        const formData = new FormData();
        formData.append("file", file);
        formData.append("parentType", parentType);
        formData.append("parentId", parentId);
        formData.append("brandSlug", brandSlug);
        formData.append("modelSlug", modelSlug);
        if (caption) formData.append("caption", caption);

        const response = await fetch("/api/media/upload", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (result.ok) {
          setUploads((prev) =>
            prev.map((u) =>
              u.fileName === file.name && u.status === "uploading"
                ? { ...u, status: "success", progress: 100, mediaId: result.media.id }
                : u,
            ),
          );
        } else {
          setUploads((prev) =>
            prev.map((u) =>
              u.fileName === file.name && u.status === "uploading"
                ? { ...u, status: "error", error: result.error }
                : u,
            ),
          );
        }
      } catch (err) {
        setUploads((prev) =>
          prev.map((u) =>
            u.fileName === file.name && u.status === "uploading"
              ? { ...u, status: "error", error: err instanceof Error ? err.message : "Upload failed" }
              : u,
          ),
        );
      }
    }

    onUploadComplete();
  };

  const removeUpload = (fileName: string) => {
    setUploads((prev) => prev.filter((u) => u.fileName !== fileName));
  };

  if (!canUpload) {
    return (
      <div className="rounded-xl border border-border bg-card py-8 text-center text-sm text-muted-foreground">
        {currentCount >= maxCount
          ? `Maximum ${maxCount} images reached`
          : disabled
          ? "Upload disabled"
          : "Select a parent listing to enable upload"}
      </div>
    );
  }

  return (
    <section className={cn("rounded-xl border border-border bg-card", compact ? "grid gap-2.5 p-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(220px,.65fr)]" : "space-y-5 p-4 sm:p-5")}>
      <div className={cn(compact && "sm:col-span-2")}>
        <h2 className={cn("font-semibold", compact ? "text-sm" : "text-base")}>Upload images</h2>
        <p className={cn("mt-0.5 text-muted-foreground", compact ? "text-[11px]" : "text-sm")}>Add clear listing photos in JPEG, PNG, or WebP format.</p>
      </div>
      <div
        className={cn(
          "relative rounded-xl border border-dashed text-center transition-colors",
          compact ? "p-2.5" : "p-8 sm:p-10",
          isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/35",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          id="drop-zone-input"
          disabled={!canUpload}
        />
        <label htmlFor="drop-zone-input" className="cursor-pointer">
          <span className={cn("mx-auto flex items-center justify-center rounded-full bg-primary/10 text-primary", compact ? "size-8" : "size-11")}>
            <UploadIcon className={cn(compact ? "size-4" : "size-5")} />
          </span>
          <p className={cn("font-medium", compact ? "mt-2 text-sm" : "mt-3 text-base")}>Drag and drop images here</p>
          <p className={cn("text-muted-foreground", compact ? "text-[11px]" : "text-sm")}>or click to browse</p>
          <p className={cn("text-muted-foreground", compact ? "mt-1 text-[10px]" : "mt-2 text-xs")}>
            JPEG, PNG, WebP · Max 10 MB · {maxCount - currentCount} slot{maxCount - currentCount !== 1 ? "s" : ""} remaining
          </p>
        </label>
      </div>

      <div className={cn("space-y-1.5", compact && "self-center")}>
        <Label htmlFor="caption" className={cn(compact && "text-xs")}>Caption (applies to all files in this batch)</Label>
        <Input
          id="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Optional description for uploaded images"
          maxLength={500}
          className={cn(compact && "h-9 text-xs")}
        />
      </div>

      {uploads.length > 0 && (
        <div className={cn("space-y-2 rounded-lg border bg-muted/20 p-4", compact && "sm:col-span-2")}>
          <h4 className="text-sm font-medium">Upload Queue</h4>
          {uploads.map((upload) => (
            <div key={upload.fileName} className="flex items-center gap-3 text-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="truncate">{upload.fileName}</span>
                  <span className="text-xs text-muted-foreground">
                    {upload.status === "uploading" ? `${Math.round(upload.progress)}%` : upload.status}
                  </span>
                </div>
                {upload.status === "uploading" && (
                  <Progress value={upload.progress} className="mt-1 h-1.5" />
                )}
                {upload.status === "error" && (
                  <p className="mt-1 text-xs text-destructive">{upload.error}</p>
                )}
              </div>
              {upload.status === "error" && (
                <Button variant="ghost" size="icon" onClick={() => removeUpload(upload.fileName)}>
                  <XIcon className="size-4" />
                </Button>
              )}
               {upload.status === "success" && <CheckIcon className="size-4 shrink-0 text-success" />}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
