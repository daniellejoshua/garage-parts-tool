"use server";

import { revalidatePath } from "next/cache";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

import { getS3Client, getBucket } from "@/lib/server/storage";
import {
  uploadMediaSchema,
  setPrimaryMediaSchema,
  reorderMediaSchema,
  deleteMediaSchema,
  type UploadMediaInput,
  type SetPrimaryMediaInput,
  type ReorderMediaInput,
  type DeleteMediaInput,
} from "@/lib/validations/media";
import {
  validateImageFile,
  generateObjectKey,
  uuidv4,
  type ValidatedFile,
  type MediaKeyParts,
} from "@/lib/server/media-utils";
import {
  serializeMedia,
  getMediaByParent,
  countMediaByParent,
  getPrimaryMedia,
  createMediaRecords,
  setPrimaryMedia,
  reorderMedia,
  deleteMediaRecord,
  deleteAllMediaForParent,
  verifyParentExists,
  verifyMediaBelongsToParent,
  promoteNextPrimary,
  extractKeyParts,
} from "@/lib/server/media-queries";
import { carListingsPath, carViewPath } from "@/lib/car-routes";
import { partListingsPath, partViewPath } from "@/lib/part-routes";
import type { MediaRow } from "@/lib/server/media-queries";

export type MediaActionResult =
  | { ok: true; media: MediaRow[] }
  | { ok: true; media: MediaRow }
  | { ok: true; presignedUrl: string }
  | { ok: false; error: string; failedFiles?: string[]; partialMedia?: MediaRow[] };

function failure(error: string, failedFiles?: string[], partialMedia?: MediaRow[]): MediaActionResult {
  return { ok: false, error, failedFiles, partialMedia };
}

function listingsPathFor(parentType: "car" | "part", brandSlug: string, modelSlug: string): string {
  return parentType === "car"
    ? carListingsPath(brandSlug, modelSlug)
    : partListingsPath(brandSlug, modelSlug);
}

function viewPathFor(parentType: "car" | "part", brandSlug: string, modelSlug: string, id: string): string {
  return parentType === "car"
    ? carViewPath(brandSlug, modelSlug, id)
    : partViewPath(brandSlug, modelSlug, id);
}

function getRouteContext(parentType: "car" | "part"): { brandSlug: string; modelSlug: string } {
  return { brandSlug: "", modelSlug: "" };
}

async function uploadSingleFile(
  file: File,
  parentType: "car" | "part",
  parentId: bigint,
  caption: string | undefined,
): Promise<{ media: MediaRow | null; error: string | null }> {
  const client = getS3Client();
  const bucket = getBucket();

  let validated: ValidatedFile;
  try {
    validated = await validateImageFile(file);
  } catch (err) {
    return { media: null, error: err instanceof Error ? err.message : "Validation failed" };
  }

  const key = generateObjectKey(
    { mediableType: parentType, mediableId: parentId },
    uuidv4(),
    validated.extension,
  );

  try {
    const upload = new Upload({
      client,
      params: {
        Bucket: bucket,
        Key: key,
        Body: validated.buffer,
        ContentType: validated.mimeType,
      },
    });
    await upload.done();
  } catch (err) {
    return { media: null, error: `Upload failed: ${err instanceof Error ? err.message : "Unknown error"}` };
  }

  return { media: null, error: null };
}

