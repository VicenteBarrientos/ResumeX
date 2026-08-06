/**
 * Durable per-user quota backed by Prisma `UsageEvent`.
 *
 * This is the enforcement path for authenticated spend (OpenAI / live external
 * sources). Prefer this over `lib/rate-limit.ts`, which is an in-memory
 * best-effort bucket for pre-auth burst control only.
 *
 * Product limits live in `lib/quota-limits.ts`.
 */
import { apiError } from "@/lib/api/response";
import type { NextResponse } from "next/server";
import { db } from "@/lib/db";

export type QuotaDenial = {
  code: "quota_exceeded" | "upgrade_required";
  message: string;
  /** Present when Free users should be pointed at Pro checkout. */
  upgradeUrl?: string;
  /** Hint for clients / Retry-After when the window is known. */
  retryAfterSec?: number;
  status: 402 | 429;
};

export async function countUsage(
  userId: string,
  name: string,
  since: Date,
): Promise<number> {
  return db.usageEvent.count({
    where: { userId, name, createdAt: { gte: since } },
  });
}

export async function sumUsageCostUsd(
  userId: string,
  since: Date,
): Promise<number> {
  const agg = await db.usageEvent.aggregate({
    where: {
      userId,
      createdAt: { gte: since },
      costUsd: { not: null },
    },
    _sum: { costUsd: true },
  });
  return agg._sum.costUsd ?? 0;
}

/**
 * Count-based quota. Returns a denial when `used >= limit` in the window.
 * Does not record usage — call `recordUsage` only after a successful paid call.
 */
export async function assertQuota(opts: {
  userId: string;
  name: string;
  limit: number;
  windowMs: number;
  onExceeded: (ctx: {
    used: number;
    limit: number;
    retryAfterSec: number;
  }) => QuotaDenial;
}): Promise<QuotaDenial | null> {
  const since = new Date(Date.now() - opts.windowMs);
  const used = await countUsage(opts.userId, opts.name, since);
  if (used < opts.limit) return null;

  const oldest = await db.usageEvent.findFirst({
    where: {
      userId: opts.userId,
      name: opts.name,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  const retryAfterSec = oldest
    ? Math.max(
        1,
        Math.ceil(
          (oldest.createdAt.getTime() + opts.windowMs - Date.now()) / 1000,
        ),
      )
    : Math.ceil(opts.windowMs / 1000);

  return opts.onExceeded({ used, limit: opts.limit, retryAfterSec });
}

/**
 * Daily spend ceiling across all UsageEvents with a recorded `costUsd`.
 * Events without cost (e.g. live OpenAlex/PubMed search counts) do not count.
 */
export async function assertDailyBudget(opts: {
  userId: string;
  maxUsd: number;
  onExceeded: (ctx: { spentUsd: number; maxUsd: number }) => QuotaDenial;
}): Promise<QuotaDenial | null> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const spentUsd = await sumUsageCostUsd(opts.userId, dayAgo);
  if (spentUsd < opts.maxUsd) return null;
  return opts.onExceeded({ spentUsd, maxUsd: opts.maxUsd });
}

export async function recordUsage(
  userId: string,
  name: string,
  costUsd?: number,
): Promise<void> {
  await db.usageEvent.create({
    data: {
      userId,
      name,
      ...(typeof costUsd === "number" && Number.isFinite(costUsd)
        ? { costUsd }
        : {}),
    },
  });
}

/** Flat denial body — `error` stays a string (R-021 / extension contract). */
export function quotaDenialResponse(denial: QuotaDenial): NextResponse {
  return apiError(denial.message, {
    status: denial.status,
    code: denial.code,
    upgradeUrl: denial.upgradeUrl,
    retryAfterSec: denial.retryAfterSec,
  });
}
