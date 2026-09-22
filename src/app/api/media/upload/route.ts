import { NextRequest, NextResponse } from "next/server";
import { Upload } from "@aws-sdk/lib-storage";
import { getS3Client, getBucket } from "@/lib/server/storage";
import { validateImageFile, generateObjectKey, uuidv4 } from "@/lib/server/media-utils";
import { verifyParentExists, countMediaByParent, createMediaRecords, getPrimaryMedia } from "@/lib/server/media-queries";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const parentType = formData.get("parentType") as "car" | "part" | null;
    const parentId = formData.get("parentId") as string | null;
    const brandSlug = formData.get("brandSlug") as string | null;
    const modelSlug = formData.get("modelSlug") as string | null;
    const caption = formData.get("caption") as string | null;

    if (!file || !parentType || !parentId || !brandSlug || !modelSlug) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    const parentIdBigInt = BigInt(parentId);

    const parentExists = await verifyParentExists(parentType, parentIdBigInt);
    if (!parentExists) {
      return NextResponse.json({ ok: false, error: "Parent listing not found" }, { status: 404 });
    }

    const currentCount = await countMediaByParent(parentType, parentIdBigInt);
    if (currentCount >= 20) {
      return NextResponse.json({ ok: false, error: "Maximum 20 images per listing reached" }, { status: 400 });
    }

    const existingPrimary = await getPrimaryMedia(parentType, parentIdBigInt);
    const isFirstImage = currentCount === 0;

    let validated;
    try {
      validated = await validateImageFile(file);
    } catch (err) {
      return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Validation failed" }, { status: 400 });
    }

    const client = getS3Client();
    const bucket = getBucket();
    const key = generateObjectKey({ mediableType: parentType, mediableId: parentIdBigInt }, uuidv4(), validated.extension);

    try {
      const upload = new Upload({
        client,
        params: { Bucket: bucket, Key: key, Body: validated.buffer, ContentType: validated.mimeType },
      });
      await upload.done();
    } catch (err) {
      return NextResponse.json({ ok: false, error: `Upload failed: ${err instanceof Error ? err.message : "Unknown error"}` }, { status: 500 });
    }

    let createdMedia;
    try {
      createdMedia = await createMediaRecords([
        {
          mediableType: parentType,
          mediableId: parentIdBigInt,
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
      return NextResponse.json({ ok: false, error: `Database record creation failed: ${err instanceof Error ? err.message : "Unknown error"}` }, { status: 500 });
    }

    const media = createdMedia[0];
    return NextResponse.json({ ok: true, media });
  } catch (err) {
    console.error("Media upload error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

import { DeleteObjectCommand } from "@aws-sdk/client-s3";