/**
 * Proposed product quotas for T-12.4 / R-022.
 *
 * Free analyzer (1/week) and cover letter (1/day) preserve the limits that
 * shipped with the audit-fix entitlements. Everything else is a **proposal**:
 * Pro is high but finite (never unlimited). Confirm with a human before treating
 * these numbers as pricing policy in production.
 */
export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;

export type UsageName =
  | "analyze"
  | "cover_letter"
  | "talent_assess"
  | "format"
  | "extract_job"
  | "extract_criteria"
  | "outreach"
  | "match_score"
  | "parse_profile"
  | "profile_resume"
  | "talent_mapper_search";

export type WindowLimit = { limit: number; windowMs: number };

/** Free-tier call caps. Analyzer/cover letter match `lib/entitlements` history. */
export const FREE_LIMITS: Record<UsageName, WindowLimit> = {
  analyze: { limit: 1, windowMs: WEEK_MS },
  cover_letter: { limit: 1, windowMs: DAY_MS },
  talent_assess: { limit: 1, windowMs: WEEK_MS },
  format: { limit: 3, windowMs: WEEK_MS },
  extract_job: { limit: 10, windowMs: DAY_MS },
  extract_criteria: { limit: 5, windowMs: DAY_MS },
  outreach: { limit: 10, windowMs: DAY_MS },
  match_score: { limit: 20, windowMs: DAY_MS },
  parse_profile: { limit: 5, windowMs: DAY_MS },
  profile_resume: { limit: 10, windowMs: DAY_MS },
  talent_mapper_search: { limit: 3, windowMs: DAY_MS },
};

/** Pro-tier call caps — intentionally high, never infinite (R-022). */
export const PRO_LIMITS: Record<UsageName, WindowLimit> = {
  analyze: { limit: 200, windowMs: DAY_MS },
  cover_letter: { limit: 200, windowMs: DAY_MS },
  talent_assess: { limit: 200, windowMs: DAY_MS },
  format: { limit: 200, windowMs: DAY_MS },
  extract_job: { limit: 500, windowMs: DAY_MS },
  extract_criteria: { limit: 200, windowMs: DAY_MS },
  outreach: { limit: 500, windowMs: DAY_MS },
  match_score: { limit: 1000, windowMs: DAY_MS },
  parse_profile: { limit: 200, windowMs: DAY_MS },
  profile_resume: { limit: 500, windowMs: DAY_MS },
  talent_mapper_search: { limit: 50, windowMs: DAY_MS },
};

/**
 * Soft daily OpenAI spend ceiling (sum of `UsageEvent.costUsd`).
 * Live OpenAlex/PubMed searches record no cost and do not burn this budget.
 */
export const DAILY_BUDGET_USD = {
  free: 0.25,
  pro: 5,
} as const;

export const UPGRADE_URL = "/upgrade";

export const FREE_UPGRADE_MESSAGES: Partial<Record<UsageName, string>> = {
  analyze:
    "Free plan includes 1 Career analyzer run per week. Upgrade to ResumeX Pro for unlimited analysis.",
  cover_letter:
    "Free plan includes 1 cover letter per day. Upgrade to ResumeX Pro for unlimited letters.",
  talent_assess:
    "Free plan includes 1 Talent Assess run per week. Upgrade to ResumeX Pro for higher limits.",
  format:
    "Free plan includes 3 CV format runs per week. Upgrade to ResumeX Pro for higher limits.",
  extract_job:
    "Free plan daily job-extract limit reached. Upgrade to ResumeX Pro for higher limits.",
  extract_criteria:
    "Free plan daily criteria-extract limit reached. Upgrade to ResumeX Pro for higher limits.",
  outreach:
    "Free plan daily outreach draft limit reached. Upgrade to ResumeX Pro for higher limits.",
  match_score:
    "Free plan daily match-score limit reached. Upgrade to ResumeX Pro for higher limits.",
  parse_profile:
    "Free plan daily profile-parse limit reached. Upgrade to ResumeX Pro for higher limits.",
  profile_resume:
    "Free plan daily resume-parse limit reached. Upgrade to ResumeX Pro for higher limits.",
  talent_mapper_search:
    "Free plan includes 3 live Talent Mapper searches per day. Upgrade to ResumeX Pro for higher limits.",
};
