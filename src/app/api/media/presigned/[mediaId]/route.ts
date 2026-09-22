import { NextRequest, NextResponse } from "next/server";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client, getBucket } from "@/lib/server/storage";
import { getMediaById } from "@/lib/server/media-queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  try {
    const { mediaId } = await params;
    const media = await getMediaById(mediaId);
    if (!media || !media.filePath) {
      return NextResponse.json({ ok: false, error: "Media not found" }, { status: 404 });
    }

    const client = getS3Client();
    const bucket = getBucket();
    const command = new GetObjectCommand({ Bucket: bucket, Key: media.filePath });
    const url = await getSignedUrl(client, command, { expiresIn: 300 });

    return NextResponse.json({ ok: true, presignedUrl: url });
  } catch (err) {
    console.error("Presigned URL error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}