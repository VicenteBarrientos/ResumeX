import { createHash } from "crypto";

export const ATS_TRANSFER_OPERATION_VERSION = "ats-transfer-v1";

/**
 * Local idempotency key for ATS transfers.
 * Providers rarely offer a shared idempotency mechanism.
 */
export function buildAtsTransferIdempotencyKey(input: {
  connectionId: string;
  localCandidateKey: string;
  externalJobId: string;
  version?: string;
}): string {
  const material = [
    input.connectionId,
    input.localCandidateKey,
    input.externalJobId,
    input.version ?? ATS_TRANSFER_OPERATION_VERSION,
  ].join("|");
  return createHash("sha256").update(material, "utf8").digest("hex");
}
