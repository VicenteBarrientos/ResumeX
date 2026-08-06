import "server-only";

import { randomUUID } from "crypto";
import type { AtsProvider } from "@/lib/ats/types";
import {
  AtsRateLimitError,
  AtsTransientError,
  errorFromHttpStatus,
  isAtsError,
} from "@/lib/ats/errors";
import { logAtsEvent } from "@/lib/ats/logging";

export type AtsHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type AtsHttpRequestOptions = {
  provider: AtsProvider;
  baseUrl: string;
  path: string;
  method?: AtsHttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  /** Raw body for multipart / webhook-style posts. */
  rawBody?: Buffer | string;
  query?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
  signal?: AbortSignal;
  correlationId?: string;
  /** Safe to auto-retry on 429/5xx (reads and verified-safe ops only). */
  retrySafe?: boolean;
  maxRetries?: number;
  /** When true, return Response without JSON parsing. */
  rawResponse?: boolean;
};

export type AtsHttpResult<T> = {
  data: T;
  status: number;
  headers: Headers;
  correlationId: string;
  providerRequestId?: string;
};

const ALLOWED_BASE_URLS: Record<AtsProvider, readonly string[]> = {
  recruitee: ["https://api.recruitee.com"],
  ashby: ["https://api.ashbyhq.com"],
  "zoho-recruit": [
    "https://www.zohoapis.com",
    "https://www.zohoapis.eu",
    "https://www.zohoapis.in",
    "https://www.zohoapis.com.au",
    "https://www.zohoapis.jp",
    "https://www.zohoapis.com.cn",
    "https://recruit.zoho.com",
    "https://recruit.zoho.eu",
    "https://recruit.zoho.in",
    "https://recruit.zoho.com.au",
    "https://recruit.zoho.jp",
    "https://recruit.zoho.com.cn",
    "https://accounts.zoho.com",
    "https://accounts.zoho.eu",
    "https://accounts.zoho.in",
    "https://accounts.zoho.com.au",
    "https://accounts.zoho.jp",
    "https://accounts.zoho.com.cn",
  ],
};

export function assertAllowedBaseUrl(provider: AtsProvider, baseUrl: string): void {
  const normalized = baseUrl.replace(/\/$/, "");
  const allowed = ALLOWED_BASE_URLS[provider];
  if (!allowed.includes(normalized)) {
    throw new Error(`Blocked non-allowlisted ATS base URL for ${provider}.`);
  }
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: AtsHttpRequestOptions["query"]
): string {
  const url = new URL(path.startsWith("http") ? path : `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const asInt = Number(header);
  if (Number.isFinite(asInt) && asInt >= 0) return asInt * 1000;
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return undefined;
}

/**
 * Shared ATS HTTP client: fixed base URL allowlist, timeout, correlation ID,
 * structured safe errors, and retry for safe reads / rate limits.
 */
export async function atsFetch<T = unknown>(
  options: AtsHttpRequestOptions
): Promise<AtsHttpResult<T>> {
  assertAllowedBaseUrl(options.provider, options.baseUrl);

  const correlationId = options.correlationId ?? randomUUID();
  const method = options.method ?? "GET";
  const maxRetries = options.retrySafe ? (options.maxRetries ?? 3) : 0;
  const timeoutMs = options.timeoutMs ?? 20_000;
  const url = buildUrl(options.baseUrl, options.path, options.query);

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onAbort = () => controller.abort();
    options.signal?.addEventListener("abort", onAbort);

    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
        "X-ResumeX-Correlation-Id": correlationId,
        ...options.headers,
      };

      let body: BodyInit | undefined;
      if (options.rawBody !== undefined) {
        body =
          typeof options.rawBody === "string"
            ? options.rawBody
            : new Uint8Array(options.rawBody);
      } else if (options.body !== undefined) {
        if (!headers["Content-Type"] && !headers["content-type"]) {
          headers["Content-Type"] = "application/json";
        }
        body = JSON.stringify(options.body);
      }

      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });

      const providerRequestId =
        response.headers.get("x-request-id") ||
        response.headers.get("x-zoho-request-id") ||
        undefined;

      if (!response.ok) {
        const retryableStatus =
          response.status === 429 ||
          response.status === 500 ||
          response.status === 502 ||
          response.status === 503 ||
          response.status === 504;

        if (options.retrySafe && retryableStatus && attempt < maxRetries) {
          const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
          const backoff = retryAfter ?? Math.min(8_000, 400 * 2 ** attempt);
          attempt += 1;
          logAtsEvent({
            correlationId,
            provider: options.provider,
            operation: `${method} ${options.path}`,
            durationMs: Date.now() - started,
            outcome: "retry",
            providerStatusCode: response.status,
          });
          await sleep(backoff);
          continue;
        }

        if (response.status === 429) {
          throw new AtsRateLimitError(options.provider, undefined, {
            httpStatus: 429,
            providerRequestId,
          });
        }
        throw errorFromHttpStatus(options.provider, response.status, providerRequestId);
      }

      logAtsEvent({
        correlationId,
        provider: options.provider,
        operation: `${method} ${options.path}`,
        durationMs: Date.now() - started,
        outcome: "success",
        providerStatusCode: response.status,
      });

      if (options.rawResponse) {
        return {
          data: response as unknown as T,
          status: response.status,
          headers: response.headers,
          correlationId,
          providerRequestId,
        };
      }

      const text = await response.text();
      const data = (text ? JSON.parse(text) : null) as T;
      return {
        data,
        status: response.status,
        headers: response.headers,
        correlationId,
        providerRequestId,
      };
    } catch (error) {
      lastError = error;
      if (isAtsError(error)) {
        logAtsEvent({
          correlationId,
          provider: options.provider,
          operation: `${method} ${options.path}`,
          durationMs: Date.now() - started,
          outcome: "error",
          providerStatusCode: error.httpStatus,
          safeErrorCode: error.code,
        });
        throw error;
      }

      const aborted =
        error instanceof Error &&
        (error.name === "AbortError" || /aborted/i.test(error.message));

      if (options.retrySafe && attempt < maxRetries) {
        attempt += 1;
        await sleep(Math.min(8_000, 400 * 2 ** attempt));
        continue;
      }

      logAtsEvent({
        correlationId,
        provider: options.provider,
        operation: `${method} ${options.path}`,
        durationMs: Date.now() - started,
        outcome: "error",
        safeErrorCode: aborted ? "transient" : "transient",
      });

      throw new AtsTransientError(
        options.provider,
        aborted ? "ATS request timed out." : "Network error talking to ATS."
      );
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new AtsTransientError(options.provider);
}

export function getAllowedBaseUrls(provider: AtsProvider): readonly string[] {
  return ALLOWED_BASE_URLS[provider];
}
