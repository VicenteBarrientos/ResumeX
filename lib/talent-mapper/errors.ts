/**
 * Talent Mapper error normalization helpers.
 */

export type TalentMapperErrorCode =
  | "missing_openalex_key"
  | "invalid_openalex_key"
  | "openalex_quota"
  | "openalex_rate_limit"
  | "openalex_timeout"
  | "openalex_unavailable"
  | "openalex_aborted"
  | "PUBMED_NOT_CONFIGURED"
  | "PUBMED_RATE_LIMITED"
  | "PUBMED_TIMEOUT"
  | "PUBMED_INVALID_QUERY"
  | "PUBMED_INVALID_RESPONSE"
  | "PUBMED_UNAVAILABLE"
  | "PUBMED_ABORTED"
  | "no_queries"
  | "no_works"
  | "no_authors"
  | "openai_unavailable"
  | "invalid_ai_output"
  | "empty_job_description"
  | "criteria_too_broad"
  | "criteria_too_narrow"
  | "duplicate_query"
  | "empty_shortlist"
  | "validation"
  | "unknown"
  // Legacy aliases used by earlier drafts
  | "OPENALEX_MISSING_KEY"
  | "OPENALEX_INVALID_KEY"
  | "OPENALEX_QUOTA"
  | "OPENALEX_RATE_LIMIT"
  | "OPENALEX_TIMEOUT"
  | "OPENALEX_UNAVAILABLE"
  | "OPENALEX_ABORTED"
  | "NO_QUERIES"
  | "NO_WORKS"
  | "NO_AUTHORS"
  | "OPENAI_UNAVAILABLE"
  | "INVALID_AI_OUTPUT"
  | "EMPTY_JOB_DESCRIPTION"
  | "CRITERIA_TOO_BROAD"
  | "CRITERIA_TOO_NARROW"
  | "DUPLICATE_QUERY"
  | "EMPTY_SHORTLIST"
  | "VALIDATION"
  | "UNKNOWN";

const ACTIONS: Partial<Record<string, string>> = {
  missing_openalex_key:
    "Add OPENALEX_API_KEY to use live search, or continue with the demo snapshot.",
  invalid_openalex_key:
    "Check OPENALEX_API_KEY in your server configuration, or continue with the demo snapshot.",
  openalex_quota:
    "Check your OpenAlex plan or continue with the demo snapshot.",
  openalex_rate_limit:
    "Wait briefly and try again, or use the demo snapshot.",
  openalex_timeout:
    "Retry the search, or use the demo snapshot.",
  openalex_unavailable:
    "Retry shortly, or use the demo snapshot.",
  PUBMED_NOT_CONFIGURED:
    "Add NCBI_EMAIL (and optionally NCBI_API_KEY) for live PubMed, or continue with OpenAlex / demo snapshot.",
  PUBMED_RATE_LIMITED:
    "Wait briefly and retry PubMed, or continue with OpenAlex / demo snapshot.",
  PUBMED_TIMEOUT:
    "Retry the PubMed search, or continue with available sources.",
  no_queries:
    "Enable or add at least one search query before searching.",
  empty_job_description:
    "Paste a job description or load the scientific sourcing demo.",
  empty_shortlist:
    "Shortlist at least one potential researcher before exporting.",
  openai_unavailable:
    "Edit criteria manually and continue; AI extraction/outreach can retry later.",
  invalid_ai_output:
    "Edit criteria manually or try extraction again.",
};

export class TalentMapperError extends Error {
  readonly code: TalentMapperErrorCode;
  readonly status: number;
  readonly action: string;
  readonly cause?: unknown;

  constructor(
    message: string,
    code: TalentMapperErrorCode,
    status = 500,
    cause?: unknown,
    action?: string,
  ) {
    super(message);
    this.name = "TalentMapperError";
    this.code = canonicalizeCode(code);
    this.status = status;
    this.cause = cause;
    this.action =
      action ??
      ACTIONS[this.code] ??
      "Please try again or continue with the demo snapshot.";
  }
}

function canonicalizeCode(code: string): TalentMapperErrorCode {
  const map: Record<string, TalentMapperErrorCode> = {
    OPENALEX_MISSING_KEY: "missing_openalex_key",
    OPENALEX_INVALID_KEY: "invalid_openalex_key",
    OPENALEX_QUOTA: "openalex_quota",
    OPENALEX_RATE_LIMIT: "openalex_rate_limit",
    OPENALEX_TIMEOUT: "openalex_timeout",
    OPENALEX_UNAVAILABLE: "openalex_unavailable",
    OPENALEX_ABORTED: "openalex_aborted",
    NO_QUERIES: "no_queries",
    NO_WORKS: "no_works",
    NO_AUTHORS: "no_authors",
    OPENAI_UNAVAILABLE: "openai_unavailable",
    INVALID_AI_OUTPUT: "invalid_ai_output",
    EMPTY_JOB_DESCRIPTION: "empty_job_description",
    CRITERIA_TOO_BROAD: "criteria_too_broad",
    CRITERIA_TOO_NARROW: "criteria_too_narrow",
    DUPLICATE_QUERY: "duplicate_query",
    EMPTY_SHORTLIST: "empty_shortlist",
    VALIDATION: "validation",
    UNKNOWN: "unknown",
  };
  return (map[code] ?? code) as TalentMapperErrorCode;
}

