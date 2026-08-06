import { createHmac, timingSafeEqual } from "crypto";

/**
 * Ashby webhook signature header:
 * Ashby-Signature: sha256={digest}
 * HMAC-SHA256 over the raw request body.
 */
export function verifyAshbySignature(input: {
  rawBody: string | Buffer;
  signatureHeader: string | null;
  secret: string;
}): boolean {
  if (!input.signatureHeader || !input.secret) return false;
  const raw = typeof input.rawBody === "string" ? input.rawBody : input.rawBody.toString("utf8");
  const expected = createHmac("sha256", input.secret).update(raw, "utf8").digest("hex");
  const provided = input.signatureHeader.trim().replace(/^sha256=/i, "");
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(provided, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
