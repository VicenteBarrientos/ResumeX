import "server-only";

/**
 * Safe structured logging for ATS operations.
 * Never log emails, tokens, evidence content, or Authorization headers.
 */

export type AtsLogEvent = {
  correlationId?: string;
  provider?: string;
  connectionId?: string;
  operation: string;
  durationMs?: number;
  outcome: "success" | "error" | "retry" | "skipped";
  providerStatusCode?: number;
  safeErrorCode?: string;
};

export function logAtsEvent(event: AtsLogEvent): void {
  if (process.env.RESUMEX_DEBUG_LOGS !== "true" && process.env.NODE_ENV === "test") {
    return;
  }
  // Structured single-line JSON for log aggregators.
  console.info(
    JSON.stringify({
      scope: "ats",
      ...event,
      at: new Date().toISOString(),
    })
  );
}
