/**
 * Server-side entitlement checks. isPro is written by the Stripe webhook;
 * these helpers are the read path that makes Pro mean something.
 */
import { db } from "@/lib/db";

export type EntitlementDenial = {
  code: "upgrade_required";
  message: string;
  upgradeUrl: string;
};

const FREE_ANALYZER_PER_WEEK = 1;
const FREE_COVER_LETTER_PER_DAY = 1;

async function isProUser(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { isPro: true },
  });
  return Boolean(user?.isPro);
}

async function countUsage(
  userId: string,
  name: string,
  since: Date,
): Promise<number> {
  return db.usageEvent.count({
    where: { userId, name, createdAt: { gte: since } },
  });
}

export async function recordUsage(userId: string, name: string): Promise<void> {
  await db.usageEvent.create({ data: { userId, name } });
}

export async function assertAnalyzerEntitlement(
  userId: string,
): Promise<EntitlementDenial | null> {
  if (await isProUser(userId)) return null;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const used = await countUsage(userId, "analyze", weekAgo);
  if (used >= FREE_ANALYZER_PER_WEEK) {
    return {
      code: "upgrade_required",
      message:
        "Free plan includes 1 Career analyzer run per week. Upgrade to ResumeX Pro for unlimited analysis.",
      upgradeUrl: "/upgrade",
    };
  }
  return null;
}

export async function assertCoverLetterEntitlement(
  userId: string,
): Promise<EntitlementDenial | null> {
  if (await isProUser(userId)) return null;

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const used = await countUsage(userId, "cover_letter", dayAgo);
  if (used >= FREE_COVER_LETTER_PER_DAY) {
    return {
      code: "upgrade_required",
      message:
        "Free plan includes 1 cover letter per day. Upgrade to ResumeX Pro for unlimited letters.",
      upgradeUrl: "/upgrade",
    };
  }
  return null;
}

export async function getUserIsPro(userId: string): Promise<boolean> {
  return isProUser(userId);
}
