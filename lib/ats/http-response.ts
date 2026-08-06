import "server-only";

import { apiError, apiOk } from "@/lib/api/response";
import { isAtsError } from "@/lib/ats/errors";
import { CredentialEncryptionError } from "@/lib/ats/encryption";

/** Success helper — thin alias so ATS routes share the same envelope module. */
export function atsJson(data: unknown, status = 200) {
  return apiOk(data, status);
}

function statusForAtsCode(code: string, httpStatus?: number): number {
  if (httpStatus) return httpStatus;
  switch (code) {
    case "authentication":
      return 401;
    case "permission":
      return 403;
    case "not_found":
      return 404;
    case "validation":
    case "configuration":
      return 400;
    case "rate_limit":
      return 429;
    default:
      return 502;
  }
}

/**
 * Flat ATS errors (R-021): `error` is the message string; `code` / `retryable`
 * and provider metadata sit alongside (not nested under `error`).
 */
export function atsErrorResponse(error: unknown) {
  if (isAtsError(error)) {
    return apiError(error.message, {
      status: statusForAtsCode(error.code, error.httpStatus),
      code: error.code,
      retryable: error.retryable,
      details: {
        provider: error.provider,
        ...(error.providerRequestId
          ? { providerRequestId: error.providerRequestId }
          : {}),
        ...(error.httpStatus ? { httpStatus: error.httpStatus } : {}),
      },
    });
  }

  if (error instanceof CredentialEncryptionError) {
    return apiError(error.message, {
      status: 500,
      code: "configuration",
      retryable: false,
    });
  }

  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as { status: number }).status) || 500;
    const message =
      error instanceof Error ? error.message : "Request failed.";
    return apiError(message, { status, retryable: false });
  }

  console.error("[ats] unexpected error", error instanceof Error ? error.name : "unknown");
  return apiError("Unexpected ATS error.", { status: 500, retryable: true });
}