export async function uploadMediaAction(
  input: UploadMediaInput,
  file: File,
  brandSlug: string,
  modelSlug: string,
): Promise<MediaActionResult> {
  const parsed = uploadMediaSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Invalid input: " + parsed.error.issues.map((e) => e.message).join(", "), [file.name]);
  }

  const { parentType, parentId: parentIdStr, caption } = parsed.data;
  const parentId = BigInt(parentIdStr);

  const parentExists = await verifyParentExists(parentType, parentId);
  if (!parentExists) {
    return failure("Parent listing not found", [file.name]);
  }

  const currentCount = await countMediaByParent(parentType, parentId);
  if (currentCount >= 20) {
    return failure(`Maximum ${20} images per listing reached`, [file.name]);
  }

  const existingPrimary = await getPrimaryMedia(parentType, parentId);
  const isFirstImage = currentCount === 0;

  const validated = await validateImageFile(file);
  const client = getS3Client();
  const bucket = getBucket();
  const key = generateObjectKey({ mediableType: parentType, mediableId: parentId }, uuidv4(), validated.extension);

  try {
    const upload = new Upload({
      client,
      params: { Bucket: bucket, Key: key, Body: validated.buffer, ContentType: validated.mimeType },
    });
    await upload.done();
  } catch (err) {
    return failure(`Upload failed: ${err instanceof Error ? err.message : "Unknown error"}`, [file.name]);
  }

  let createdMedia: MediaRow[] = [];
  try {
    createdMedia = await createMediaRecords([
      {
        mediableType: parentType,
        mediableId: parentId,
        filePath: key,
        fileName: file.name,
        mimeType: validated.mimeType,
        sizeBytes: BigInt(validated.size),
        type: "image",
        isPrimary: isFirstImage,
        order: currentCount,
        caption: caption ?? null,
      },
    ]);
  } catch (err) {
    try {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    } catch {}
    return failure(`Database record creation failed, upload cleaned up: ${err instanceof Error ? err.message : "Unknown error"}`, [file.name]);
  }

  const media = createdMedia[0];
  revalidatePath(listingsPathFor(parentType, brandSlug, modelSlug));
  revalidatePath(viewPathFor(parentType, brandSlug, modelSlug, parentIdStr));

  return { ok: true, media };
}

export async function getMediaAction(
  parentType: "car" | "part",
  parentId: string,
): Promise<MediaActionResult> {
  const id = BigInt(parentId);
  const media = await getMediaByParent(parentType, id);
  return { ok: true, media };
}

