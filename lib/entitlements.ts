/**
 * Server-side entitlement + feature quota checks.
 *
 * Built on durable `UsageEvent` counting via `lib/quota.ts` (T-12.4 / R-022).
 * Public helpers for analyzer and cover letter keep their names and Free limits;
 * Pro is high but finite. Other paid AI / live-source routes use `assertAiQuota`.
 */
import {
  assertDailyBudget,
  assertQuota,
  recordUsage as recordQuotaUsage,
  type QuotaDenial,
} from "@/lib/quota";
import {
  DAILY_BUDGET_USD,
  FREE_LIMITS,
  FREE_UPGRADE_MESSAGES,
  PRO_LIMITS,
  UPGRADE_URL,
  type UsageName,
} from "@/lib/quota-limits";
import { db } from "@/lib/db";

export type EntitlementDenial = QuotaDenial;

export type { UsageName };

async function isProUser(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { isPro: true },
  });
  return Boolean(user?.isPro);
}

function freeUpgradeDenial(
  name: UsageName,
  retryAfterSec: number,
): QuotaDenial {
  return {
    code: "upgrade_required",
    message:
      FREE_UPGRADE_MESSAGES[name] ??
      "Free plan limit reached. Upgrade to ResumeX Pro for higher limits.",
    upgradeUrl: UPGRADE_URL,
    retryAfterSec,
    status: 402,
  };
}

function proExhaustedDenial(
  name: UsageName,
  retryAfterSec: number,
): QuotaDenial {
  return {
    code: "quota_exceeded",
    message: `Pro plan daily limit reached for ${name.split("_").join(" ")}. Try again later.`,
    retryAfterSec,
    status: 429,
  };
}

function budgetDenial(isPro: boolean, spentUsd: number, maxUsd: number): QuotaDenial {
  if (!isPro) {
    return {
      code: "upgrade_required",
      message: `Free plan daily AI spend limit reached (≈$${spentUsd.toFixed(2)} of $${maxUsd.toFixed(2)}). Upgrade to ResumeX Pro for a higher budget.`,
      upgradeUrl: UPGRADE_URL,
      status: 402,
    };
  }
  return {
    code: "quota_exceeded",
    message: `Pro plan daily AI spend limit reached (≈$${spentUsd.toFixed(2)} of $${maxUsd.toFixed(2)}). Try again tomorrow.`,
    status: 429,
  };
}

/**
 * Call-count + daily spend check for any named AI / live-source feature.
 * Demo / free-fallback paths should skip this entirely.
 */
export async function assertAiQuota(
  userId: string,
  name: UsageName,
): Promise<QuotaDenial | null> {
  const isPro = await isProUser(userId);
  const window = isPro ? PRO_LIMITS[name] : FREE_LIMITS[name];

  const countDenial = await assertQuota({
    userId,
    name,
    limit: window.limit,
    windowMs: window.windowMs,
    onExceeded: ({ retryAfterSec }) =>
      isPro
        ? proExhaustedDenial(name, retryAfterSec)
        : freeUpgradeDenial(name, retryAfterSec),
  });
  if (countDenial) return countDenial;

  const maxUsd = isPro ? DAILY_BUDGET_USD.pro : DAILY_BUDGET_USD.free;
  return assertDailyBudget({
    userId,
    maxUsd,
    onExceeded: ({ spentUsd }) => budgetDenial(isPro, spentUsd, maxUsd),
  });
}

/** @deprecated Prefer `assertAiQuota(userId, "analyze")` — kept for call-site clarity. */
export async function assertAnalyzerEntitlement(
  userId: string,
): Promise<EntitlementDenial | null> {
  return assertAiQuota(userId, "analyze");
}

/** @deprecated Prefer `assertAiQuota(userId, "cover_letter")`. */
export async function assertCoverLetterEntitlement(
  userId: string,
): Promise<EntitlementDenial | null> {
  return assertAiQuota(userId, "cover_letter");
}

export async function recordUsage(
  userId: string,
  name: string,
  costUsd?: number,
): Promise<void> {
  await recordQuotaUsage(userId, name, costUsd);
}

export async function getUserIsPro(userId: string): Promise<boolean> {
  return isProUser(userId);
}
