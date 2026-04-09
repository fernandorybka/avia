import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const STORAGE_PREFIX = "r2:";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function getR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: getRequiredEnv("R2_ENDPOINT"),
    credentials: {
      accessKeyId: getRequiredEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: getRequiredEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

function getBucketName(): string {
  return getRequiredEnv("R2_BUCKET_NAME");
}

function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

export function makeR2Pointer(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

export function isR2Pointer(storageUrl: string | null | undefined): storageUrl is string {
  return typeof storageUrl === "string" && storageUrl.startsWith(STORAGE_PREFIX);
}

export function getR2KeyFromPointer(pointer: string): string {
  if (!isR2Pointer(pointer)) {
    throw new Error("Invalid R2 pointer format in storageUrl");
  }

  const key = pointer.slice(STORAGE_PREFIX.length);
  if (!key) {
    throw new Error("Empty R2 key in storageUrl");
  }

  return key;
}

export async function uploadTemplateToR2(params: {
  userId: string;
  slug: string;
  originalFilename: string;
  buffer: Buffer;
  contentType?: string;
}): Promise<string> {
  const client = getR2Client();
  const bucket = getBucketName();
  const cleanName = sanitizeFilename(params.originalFilename || "template.docx");
  const key = `templates/${params.userId}/${params.slug}-${randomUUID()}-${cleanName}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: params.buffer,
      ContentType:
        params.contentType ??
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    })
  );

  return key;
}

export async function getTemplateBufferFromR2(key: string): Promise<Buffer> {
  const client = getR2Client();
  const bucket = getBucketName();

  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );

  const body = response.Body;
  if (!body || !("transformToByteArray" in body) || typeof body.transformToByteArray !== "function") {
    throw new Error("Could not read object body from R2");
  }

  const bytes = await body.transformToByteArray();
  return Buffer.from(bytes);
}

export async function deleteTemplateFromR2(key: string): Promise<void> {
  const client = getR2Client();
  const bucket = getBucketName();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}
