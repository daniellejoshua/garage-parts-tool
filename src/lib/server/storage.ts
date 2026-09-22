

import { S3Client } from "@aws-sdk/client-s3";

function getEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export interface StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

function buildConfig(): StorageConfig {
  const endpoint = getEnv("S3_ENDPOINT", getEnv("MINIO_ENDPOINT"));
  const region = getEnv("S3_REGION", getEnv("MINIO_REGION"));
  const bucket = getEnv("S3_BUCKET", getEnv("MINIO_BUCKET"));
  const accessKeyId = getEnv("S3_ACCESS_KEY_ID", getEnv("MINIO_ROOT_USER"));
  const secretAccessKey = getEnv("S3_SECRET_ACCESS_KEY", getEnv("MINIO_ROOT_PASSWORD"));
  const forcePathStyle = (getEnv("S3_FORCE_PATH_STYLE", getEnv("MINIO_FORCE_PATH_STYLE"))).toLowerCase() === "true";

  return { endpoint, region, bucket, accessKeyId, secretAccessKey, forcePathStyle };
}

let cachedConfig: StorageConfig | null = null;
let cachedClient: S3Client | null = null;

export function getStorageConfig(): StorageConfig {
  if (!cachedConfig) {
    cachedConfig = buildConfig();
  }
  return cachedConfig;
}

export function getS3Client(): S3Client {
  if (!cachedClient) {
    const config = getStorageConfig();
    cachedClient = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle,
    });
  }
  return cachedClient;
}

export function getBucket(): string {
  return getStorageConfig().bucket;
}

export function resetStorageClient(): void {
  cachedClient = null;
  cachedConfig = null;
}