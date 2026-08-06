export type PubmedErrorCode =
  | "PUBMED_NOT_CONFIGURED"
  | "PUBMED_RATE_LIMITED"
  | "PUBMED_TIMEOUT"
  | "PUBMED_INVALID_QUERY"
  | "PUBMED_INVALID_RESPONSE"
  | "PUBMED_UNAVAILABLE"
  | "PUBMED_ABORTED";

export class PubmedError extends Error {
  readonly code: PubmedErrorCode;
  readonly status: number;

  constructor(message: string, code: PubmedErrorCode, status = 502) {
    super(message);
    this.name = "PubmedError";
    this.code = code;
    this.status = status;
  }
}

export function pubmedErrorMessage(code: PubmedErrorCode): string {
  switch (code) {
    case "PUBMED_NOT_CONFIGURED":
      return "PubMed live search is not configured. Add NCBI_EMAIL and optionally NCBI_API_KEY to enable current PubMed results.";
    case "PUBMED_RATE_LIMITED":
      return "PubMed rate limit exceeded. Wait briefly and retry, or continue with OpenAlex / demo snapshot.";
    case "PUBMED_TIMEOUT":
      return "The PubMed request timed out. Retry the search or continue with available sources.";
    case "PUBMED_INVALID_QUERY":
      return "A PubMed query was rejected. Review Boolean syntax and parentheses, then try again.";
    case "PUBMED_INVALID_RESPONSE":
      return "PubMed returned an unexpected response. Retry shortly.";
    case "PUBMED_ABORTED":
      return "The PubMed search was cancelled.";
    default:
      return "PubMed is temporarily unavailable. Retry shortly or continue with available sources.";
  }
}
