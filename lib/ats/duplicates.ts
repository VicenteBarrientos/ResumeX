import type { AtsCandidateMatch, AtsDuplicateConfidence } from "@/lib/ats/types";

const CONFIDENCE_RANK: Record<AtsDuplicateConfidence, number> = {
  existing_mapping: 5,
  exact_email: 4,
  strong_profile_match: 3,
  name_only: 1,
  unknown: 0,
};

/**
 * Conservative duplicate ranking.
 * Name-only matches must never be auto-reused.
 */
export function rankDuplicateConfidence(
  confidence: AtsDuplicateConfidence
): number {
  return CONFIDENCE_RANK[confidence];
}

export function canAutoReuseMatch(match: AtsCandidateMatch): boolean {
  return (
    match.confidence === "existing_mapping" || match.confidence === "exact_email"
  );
}

export function sortCandidateMatches(
  matches: AtsCandidateMatch[]
): AtsCandidateMatch[] {
  return [...matches].sort(
    (a, b) =>
      rankDuplicateConfidence(b.confidence) - rankDuplicateConfidence(a.confidence)
  );
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailsOverlap(
  candidateEmails: string[],
  matchEmails: string[]
): boolean {
  const set = new Set(candidateEmails.map(normalizeEmail).filter(Boolean));
  return matchEmails.some((e) => set.has(normalizeEmail(e)));
}

/**
 * Decide default action for transfer preview.
 * Never auto-create when exact email duplicate exists.
 * Never auto-reuse name-only matches.
 */
export function resolveDuplicateDecision(
  matches: AtsCandidateMatch[],
  hasEmail: boolean
): {
  recommendedExternalCandidateId?: string;
  requiresRecruiterChoice: boolean;
  warning?: string;
} {
  const sorted = sortCandidateMatches(matches);
  const exact = sorted.find(
    (m) => m.confidence === "existing_mapping" || m.confidence === "exact_email"
  );
  if (exact) {
    return {
      recommendedExternalCandidateId: exact.externalCandidateId,
      requiresRecruiterChoice: true,
      warning:
        "An exact match already exists in the ATS. Reuse is recommended; creating a separate record requires explicit confirmation.",
    };
  }

  if (sorted.length > 0) {
    return {
      requiresRecruiterChoice: true,
      warning: hasEmail
        ? "Possible name or profile matches found. Do not auto-reuse without review."
        : "No email available — duplicate confidence is limited. Name-only matches must not be reused automatically.",
    };
  }

  if (!hasEmail) {
    return {
      requiresRecruiterChoice: true,
      warning:
        "This researcher has no email. Creating a name-only ATS lead requires explicit confirmation. Never invent an email.",
    };
  }

  return { requiresRecruiterChoice: false };
}
