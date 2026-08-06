import "server-only";

import { NextResponse } from "next/server";
import { isAtsError } from "@/lib/ats/errors";
import { CredentialEncryptionError } from "@/lib/ats/encryption";

export function atsJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function atsErrorResponse(error: unknown) {
  if (isAtsError(error)) {
    const status =
      error.httpStatus ||
      (error.code === "authentication"
        ? 401
        : error.code === "permission"
          ? 403
          : error.code === "not_found"
            ? 404
            : error.code === "validation" || error.code === "configuration"
              ? 400
              : error.code === "rate_limit"
                ? 429
                : 502);
    return NextResponse.json({ error: error.toSafeJSON() }, { status });
  }

  if (error instanceof CredentialEncryptionError) {
    return NextResponse.json(
      {
        error: {
          code: "configuration",
          message: error.message,
          retryable: false,
        },
      },
      { status: 500 }
    );
  }

  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as { status: number }).status) || 500;
    const message =
      error instanceof Error ? error.message : "Request failed.";
    return NextResponse.json({ error: { message, retryable: false } }, { status });
  }

  console.error("[ats] unexpected error", error instanceof Error ? error.name : "unknown");
  return NextResponse.json(
    { error: { message: "Unexpected ATS error.", retryable: true } },
    { status: 500 }
  );
}
