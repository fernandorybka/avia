import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ENCRYPTED_PREFIX = "enc:v1:";
const KEY_ENV_NAME = "FIELD_VALUE_ENCRYPTION_KEY";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

let cachedKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (cachedKey) {
    return cachedKey;
  }

  const encodedKey = process.env[KEY_ENV_NAME];
  if (!encodedKey) {
    throw new Error(`${KEY_ENV_NAME} is not set`);
  }

  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32) {
    throw new Error(`${KEY_ENV_NAME} must be a base64-encoded 32-byte key`);
  }

  cachedKey = key;
  return key;
}

export function isEncryptedFieldValue(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX);
}

export function encryptFieldValue(value: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, authTag, encrypted]).toString("base64url");

  return `${ENCRYPTED_PREFIX}${payload}`;
}

export function decryptFieldValue(value: string): string {
  if (!isEncryptedFieldValue(value)) {
    return value;
  }

  const payload = value.slice(ENCRYPTED_PREFIX.length);

  try {
    const raw = Buffer.from(payload, "base64url");
    if (raw.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error("Invalid encrypted payload");
    }

    const iv = raw.subarray(0, IV_LENGTH);
    const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("Failed to decrypt field value");
  }
}
