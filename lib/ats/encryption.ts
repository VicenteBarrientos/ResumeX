import "server-only";

import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "crypto";

/**
 * AES-256-GCM encryption for ATS credentials at rest.
 *
 * Packed format (base64 of UTF-8 JSON wrapper is NOT used — binary packing):
 *   version (1 byte) | iv (12 bytes) | authTag (16 bytes) | ciphertext
 * Then base64url-encoded for DB storage.
 *
 * Env:
 *   ATS_CREDENTIAL_ENCRYPTION_KEY — 32-byte key, base64
 *   ATS_CREDENTIAL_ENCRYPTION_KEY_VERSION — integer, default 1
 */

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export class CredentialEncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CredentialEncryptionError";
  }
}

function decodeKey(raw: string): Buffer {
  let key: Buffer;
  try {
    key = Buffer.from(raw, "base64");
  } catch {
    throw new CredentialEncryptionError("ATS_CREDENTIAL_ENCRYPTION_KEY is not valid base64.");
  }
  if (key.length !== KEY_LENGTH) {
    throw new CredentialEncryptionError(
      `ATS_CREDENTIAL_ENCRYPTION_KEY must decode to ${KEY_LENGTH} bytes.`
    );
  }
  return key;
}

function getActiveKey(): { key: Buffer; version: number } {
  const raw = process.env.ATS_CREDENTIAL_ENCRYPTION_KEY;
  if (!raw) {
    throw new CredentialEncryptionError(
      "ATS_CREDENTIAL_ENCRYPTION_KEY is not configured."
    );
  }
  const version = Number(process.env.ATS_CREDENTIAL_ENCRYPTION_KEY_VERSION || "1");
  if (!Number.isInteger(version) || version < 1) {
    throw new CredentialEncryptionError(
      "ATS_CREDENTIAL_ENCRYPTION_KEY_VERSION must be a positive integer."
    );
  }
  return { key: decodeKey(raw), version };
}

/**
 * Encrypt an arbitrary JSON-serializable credential payload.
 * Fresh random IV per call. Never log the plaintext.
 */
export function encryptIntegrationCredential(payload: object): string {
  const { key, version } = getActiveKey();
  const iv = randomBytes(IV_LENGTH);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const packed = Buffer.concat([
    Buffer.from([version & 0xff]),
    iv,
    authTag,
    encrypted,
  ]);
  return packed.toString("base64url");
}

/**
 * Decrypt a credential blob. Safe-fails on invalid tags / corruption.
 * Designed for future key rotation via encryptionKeyVersion on the connection row;
 * currently uses the active env key (version byte is stored for migration).
 */
export function decryptIntegrationCredential<T>(ciphertext: string): T {
  if (!ciphertext || typeof ciphertext !== "string") {
    throw new CredentialEncryptionError("Missing encrypted credential.");
  }

  let packed: Buffer;
  try {
    packed = Buffer.from(ciphertext, "base64url");
  } catch {
    throw new CredentialEncryptionError("Encrypted credential is not valid base64url.");
  }

  if (packed.length < 1 + IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new CredentialEncryptionError("Encrypted credential is truncated.");
  }

  const version = packed[0];
  const iv = packed.subarray(1, 1 + IV_LENGTH);
  const authTag = packed.subarray(1 + IV_LENGTH, 1 + IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = packed.subarray(1 + IV_LENGTH + AUTH_TAG_LENGTH);

  const { key, version: activeVersion } = getActiveKey();
  // Future: look up historical keys by `version`. For now require match or accept any stored version with active key.
  if (version !== activeVersion && version !== (activeVersion & 0xff)) {
    // Soft allow: key material may rotate while version byte still decrypts with current key during transition.
    // Hard fail only when decrypt fails below.
  }

  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8")) as T;
  } catch {
    throw new CredentialEncryptionError(
      "Failed to decrypt credentials (invalid key or authentication tag)."
    );
  }
}

/** Constant-time compare for webhook signatures. */
export function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length || ba.length === 0) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export function safeEqualUtf8(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Generate a 32-byte key suitable for ATS_CREDENTIAL_ENCRYPTION_KEY (dev helper). */
export function generateAtsEncryptionKey(): string {
  return randomBytes(KEY_LENGTH).toString("base64");
}