/**
 * Map OpenAlex HTTP failures to friendly TalentMapperError instances.
 */
export function normalizeOpenAlexHttpError(
  status: number,
  bodyText = "",
): TalentMapperError {
  const lower = bodyText.toLowerCase();

  if (status === 401 || status === 403) {
    return new TalentMapperError(
      "Invalid OpenAlex API key. Check OPENALEX_API_KEY in your server configuration, or continue with the demo snapshot.",
      "invalid_openalex_key",
      401,
    );
  }

  if (status === 429) {
    const isQuota =
      lower.includes("quota") ||
      lower.includes("payment") ||
      lower.includes("credit");
    if (isQuota) {
      return new TalentMapperError(
        "OpenAlex API quota exhausted. Check your OpenAlex plan or continue with the demo snapshot.",
        "openalex_quota",
        429,
      );
    }
    return new TalentMapperError(
      "OpenAlex rate limit exceeded. Please wait and try again, or use the demo snapshot.",
      "openalex_rate_limit",
      429,
    );
  }

  if (status === 408 || status === 504) {
    return new TalentMapperError(
      "The OpenAlex request timed out. Please try again or use the demo snapshot.",
      "openalex_timeout",
      504,
    );
  }

  if (status >= 500) {
    return new TalentMapperError(
      "OpenAlex is temporarily unavailable. Please try again or use the demo snapshot.",
      "openalex_unavailable",
      503,
    );
  }

  return new TalentMapperError(
    "OpenAlex returned an unexpected error. Please try again or use the demo snapshot.",
    "openalex_unavailable",
    status >= 400 ? status : 502,
  );
}

/**
 * Normalize any thrown value into a TalentMapperError with a recruiter-safe message.
 */
export function normalizeTalentMapperError(error: unknown): TalentMapperError {
  if (error instanceof TalentMapperError) {
    return error;
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    if (
      msg.includes("openalex_api_key is not configured") ||
      msg.includes("missing openalex") ||
      (msg.includes("openalex") && msg.includes("not configured"))
    ) {
      return new TalentMapperError(
        "Live search is not configured. Add OPENALEX_API_KEY to use current public research data, or continue with the demo snapshot.",
        "missing_openalex_key",
        503,
        error,
      );
    }

    if (msg.includes("empty job description") || msg === "empty_job_description") {
      return new TalentMapperError(
        "Paste a job description or load the scientific sourcing demo before extracting criteria.",
        "empty_job_description",
        400,
        error,
      );
    }

    if (msg.includes("shortlist") && msg.includes("empty")) {
      return new TalentMapperError(
        "No shortlisted candidates to export. Shortlist at least one potential researcher first.",
        "empty_shortlist",
        400,
        error,
      );
    }

    if (msg.includes("duplicate query")) {
      return new TalentMapperError(
        "That search query is already in the list. Edit the existing query or add a different one.",
        "duplicate_query",
        400,
        error,
      );
    }

    if (msg.includes("openai")) {
      return new TalentMapperError(
        "OpenAI is unavailable. You can still edit criteria manually and run a search.",
        "openai_unavailable",
        503,
        error,
      );
    }

    if (
      error.name === "AbortError" ||
      msg.includes("aborted") ||
      msg.includes("timeout") ||
      msg.includes("timed out")
    ) {
      return new TalentMapperError(
        "The OpenAlex request timed out. Please try again or use the demo snapshot.",
        "openalex_timeout",
        504,
        error,
      );
    }

    if (
      msg.includes("invalid") &&
      (msg.includes("criteria") || msg.includes("schema") || msg.includes("ai"))
    ) {
      return new TalentMapperError(
        "The AI response could not be validated. Edit criteria manually or try extraction again.",
        "invalid_ai_output",
        502,
        error,
      );
    }

    return new TalentMapperError(
      "Talent Mapper encountered an unexpected error. Please try again.",
      "unknown",
      500,
      error,
    );
  }

  return new TalentMapperError(
    "Talent Mapper encountered an unexpected error. Please try again.",
    "unknown",
    500,
    error,
  );
}

/** Alias expected by API route handlers. */
export function normalizeUnknownError(error: unknown): TalentMapperError {
  return normalizeTalentMapperError(error);
}

export function getTalentMapperClientMessage(
  error: TalentMapperError,
  isDev: boolean,
): string {
  if (isDev && error.cause instanceof Error) {
    return `${error.message} (${error.cause.message})`;
  }
  return error.message;
}
