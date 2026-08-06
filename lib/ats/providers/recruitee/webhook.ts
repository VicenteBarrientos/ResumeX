import { createHmac, timingSafeEqual } from "crypto";

/**
 * Recruitee webhook signature:
 * X-Recruitee-Signature = HMAC-SHA256(rawBody, webhookSecret) as hex
 * (per Recruitee webhook docs).
 */
export function verifyRecruiteeSignature(input: {
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
