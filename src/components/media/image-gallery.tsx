"use client";

import { useState } from "react";
import {
  ImageIcon,
  StarIcon,
  GripVerticalIcon,
  Trash2Icon,
  Loader2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  reorderMediaAction,
  deleteMediaAction,
} from "@/lib/server/media-actions";
import type { MediaRow } from "@/lib/server/media-queries";
import { usePresignedMediaUrls } from "@/components/media/use-presigned-media-urls";

interface ImageGalleryProps {
  parentType: "car" | "part";
  parentId: string;
  brandSlug: string;
  modelSlug: string;
  initialMedia: MediaRow[];
  editable?: boolean;
  onUpdate?: (media: MediaRow[]) => void;
  compact?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ImageGallery({
  parentType,
  parentId,
  brandSlug,
  modelSlug,
  initialMedia,
  editable = true,
  onUpdate,
  compact = false,
}: ImageGalleryProps) {
  const [media, setMedia] = useState<MediaRow[]>(initialMedia);
  const presignedUrls = usePresignedMediaUrls(parentType, media);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogIndex, setDialogIndex] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setReordering(true);
    const newMedia = [...media];
    const [removed] = newMedia.splice(fromIndex, 1);
    newMedia.splice(toIndex, 0, removed);
    const orderedIds = newMedia.map((m) => m.id);
    const result = await reorderMediaAction(
      { parentType, parentId, orderedMediaIds: orderedIds },
      brandSlug,
      modelSlug,
    );
    if (result.ok && "media" in result && Array.isArray(result.media)) {
      const updated = result.media;
      setMedia(updated);
      onUpdate?.(updated);
    }
    setReordering(false);
  };

  const handleDelete = async (mediaId: string) => {
    setDeleting(mediaId);
    const result = await deleteMediaAction(
      { parentType, parentId, mediaId },
      brandSlug,
      modelSlug,
    );
    if (result.ok && "media" in result && Array.isArray(result.media)) {
      const updated = result.media;
      setMedia(updated);
      onUpdate?.(updated);
    }
    setDeleting(null);
  };

  const moveImage = (index: number, direction: number) => {
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < media.length) {
      handleReorder(index, newIndex);
    }
  };

  const openDialog = (index: number) => {
    setDialogIndex(index);
    setDialogOpen(true);
  };

  const getImageUrl = (m: MediaRow): string => {
    const presignedUrl = presignedUrls[m.id];
    if (presignedUrl) return presignedUrl;
    if (!(m.id in presignedUrls)) return "loading";
    return "/placeholder.svg";
  };

  if (media.length === 0) {
    return (
      <section className={cn("flex flex-col items-center justify-center rounded-xl border border-border bg-card px-5 text-center text-muted-foreground", compact ? "py-5" : "py-12")}>
        <ImageIcon className={cn("mb-2 opacity-50", compact ? "size-7" : "size-12")} />
        <p className="text-sm font-medium text-foreground">No images uploaded yet</p>
        <p className="mt-1 text-xs">Add images from the upload area on the edit page.</p>
      </section>
    );
  }

  return (
    <section className={cn("rounded-xl border border-border bg-card", compact ? "space-y-2 p-2.5" : "space-y-5 p-4 sm:p-5")}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">
          Images ({media.length} / 20)
        </h4>
        {editable && (
          <Badge variant="outline" className={cn("text-muted-foreground", compact ? "text-[10px]" : "text-xs")}>
            Drag to reorder · first image is primary
          </Badge>
        )}
      </div>

      <div className={cn("grid", compact ? "grid-cols-5 gap-1.5 sm:grid-cols-8 xl:grid-cols-10" : "grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5")}>
        {media.map((m, index) => {
          const url = getImageUrl(m);
          const isLoading = url === "loading";

          return (
            <div
              key={m.id}
              draggable={editable && !reordering}
              onDragStart={() => setDraggedIndex(index)}
              onDragEnd={() => setDraggedIndex(null)}
              onDragOver={(event) => {
                if (editable) event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (draggedIndex === null) return;
                void handleReorder(draggedIndex, index);
                setDraggedIndex(null);
              }}
              className={cn(
                "relative group rounded-lg overflow-hidden border bg-muted/30 transition-[border-color,box-shadow,opacity] hover:border-primary/30 hover:shadow-sm",
                editable && "cursor-grab active:cursor-grabbing",
                draggedIndex === index && "opacity-50",
                m.isPrimary && "ring-2 ring-primary",
              )}
            >
              <Dialog open={dialogOpen && dialogIndex === index} onOpenChange={setDialogOpen}>
                <DialogTrigger
                  render={
                    <button
                      type="button"
                      className="relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden text-left"
                      onClick={() => openDialog(index)}
                    />
                  }
                >
                    {isLoading ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <img
                        src={url}
                        alt={m.caption ?? m.fileName ?? `Image ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
                        loading="lazy"
                      />
                    )}
                    {m.isPrimary && (
                      <div className="absolute top-1.5 left-1.5 z-10">
                        <Badge variant="default" className={cn("gap-1", compact && "size-5 justify-center p-0")} aria-label="Primary image">
                          <StarIcon className="size-3" />
                          {compact ? null : "Primary"}
                        </Badge>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </DialogTrigger>

                <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                  <div className="relative aspect-[4/3]">
                    <img
                      src={presignedUrls[m.id] || url}
                      alt={m.caption ?? m.fileName ?? `Image ${index + 1}`}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2">
                      <span className="text-sm text-white/90 bg-black/50 px-2 py-1 rounded">
                        {m.fileName}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/80 bg-black/50 px-2 py-1 rounded">
                          {formatBytes(Number(m.sizeBytes ?? 0))}
                        </span>
                        {editable && media.length > 1 && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-white hover:text-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveImage(index, -1);
                              }}
                              disabled={index === 0 || reordering}
                            >
                              <ChevronLeftIcon className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-white hover:text-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveImage(index, 1);
                              }}
                              disabled={index === media.length - 1 || reordering}
                            >
                              <ChevronRightIcon className="size-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <DialogHeader className="p-4 border-t">
                    <DialogTitle className="text-sm font-medium">
                      {m.caption ? (
                        <>
                          {m.caption}
                          <span className="ml-2 text-xs text-muted-foreground font-normal">
                            ({m.mimeType} · {formatBytes(Number(m.sizeBytes ?? 0))})
                          </span>
                        </>
                      ) : (
                        m.fileName
                      )}
                    </DialogTitle>
                  </DialogHeader>
                </DialogContent>
              </Dialog>

              <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {editable && (
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={<Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 bg-card/90 text-muted-foreground hover:text-destructive"
                        onClick={(e) => e.stopPropagation()}
                        disabled={deleting === m.id}
                        title="Delete image"
                      />}
                    >
                        {deleting === m.id ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          <Trash2Icon className="size-4" />
                        )}
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete image?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the image from storage. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={() => handleDelete(m.id)}
                          disabled={deleting === m.id}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              {editable && (
                <div className="absolute bottom-1.5 left-1.5 right-1.5">
                  <span className={cn("flex w-full items-center justify-center rounded-md bg-black/30 text-white/80 backdrop-blur-sm", compact ? "h-5" : "h-8")} aria-hidden="true">
                    <GripVerticalIcon className="size-4" />
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
