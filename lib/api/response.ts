/**
 * Single flat HTTP envelope for API routes (T-12.5 / R-021).
 *
 * Shape: `{ error: string, code?, retryable?, details?, upgradeUrl?, … }`.
 * `error` MUST remain a string — `chrome-extension/popup.js` assigns it to
 * `textContent`. Nested `{ error: { message } }` (old ATS shape) is forbidden.
 */
import { NextResponse } from "next/server";

export type ApiErrorOptions = {
  status?: number;
  code?: string;
  retryable?: boolean;
  details?: unknown;
  upgradeUrl?: string;
  /** Client-facing recovery hint (Talent Mapper / Career AI routes). */
  action?: string;
  /** Retry-After seconds (also sets the response header when present). */
  retryAfterSec?: number;
  headers?: HeadersInit;
  /**
   * Extra top-level siblings preserved for existing clients
   * (e.g. `warnings`, `diagnostics`, `score: null`). Prefer not to grow this.
   */
  extra?: Record<string, unknown>;
};

export function apiError(
  message: string,
  options: ApiErrorOptions = {},
): NextResponse {
  const {
    status = 400,
    code,
    retryable,
    details,
    upgradeUrl,
    action,
    retryAfterSec,
    headers: extraHeaders,
    extra,
  } = options;

  const body: Record<string, unknown> = {
    error: message,
    ...(extra ?? {}),
  };
  if (code !== undefined) body.code = code;
  if (retryable !== undefined) body.retryable = retryable;
  if (details !== undefined) body.details = details;
  if (upgradeUrl !== undefined) body.upgradeUrl = upgradeUrl;
  if (action !== undefined) body.action = action;

  const headers = new Headers(extraHeaders);
  if (retryAfterSec !== undefined) {
    headers.set("Retry-After", String(retryAfterSec));
  }

  return NextResponse.json(body, {
    status,
    headers: headers.keys().next().done ? undefined : headers,
  });
}

export function apiOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}
