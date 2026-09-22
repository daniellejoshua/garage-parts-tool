

import { Readable } from "stream";

export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_IMAGES_PER_LISTING = 20;
export const MIN_DIMENSIONS = { width: 400, height: 300 };
export const MAX_DIMENSIONS = { width: 4000, height: 4000 };

export const MIME_TO_EXT: Record<AllowedMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAGIC_BYTES: Record<AllowedMimeType, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF header, need to check WEBP at offset 8
};

export interface ValidatedFile {
  buffer: Buffer;
  mimeType: AllowedMimeType;
  extension: string;
  width: number;
  height: number;
  size: number;
}

export interface MediaKeyParts {
  mediableType: "car" | "part";
  mediableId: bigint;
}

export function generateObjectKey(parts: MediaKeyParts, uuid: string, extension: string): string {
  return `${parts.mediableType}/${parts.mediableId}/${uuid}.${extension}`;
}

export function parseObjectKey(key: string): MediaKeyParts | null {
  const match = key.match(/^(car|part)\/(\d+)\/[^/]+\.(jpg|png|webp)$/i);
  if (!match) return null;
  return {
    mediableType: match[1] as "car" | "part",
    mediableId: BigInt(match[2]),
  };
}

export async function validateImageFile(file: File): Promise<ValidatedFile> {
  if (!ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) {
    throw new Error(`Unsupported file type: ${file.type}. Allowed: JPEG, PNG, WebP.`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${file.size} bytes (max ${MAX_FILE_SIZE}).`);
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const detectedMime = detectMimeType(buffer);
  if (!detectedMime || !ALLOWED_MIME_TYPES.includes(detectedMime)) {
    throw new Error("File content does not match a supported image format.");
  }

  if (detectedMime !== file.type) {
    throw new Error(`File type mismatch: declared ${file.type}, detected ${detectedMime}.`);
  }

  const { width, height } = await getImageDimensions(buffer, detectedMime);
  if (width < MIN_DIMENSIONS.width || height < MIN_DIMENSIONS.height) {
    throw new Error(`Image too small: ${width}x${height} (min ${MIN_DIMENSIONS.width}x${MIN_DIMENSIONS.height}).`);
  }
  if (width > MAX_DIMENSIONS.width || height > MAX_DIMENSIONS.height) {
    throw new Error(`Image too large: ${width}x${height} (max ${MAX_DIMENSIONS.width}x${MAX_DIMENSIONS.height}).`);
  }

  return {
    buffer,
    mimeType: detectedMime,
    extension: MIME_TO_EXT[detectedMime],
    width,
    height,
    size: buffer.length,
  };
}

function detectMimeType(buffer: Buffer): AllowedMimeType | null {
  if (buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer.length >= 12 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

async function getImageDimensions(buffer: Buffer, mimeType: AllowedMimeType): Promise<{ width: number; height: number }> {
  if (mimeType === "image/jpeg") {
    return getJpegDimensions(buffer);
  }
  if (mimeType === "image/png") {
    return getPngDimensions(buffer);
  }
  if (mimeType === "image/webp") {
    return getWebpDimensions(buffer);
  }
  throw new Error(`Unsupported MIME type for dimension parsing: ${mimeType}`);
}

function getJpegDimensions(buffer: Buffer): { width: number; height: number } {
  let offset = 2;
  while (offset < buffer.length - 1) {
    if (buffer[offset] !== 0xff) {
      throw new Error("Invalid JPEG marker");
    }
    const marker = buffer[offset + 1];
    if (marker === 0xd8) {
      offset += 2;
      continue;
    }
    if (marker === 0xd9) break;
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return { width, height };
    }
    offset += 2 + length;
  }
  throw new Error("JPEG dimensions not found");
}

function getPngDimensions(buffer: Buffer): { width: number; height: number } {
  if (buffer.length < 24) throw new Error("PNG too small");
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

function getWebpDimensions(buffer: Buffer): { width: number; height: number } {
  if (buffer.length < 30) throw new Error("WebP too small");
  if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38) {
    const isLossless = buffer[15] === 0x4c;
    let offset = 16;
    if (!isLossless) {
      if (buffer.length < offset + 10) throw new Error("WebP VP8 header too small");
      const startCode = buffer.readUInt32LE(offset);
      if (startCode !== 0x9d012a) throw new Error("Invalid WebP VP8 start code");
      offset += 3;
    }
    const width = buffer.readUInt16LE(offset + 6) & 0x3fff;
    const height = buffer.readUInt16LE(offset + 8) & 0x3fff;
    return { width, height };
  }
  if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x58) {
    if (buffer.length < 24) throw new Error("WebP extended header too small");
    const width = buffer.readUInt32LE(20);
    const height = buffer.readUInt32LE(24);
    return { width, height };
  }
  throw new Error("Unsupported WebP format");
}

export function uuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function streamToBuffer(readable: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}