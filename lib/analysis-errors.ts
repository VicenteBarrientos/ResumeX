import {
  APIConnectionTimeoutError,
  APIError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
} from "openai";

export class AnalysisError extends Error {
  readonly code: string;
  readonly status: number;
  readonly cause?: unknown;

  constructor(
    message: string,
    code: string,
    status = 500,
    cause?: unknown,
  ) {
    super(message);
    this.name = "AnalysisError";
    this.code = code;
    this.status = status;
    this.cause = cause;
  }
}

function getUnderlyingMessage(error: unknown): string {
  if (error instanceof APIError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function normalizeAnalysisError(error: unknown): AnalysisError {
  if (error instanceof AnalysisError) {
    return error;
  }

  if (error instanceof SyntaxError) {
    return new AnalysisError(
      "Analysis response could not be parsed. Please try again.",
      "JSON_PARSE_FAILED",
      502,
      error,
    );
  }

  if (error instanceof APIConnectionTimeoutError) {
    return new AnalysisError(
      "The analysis request timed out. Please try again.",
      "OPENAI_TIMEOUT",
      504,
      error,
    );
  }

  if (error instanceof AuthenticationError) {
    return new AnalysisError(
      "Invalid OpenAI API key. Check your server configuration.",
      "INVALID_API_KEY",
      401,
      error,
    );
  }

  if (error instanceof RateLimitError) {
    const code = error.code;
    const message = error.message.toLowerCase();
    const isQuota =
      code === "insufficient_quota" || message.includes("insufficient_quota");

    return new AnalysisError(
      isQuota
        ? "OpenAI API quota exceeded. Check your billing or usage limits."
        : "OpenAI rate limit exceeded. Please wait and try again.",
      isQuota ? "INSUFFICIENT_QUOTA" : "RATE_LIMIT",
      429,
      error,
    );
  }

  if (error instanceof NotFoundError) {
    const message = error.message.toLowerCase();
    const isModel =
      error.code === "model_not_found" || message.includes("model");

    return new AnalysisError(
      isModel
        ? "The configured OpenAI model was not found."
        : "An OpenAI resource was not found.",
      isModel ? "MODEL_NOT_FOUND" : "NOT_FOUND",
      404,
      error,
    );
  }

  if (error instanceof APIError) {
    return new AnalysisError(
      "OpenAI returned an error. Please try again.",
      "OPENAI_API_ERROR",
      error.status ?? 502,
      error,
    );
  }

  if (error instanceof Error) {
    if (error.message === "NO_ANALYSIS") {
      return new AnalysisError(
        "No analysis was returned. Please try again.",
        "NO_ANALYSIS",
        502,
        error,
      );
    }

    if (error.message === "MALFORMED_ANALYSIS") {
      return new AnalysisError(
        "Analysis response was malformed. Please try again.",
        "MALFORMED_ANALYSIS",
        502,
        error,
      );
    }

    return new AnalysisError(
      "Failed to analyze resume. Please try again.",
      "UNKNOWN",
      500,
      error,
    );
  }

  return new AnalysisError(
    "Failed to analyze resume. Please try again.",
    "UNKNOWN",
    500,
    error,
  );
}

export function getClientErrorMessage(
  error: AnalysisError,
  isDev: boolean,
): string {
  if (isDev) {
    return getUnderlyingMessage(error.cause ?? error);
  }

  return error.message;
}

export function logAnalysisError(error: unknown): void {
  const normalized = normalizeAnalysisError(error);

  console.error("Analysis failed:", {
    code: normalized.code,
    status: normalized.status,
    message: normalized.message,
    detail: getUnderlyingMessage(normalized.cause ?? normalized),
    error: normalized.cause ?? error,
  });

  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
}
