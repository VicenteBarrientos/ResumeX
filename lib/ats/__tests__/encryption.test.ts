import { createCipheriv, randomBytes } from "crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  decryptIntegrationCredential,
  encryptIntegrationCredential,
  generateAtsEncryptionKey,
  CredentialEncryptionError,
} from "../encryption";

describe("ATS credential encryption", () => {
  const originalKey = process.env.ATS_CREDENTIAL_ENCRYPTION_KEY;
  const originalVersion = process.env.ATS_CREDENTIAL_ENCRYPTION_KEY_VERSION;

  beforeEach(() => {
    process.env.ATS_CREDENTIAL_ENCRYPTION_KEY = generateAtsEncryptionKey();
    process.env.ATS_CREDENTIAL_ENCRYPTION_KEY_VERSION = "1";
  });

  afterEach(() => {
    process.env.ATS_CREDENTIAL_ENCRYPTION_KEY = originalKey;
    process.env.ATS_CREDENTIAL_ENCRYPTION_KEY_VERSION = originalVersion;
  });

  it("round-trips a credential payload", () => {
    const payload = { token: "secret-token-value", webhookSecret: "whsec" };
    const cipher = encryptIntegrationCredential(payload);
    expect(cipher).not.toContain("secret-token-value");
    const decoded = decryptIntegrationCredential<typeof payload>(cipher);
    expect(decoded).toEqual(payload);
  });

  it("uses a fresh IV each time", () => {
    const payload = { apiKey: "ashby-key" };
    const a = encryptIntegrationCredential(payload);
    const b = encryptIntegrationCredential(payload);
    expect(a).not.toBe(b);
  });

  it("fails safely on invalid authentication tag", () => {
    const cipher = encryptIntegrationCredential({ refreshToken: "rt" });
    const buf = Buffer.from(cipher, "base64url");
    // Flip a byte in the ciphertext region.
    buf[buf.length - 1] ^= 0xff;
    const tampered = buf.toString("base64url");
    expect(() => decryptIntegrationCredential(tampered)).toThrow(
      CredentialEncryptionError
    );
  });

  it("rejects wrong key length", () => {
    process.env.ATS_CREDENTIAL_ENCRYPTION_KEY = Buffer.from("short").toString("base64");
    expect(() => encryptIntegrationCredential({ token: "x" })).toThrow(
      /32 bytes/
    );
  });

  it("rejects forged ciphertext with wrong key", () => {
    const cipher = encryptIntegrationCredential({ token: "a" });
    process.env.ATS_CREDENTIAL_ENCRYPTION_KEY = generateAtsEncryptionKey();
    expect(() => decryptIntegrationCredential(cipher)).toThrow(
      CredentialEncryptionError
    );
  });

  it("rejects truncated payloads", () => {
    expect(() => decryptIntegrationCredential("YWJj")).toThrow(
      CredentialEncryptionError
    );
  });

  it("can decrypt a hand-packed blob with matching key", () => {
    const key = Buffer.from(process.env.ATS_CREDENTIAL_ENCRYPTION_KEY!, "base64");
    const iv = randomBytes(12);
    const plain = Buffer.from(JSON.stringify({ token: "hand" }), "utf8");
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
    const tag = cipher.getAuthTag();
    const packed = Buffer.concat([Buffer.from([1]), iv, tag, encrypted]).toString(
      "base64url"
    );
    expect(decryptIntegrationCredential<{ token: string }>(packed).token).toBe("hand");
  });
});
