import type {
  CareerAnalysis,
  CriteriaItem,
  CriterionStatus,
  StrongMatch,
  TalentAssessment,
} from "@/lib/types";

export const CRITERION_STATUSES: CriterionStatus[] = [
  "met",
  "not_met",
  "insufficient",
];

const STATUS_SET = new Set<string>(CRITERION_STATUSES);

export function isCriterionStatus(value: unknown): value is CriterionStatus {
  return typeof value === "string" && STATUS_SET.has(value);
}

/** Collapse whitespace so quote lookup tolerates line-break differences. */
export function normalizeForQuoteMatch(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export function resumeContainsQuote(resume: string, quote: string): boolean {
  const needle = normalizeForQuoteMatch(quote);
  if (!needle) {
    return false;
  }
  return normalizeForQuoteMatch(resume).includes(needle);
}

/**
 * Enforce R-007 after the model responds: non-empty quotes must appear in the
 * resume. Invented "quotes" are cleared and met/not_met downgrade to insufficient.
 */
export function normalizeCriteriaItem(
  item: CriteriaItem,
  resume: string,
): CriteriaItem {
  const criterion = item.criterion.trim();
  const quote = item.quote.trim();
  const status = item.status;

  if (!quote) {
    return {
      criterion,
      status: "insufficient",
      quote: "",
      aiInferred: false,
    };
  }

  if (status === "insufficient") {
    return {
      criterion,
      status: "insufficient",
      quote: "",
      aiInferred: false,
    };
  }

  if (!resumeContainsQuote(resume, quote)) {
    return {
      criterion,
      status: "insufficient",
      quote: "",
      aiInferred: true,
    };
  }

  return {
    criterion,
    status,
    quote,
    aiInferred: Boolean(item.aiInferred),
  };
}

export function normalizeStrongMatch(
  item: StrongMatch,
  resume: string,
): StrongMatch | null {
  const match = item.match.trim();
  const quote = item.quote.trim();
  if (!match || !quote || !resumeContainsQuote(resume, quote)) {
    return null;
  }
  return {
    match,
    quote,
    aiInferred: Boolean(item.aiInferred),
  };
}

export function normalizeCareerEvidence(
  result: CareerAnalysis,
  resume: string,
): CareerAnalysis {
  return {
    ...result,
    mustHaveCriteria: result.mustHaveCriteria.map((item) =>
      normalizeCriteriaItem(item, resume),
    ),
    niceToHaveCriteria: result.niceToHaveCriteria.map((item) =>
      normalizeCriteriaItem(item, resume),
    ),
  };
}

export function normalizeTalentEvidence(
  result: TalentAssessment,
  resume: string,
): TalentAssessment {
  return {
    ...result,
    mustHaveCriteria: result.mustHaveCriteria.map((item) =>
      normalizeCriteriaItem(item, resume),
    ),
    niceToHaveCriteria: result.niceToHaveCriteria.map((item) =>
      normalizeCriteriaItem(item, resume),
    ),
    strongMatches: result.strongMatches
      .map((item) => normalizeStrongMatch(item, resume))
      .filter((item): item is StrongMatch => item !== null),
  };
}

export function formatCriterionStatusLabel(status: CriterionStatus): string {
  switch (status) {
    case "met":
      return "Met";
    case "not_met":
      return "Not met";
    case "insufficient":
      return "Insufficient evidence";
  }
}