export async function getPresignedUrlAction(
  parentType: "car" | "part",
  mediaId: string,
): Promise<MediaActionResult> {
  const media = await getMediaById(mediaId);
  if (!media) return failure("Media not found");
  if (media.mediableType !== parentType) return failure("Media does not belong to this parent type");

  const client = getS3Client();
  const bucket = getBucket();
  const command = new GetObjectCommand({ Bucket: bucket, Key: media.filePath! });

  try {
    const url = await getSignedUrl(client, command, { expiresIn: 300 });
    return { ok: true, presignedUrl: url };
  } catch (err) {
    return failure(`Failed to generate presigned URL: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}

export async function setPrimaryMediaAction(
  input: SetPrimaryMediaInput,
  brandSlug: string,
  modelSlug: string,
): Promise<MediaActionResult> {
  const parsed = setPrimaryMediaSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Invalid input: " + parsed.error.issues.map((e) => e.message).join(", "));
  }

  const { parentType, parentId: parentIdStr, mediaId: mediaIdStr } = parsed.data;
  const parentId = BigInt(parentIdStr);
  const mediaId = BigInt(mediaIdStr);

  const belongs = await verifyMediaBelongsToParent(mediaId, parentType, parentId);
  if (!belongs) return failure("Media not found for this listing");

  try {
    await setPrimaryMedia(parentType, parentId, mediaId);
  } catch (err) {
    return failure(`Failed to set primary image: ${err instanceof Error ? err.message : "Unknown error"}`);
  }

  revalidatePath(listingsPathFor(parentType, brandSlug, modelSlug));
  revalidatePath(viewPathFor(parentType, brandSlug, modelSlug, parentIdStr));

  const updatedMedia = await getMediaByParent(parentType, parentId);
  return { ok: true, media: updatedMedia };
}

export async function reorderMediaAction(
  input: ReorderMediaInput,
  brandSlug: string,
  modelSlug: string,
): Promise<MediaActionResult> {
  const parsed = reorderMediaSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Invalid input: " + parsed.error.issues.map((e) => e.message).join(", "));
  }

  const { parentType, parentId: parentIdStr, orderedMediaIds } = parsed.data;
  const parentId = BigInt(parentIdStr);
  const ids = orderedMediaIds.map((id) => BigInt(id));

  for (const id of ids) {
    const belongs = await verifyMediaBelongsToParent(id, parentType, parentId);
    if (!belongs) return failure(`Media ${id} does not belong to this listing`);
  }

  try {
    await reorderMedia(parentType, parentId, ids);
  } catch (err) {
    return failure(`Failed to reorder images: ${err instanceof Error ? err.message : "Unknown error"}`);
  }

  revalidatePath(listingsPathFor(parentType, brandSlug, modelSlug));
  revalidatePath(viewPathFor(parentType, brandSlug, modelSlug, parentIdStr));

  const updatedMedia = await getMediaByParent(parentType, parentId);
  return { ok: true, media: updatedMedia };
}

export async function deleteMediaAction(
  input: DeleteMediaInput,
  brandSlug: string,
  modelSlug: string,
): Promise<MediaActionResult> {
  const parsed = deleteMediaSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Invalid input: " + parsed.error.issues.map((e) => e.message).join(", "));
  }

  const { parentType, parentId: parentIdStr, mediaId: mediaIdStr } = parsed.data;
  const parentId = BigInt(parentIdStr);
  const mediaId = BigInt(mediaIdStr);

  const belongs = await verifyMediaBelongsToParent(mediaId, parentType, parentId);
  if (!belongs) return failure("Media not found for this listing");

  const media = await getMediaById(mediaIdStr);
  if (!media || !media.filePath) return failure("Media record missing object key");

  const client = getS3Client();
  const bucket = getBucket();

  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: media.filePath }));
  } catch (err) {
    return failure(`S3 object deletion failed; Media record retained for retry: ${err instanceof Error ? err.message : "Unknown error"}`);
  }

  try {
    await deleteMediaRecord(mediaId);
    const remaining = await getMediaByParent(parentType, parentId);
    const hasPrimary = remaining.some((m) => m.isPrimary);
    if (!hasPrimary && remaining.length > 0) {
      await promoteNextPrimary(parentType, parentId);
    }
  } catch (err) {
    return failure(`Media record deletion failed after S3 deletion: ${err instanceof Error ? err.message : "Unknown error"}`);
  }

  revalidatePath(listingsPathFor(parentType, brandSlug, modelSlug));
  revalidatePath(viewPathFor(parentType, brandSlug, modelSlug, parentIdStr));

  const updatedMedia = await getMediaByParent(parentType, parentId);
  return { ok: true, media: updatedMedia };
}

export async function deleteAllMediaForParentAction(
  parentType: "car" | "part",
  parentId: string,
  brandSlug: string,
  modelSlug: string,
): Promise<MediaActionResult> {
  const id = BigInt(parentId);
  const existing = await getMediaByParent(parentType, id);
  if (existing.length === 0) return { ok: true, media: [] };

  const client = getS3Client();
  const bucket = getBucket();
  const failedDeletions: string[] = [];

  for (const media of existing) {
    if (media.filePath) {
      try {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: media.filePath }));
      } catch (err) {
        failedDeletions.push(`${media.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }
  }

  if (failedDeletions.length > 0) {
    return failure(
      `Some S3 objects could not be deleted; Media records retained for retry: ${failedDeletions.join("; ")}`,
      [],
      existing,
    );
  }

  try {
    await deleteAllMediaForParent(parentType, id);
  } catch (err) {
    return failure(`Media records deletion failed after S3 cleanup: ${err instanceof Error ? err.message : "Unknown error"}`);
  }

  revalidatePath(listingsPathFor(parentType, brandSlug, modelSlug));
  revalidatePath(viewPathFor(parentType, brandSlug, modelSlug, parentId));

  return { ok: true, media: [] };
}

export async function getMediaById(rawId: string): Promise<MediaRow | null> {
  return import("@/lib/server/media-queries").then((m) => m.getMediaById(rawId));
}

export const sortMediaAction = reorderMediaAction;