/**
 * Tiny in-memory rate limiter for **pre-auth** credential endpoints
 * (`/api/auth/register`, `/api/extension/token`) where there is no durable
 * `userId` to index `UsageEvent` against.
 *
 * Best-effort per Node process only: on Vercel serverless each instance has
 * its own `Map`, so this will not enforce a global limit. That is acceptable
 * for burst-shaping before auth; authenticated OpenAI / live-source spend is
 * enforced by durable `lib/quota.ts` (T-12.4 / R-022). Do not use this module
 * for paid-path protection.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (existing.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return { ok: true };
}

/** Test helper */
export function resetRateLimits(): void {
  buckets.clear();
}
