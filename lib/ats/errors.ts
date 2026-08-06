import type { AtsProvider } from "@/lib/ats/types";

export type AtsErrorCode =
  | "authentication"
  | "permission"
  | "rate_limit"
  | "validation"
  | "conflict"
  | "not_found"
  | "transient"
  | "configuration"
  | "unsupported";

export type AtsSafeErrorFields = {
  provider: AtsProvider;
  code: AtsErrorCode;
  message: string;
  retryable: boolean;
  httpStatus?: number;
  providerRequestId?: string;
};

export class AtsError extends Error {
  readonly provider: AtsProvider;
  readonly code: AtsErrorCode;
  readonly retryable: boolean;
  readonly httpStatus?: number;
  readonly providerRequestId?: string;

  constructor(fields: AtsSafeErrorFields) {
    super(fields.message);
    this.name = "AtsError";
    this.provider = fields.provider;
    this.code = fields.code;
    this.retryable = fields.retryable;
    this.httpStatus = fields.httpStatus;
    this.providerRequestId = fields.providerRequestId;
  }

  toSafeJSON() {
    return {
      provider: this.provider,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      httpStatus: this.httpStatus,
      providerRequestId: this.providerRequestId,
    };
  }
}

export class AtsAuthenticationError extends AtsError {
  constructor(
    provider: AtsProvider,
    message = "Authentication failed. Reconnect the ATS account.",
    extras: Partial<AtsSafeErrorFields> = {}
  ) {
    super({
      provider,
      code: "authentication",
      message,
      retryable: false,
      ...extras,
    });
    this.name = "AtsAuthenticationError";
  }
}

export class AtsPermissionError extends AtsError {
  constructor(
    provider: AtsProvider,
    message = "Missing required ATS permission.",
    extras: Partial<AtsSafeErrorFields> = {}
  ) {
    super({
      provider,
      code: "permission",
      message,
      retryable: false,
      ...extras,
    });
    this.name = "AtsPermissionError";
  }
}

export class AtsRateLimitError extends AtsError {
  constructor(
    provider: AtsProvider,
    message = "ATS rate limit reached. Try again shortly.",
    extras: Partial<AtsSafeErrorFields> = {}
  ) {
    super({
      provider,
      code: "rate_limit",
      message,
      retryable: true,
      ...extras,
    });
    this.name = "AtsRateLimitError";
  }
}

export class AtsValidationError extends AtsError {
  constructor(
    provider: AtsProvider,
    message: string,
    extras: Partial<AtsSafeErrorFields> = {}
  ) {
    super({
      provider,
      code: "validation",
      message,
      retryable: false,
      ...extras,
    });
    this.name = "AtsValidationError";
  }
}

export class AtsConflictError extends AtsError {
  constructor(
    provider: AtsProvider,
    message: string,
    extras: Partial<AtsSafeErrorFields> = {}
  ) {
    super({
      provider,
      code: "conflict",
      message,
      retryable: false,
      ...extras,
    });
    this.name = "AtsConflictError";
  }
}

export class AtsNotFoundError extends AtsError {
  constructor(
    provider: AtsProvider,
    message: string,
    extras: Partial<AtsSafeErrorFields> = {}
  ) {
    super({
      provider,
      code: "not_found",
      message,
      retryable: false,
      ...extras,
    });
    this.name = "AtsNotFoundError";
  }
}

export class AtsTransientError extends AtsError {
  constructor(
    provider: AtsProvider,
    message = "Temporary ATS failure. Retry shortly.",
    extras: Partial<AtsSafeErrorFields> = {}
  ) {
    super({
      provider,
      code: "transient",
      message,
      retryable: true,
      ...extras,
    });
    this.name = "AtsTransientError";
  }
}

export class AtsConfigurationError extends AtsError {
  constructor(
    provider: AtsProvider,
    message: string,
    extras: Partial<AtsSafeErrorFields> = {}
  ) {
    super({
      provider,
      code: "configuration",
      message,
      retryable: false,
      ...extras,
    });
    this.name = "AtsConfigurationError";
  }
}

export function isAtsError(error: unknown): error is AtsError {
  return error instanceof AtsError;
}

/** Map common HTTP status codes to safe ATS errors. Never includes response bodies. */
export function errorFromHttpStatus(
  provider: AtsProvider,
  status: number,
  providerRequestId?: string
): AtsError {
  const extras = { httpStatus: status, providerRequestId };
  if (status === 401) return new AtsAuthenticationError(provider, undefined, extras);
  if (status === 403) return new AtsPermissionError(provider, undefined, extras);
  if (status === 404) return new AtsNotFoundError(provider, "Resource not found in ATS.", extras);
  if (status === 409) return new AtsConflictError(provider, "Conflict with existing ATS record.", extras);
  if (status === 422) {
    return new AtsValidationError(provider, "ATS rejected the request as invalid.", extras);
  }
  if (status === 429) return new AtsRateLimitError(provider, undefined, extras);
  if (status >= 500) return new AtsTransientError(provider, undefined, extras);
  return new AtsTransientError(provider, `Unexpected ATS response (${status}).`, extras);
}
