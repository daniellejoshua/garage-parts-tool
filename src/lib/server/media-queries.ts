

import type { Media } from "@prisma/client";
import { prisma } from "@/lib/server/db";
import type { MediaKeyParts } from "@/lib/server/media-utils";

export interface MediaRow {
  id: string;
  mediableType: "car" | "part";
  mediableId: string;
  filePath: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: string | null;
  type: string | null;
  isPrimary: boolean;
  order: number;
  caption: string | null;
  url: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function serializeMedia(media: Media): MediaRow {
  return {
    id: media.id.toString(),
    mediableType: media.mediableType as "car" | "part",
    mediableId: media.mediableId.toString(),
    filePath: media.filePath,
    fileName: media.fileName,
    mimeType: media.mimeType,
    sizeBytes: media.sizeBytes?.toString() ?? null,
    type: media.type,
    isPrimary: media.isPrimary,
    order: media.order,
    caption: media.caption,
    url: media.url,
    createdAt: media.createdAt,
    updatedAt: media.updatedAt,
  };
}

export async function getMediaByParent(
  parentType: "car" | "part",
  parentId: bigint,
): Promise<MediaRow[]> {
  const media = await prisma.media.findMany({
    where: { mediableType: parentType, mediableId: parentId },
    orderBy: { order: "asc" },
  });
  return media.map(serializeMedia);
}

export async function getMediaById(rawId: string): Promise<MediaRow | null> {
  const id = BigInt(rawId);
  const media = await prisma.media.findUnique({ where: { id } });
  return media ? serializeMedia(media) : null;
}

export async function countMediaByParent(
  parentType: "car" | "part",
  parentId: bigint,
): Promise<number> {
  return prisma.media.count({ where: { mediableType: parentType, mediableId: parentId } });
}

export async function getPrimaryMedia(
  parentType: "car" | "part",
  parentId: bigint,
): Promise<MediaRow | null> {
  const media = await prisma.media.findFirst({
    where: { mediableType: parentType, mediableId: parentId, isPrimary: true },
    orderBy: { order: "asc" },
  });
  return media ? serializeMedia(media) : null;
}

export async function createMediaRecords(
  records: Array<{
    mediableType: "car" | "part";
    mediableId: bigint;
    filePath: string;
    fileName: string;
    mimeType: string;
    sizeBytes: bigint;
    type: string;
    isPrimary: boolean;
    order: number;
    caption: string | null;
  }>,
): Promise<MediaRow[]> {
  const created = await prisma.media.createMany({
    data: records.map((r) => ({
      ...r,
      mediableId: r.mediableId,
      sizeBytes: r.sizeBytes,
    })),
    skipDuplicates: false,
  });

  const newMedia = await prisma.media.findMany({
    where: {
      mediableType: records[0].mediableType,
      mediableId: records[0].mediableId,
      filePath: { in: records.map((r) => r.filePath) },
    },
    orderBy: { order: "asc" },
  });
  return newMedia.map(serializeMedia);
}

export async function setPrimaryMedia(
  parentType: "car" | "part",
  parentId: bigint,
  mediaId: bigint,
): Promise<MediaRow | null> {
  await prisma.$transaction(async (tx) => {
    await tx.media.updateMany({
      where: { mediableType: parentType, mediableId: parentId, isPrimary: true },
      data: { isPrimary: false },
    });
    const updated = await tx.media.update({
      where: { id: mediaId },
      data: { isPrimary: true },
    });
    return serializeMedia(updated);
  });
  return null;
}

export async function reorderMedia(
  parentType: "car" | "part",
  parentId: bigint,
  orderedIds: bigint[],
): Promise<MediaRow[]> {
  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.media.update({
        where: { id: orderedIds[i] },
        data: { order: i, isPrimary: i === 0 },
      });
    }
  });
  return getMediaByParent(parentType, parentId);
}

export async function deleteMediaRecord(mediaId: bigint): Promise<void> {
  await prisma.media.delete({ where: { id: mediaId } });
}

export async function deleteAllMediaForParent(
  parentType: "car" | "part",
  parentId: bigint,
): Promise<MediaRow[]> {
  const existing = await getMediaByParent(parentType, parentId);
  await prisma.media.deleteMany({ where: { mediableType: parentType, mediableId: parentId } });
  return existing;
}

export async function verifyParentExists(
  parentType: "car" | "part",
  parentId: bigint,
): Promise<boolean> {
  if (parentType === "car") {
    const car = await prisma.car.findUnique({ where: { id: parentId }, select: { id: true } });
    return !!car;
  }
  const part = await prisma.parts.findUnique({ where: { id: parentId }, select: { id: true } });
  return !!part;
}

export async function verifyMediaBelongsToParent(
  mediaId: bigint,
  parentType: "car" | "part",
  parentId: bigint,
): Promise<boolean> {
  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    select: { mediableType: true, mediableId: true },
  });
  return media?.mediableType === parentType && media?.mediableId === parentId;
}

export async function promoteNextPrimary(
  parentType: "car" | "part",
  parentId: bigint,
): Promise<void> {
  const next = await prisma.media.findFirst({
    where: { mediableType: parentType, mediableId: parentId, isPrimary: false },
    orderBy: { order: "asc" },
  });
  if (next) {
    await prisma.media.update({
      where: { id: next.id },
      data: { isPrimary: true },
    });
  }
}

export function extractKeyParts(filePath: string): MediaKeyParts | null {
  const match = filePath.match(/^(car|part)\/(\d+)\/[^/]+\.(jpg|png|webp)$/i);
  if (!match) return null;
  return { mediableType: match[1] as "car" | "part", mediableId: BigInt(match[2]) };
}
