import type {
  EvidenceMatch,
  LikelyInstitution,
  RelevantWork,
  ScoreBreakdown,
  SourcingCriteria,
} from "@/lib/talent-mapper/types";

export type ScoreResearcherInput = {
  name: string;
  criteria: SourcingCriteria;
  matchedRequired: EvidenceMatch[];
  matchedPreferred: EvidenceMatch[];
  matchedResearchAreas: EvidenceMatch[];
  matchedOrganisms: EvidenceMatch[];
  relevantWorks: RelevantWork[];
  likelyInstitution?: LikelyInstitution;
  publicationYears: number[];
  mostRecentRelevantYear?: number;
};

export type ScoreResearcherResult = {
  score: number;
  scoreBreakdown: ScoreBreakdown;
  evidenceSummary: string;
  outreachAngle: string;
  possibleConcerns: string[];
  unknowns: string[];
};

const ALWAYS_UNKNOWNS = [
  "Current employment",
  "Interest in moving",
  "Work authorization",
] as const;

/**
 * Deterministic 0–100 research relevance score.
 * Missing data is scored as 0 for that component (not negative).
 * Citation counts must not dominate.
 */
export function scoreResearcher(
  input: ScoreResearcherInput,
): ScoreResearcherResult {
  const requiredTechniques = scoreRequiredTechniques(
    input.criteria.requiredTechniques,
    input.matchedRequired,
  );
  const researchArea = scoreResearchArea(
    input.criteria,
    input.matchedResearchAreas,
    input.matchedOrganisms,
    input.matchedPreferred,
  );
  const recency = scoreRecency(
    input.mostRecentRelevantYear,
    input.criteria.publicationYearFrom,
  );
  const repeatedEvidence = scoreRepeatedEvidence(input.relevantWorks.length);
  const geography = scoreGeography(
    input.criteria,
    input.likelyInstitution,
  );
  const seniority = scoreSeniority(
    input.criteria.senioritySignals,
    input.matchedRequired,
    input.matchedPreferred,
    input.relevantWorks,
  );

  const total = clamp(
    requiredTechniques +
      researchArea +
      recency +
      repeatedEvidence +
      geography +
      seniority,
    0,
    100,
  );

  const scoreBreakdown: ScoreBreakdown = {
    requiredTechniques,
    researchArea,
    recency,
    repeatedEvidence,
    geography,
    seniority,
    total,
  };

  return {
    score: total,
    scoreBreakdown,
    evidenceSummary: buildEvidenceSummary(input),
    outreachAngle: buildOutreachAngle(input),
    possibleConcerns: buildConcerns(input),
    unknowns: [...ALWAYS_UNKNOWNS],
  };
}

function scoreRequiredTechniques(
  required: string[],
  matches: EvidenceMatch[],
): number {
  if (required.length === 0) {
    return 0;
  }

  const byCriterion = bestConfidenceByCriterion(matches);
  let points = 0;
  const perCriterion = 40 / required.length;

  for (const term of required) {
    const conf = byCriterion.get(normalizeKey(term));
    if (!conf) {
      continue;
    }
    if (conf === "direct") {
      points += perCriterion;
    } else if (conf === "strong_adjacent") {
      points += perCriterion * 0.7;
    } else if (conf === "topical") {
      points += perCriterion * 0.25;
    } else {
      points += perCriterion * 0.35;
    }
  }

  return Math.round(clamp(points, 0, 40));
}

function scoreResearchArea(
  criteria: SourcingCriteria,
  areas: EvidenceMatch[],
  organisms: EvidenceMatch[],
  preferred: EvidenceMatch[],
): number {
  const areaTargets = [
    ...criteria.researchAreas,
    ...criteria.organismsOrSystems,
  ];
  if (areaTargets.length === 0) {
    // Prefer preferred-technique spillover when no areas listed
    if (preferred.length === 0) {
      return 0;
    }
    return Math.round(clamp(preferred.length * 3, 0, 10));
  }

  const combined = [...areas, ...organisms];
  const byCriterion = bestConfidenceByCriterion(combined);
  let points = 0;
  const per = 20 / areaTargets.length;

  for (const term of areaTargets) {
    const conf = byCriterion.get(normalizeKey(term));
    if (!conf) {
      continue;
    }
    if (conf === "direct") {
      points += per;
    } else if (conf === "strong_adjacent") {
      points += per * 0.7;
    } else if (conf === "topical") {
      points += per * 0.3;
    } else {
      points += per * 0.35;
    }
  }

  // Small boost if preferred techniques also appear (capped)
  if (preferred.some((m) => m.confidence === "direct")) {
    points += 2;
  }

  return Math.round(clamp(points, 0, 20));
}

function scoreRecency(
  mostRecentRelevantYear: number | undefined,
  publicationYearFrom: number | undefined,
): number {
  if (mostRecentRelevantYear == null) {
    return 0;
  }

  const currentYear = new Date().getUTCFullYear();
  const age = currentYear - mostRecentRelevantYear;
  if (age < 0) {
    return 15;
  }
  if (age <= 2) {
    return 15;
  }
  if (age <= 5) {
    return 12;
  }
  if (age <= 8) {
    return 8;
  }
  if (age <= 12) {
    return 4;
  }

  // Soft floor when work still falls within recruiter window
  if (
    publicationYearFrom != null &&
    mostRecentRelevantYear >= publicationYearFrom
  ) {
    return 2;
  }

  return 0;
}

function scoreRepeatedEvidence(relevantWorkCount: number): number {
  if (relevantWorkCount <= 0) {
    return 0;
  }
  if (relevantWorkCount === 1) {
    return 3;
  }
  if (relevantWorkCount === 2) {
    return 6;
  }
  if (relevantWorkCount === 3) {
    return 8;
  }
  return 10;
}

function scoreGeography(
  criteria: SourcingCriteria,
  institution: LikelyInstitution | undefined,
): number {
  const loc = criteria.location;
  if (!loc.country && !loc.region && !loc.city && !loc.remoteAllowed) {
    return 0;
  }

  if (loc.remoteAllowed) {
    return 6;
  }

  if (!institution) {
    return 0;
  }

  let points = 0;
  const country = (institution.countryCode ?? "").toUpperCase();
  const targetCountry = (loc.country ?? "").trim().toUpperCase();

  if (targetCountry) {
    const aliases: Record<string, string[]> = {
      US: ["US", "USA", "UNITED STATES", "UNITED STATES OF AMERICA"],
      GB: ["GB", "UK", "UNITED KINGDOM", "ENGLAND"],
      CA: ["CA", "CANADA"],
    };
    const matched = Object.entries(aliases).some(([code, names]) => {
      if (country === code || names.includes(country)) {
        return (
          names.includes(targetCountry) ||
          targetCountry === code ||
          targetCountry.startsWith(code)
        );
      }
      return (
        names.includes(targetCountry) &&
        (country === code || names.includes(country))
      );
    });

    if (matched || country === targetCountry || targetCountry.includes(country)) {
      points += 7;
    } else if (country) {
      // Different country known — modest signal only (not a rejection)
      points += 1;
    }
  }

  const name = (institution.name ?? "").toLowerCase();
  if (loc.city && name.includes(loc.city.toLowerCase())) {
    points += 3;
  } else if (loc.region && name.includes(loc.region.toLowerCase())) {
    points += 2;
  }

  return Math.round(clamp(points, 0, 10));
}

function scoreSeniority(
  senioritySignals: string[],
  matchedRequired: EvidenceMatch[],
  matchedPreferred: EvidenceMatch[],
  works: RelevantWork[],
): number {
  if (senioritySignals.length === 0) {
    // Mild signal from first-author-style volume without inflating fame
    if (works.length >= 3) {
      return 2;
    }
    return 0;
  }

  const haystack = [
    ...matchedRequired,
    ...matchedPreferred,
  ]
    .map((m) => `${m.criterion} ${m.snippet}`.toLowerCase())
    .join(" ");

  let hits = 0;
  for (const signal of senioritySignals) {
    const key = signal.toLowerCase().trim();
    if (!key) {
      continue;
    }
    if (haystack.includes(key)) {
      hits += 1;
    }
  }

  if (hits === 0) {
    return 0;
  }
  if (hits === 1) {
    return 3;
  }
  return 5;
}

function buildEvidenceSummary(input: ScoreResearcherInput): string {
  const direct = [
    ...input.matchedRequired,
    ...input.matchedResearchAreas,
    ...input.matchedOrganisms,
  ].filter((m) => m.confidence === "direct");

  const uniqueCriteria = unique(
    direct.map((m) => m.criterion),
  );

  if (uniqueCriteria.length === 0) {
    const possible = unique(
      [...input.matchedRequired, ...input.matchedPreferred].map(
        (m) => m.criterion,
      ),
    );
    if (possible.length === 0) {
      return `Public works for ${input.name} show limited overlap with the stated criteria and require recruiter review.`;
    }
    return `Possible public-research overlap for ${input.name} includes ${possible.slice(0, 3).join(", ")}. Evidence strength is modest and requires recruiter validation.`;
  }

  const yearPart =
    input.mostRecentRelevantYear != null
      ? ` Most recent relevant publication year in retrieved data: ${input.mostRecentRelevantYear}.`
      : "";

  return `Public research evidence for ${input.name} includes direct matches for ${uniqueCriteria.slice(0, 4).join(", ")} across ${input.relevantWorks.length} relevant work${input.relevantWorks.length === 1 ? "" : "s"}.${yearPart} Scores reflect research relevance only and require recruiter validation.`;
}

function buildOutreachAngle(input: ScoreResearcherInput): string {
  const top = [
    ...input.matchedRequired,
    ...input.matchedResearchAreas,
  ].find((m) => m.confidence === "direct") ??
    input.matchedRequired[0] ??
    input.matchedPreferred[0];

  const work =
    input.relevantWorks.find((w) => w.id === top?.workId) ??
    input.relevantWorks[0];

  if (!top || !work) {
    return `Potential conversation starter: ask how ${input.name}'s recent public research relates to ${input.criteria.roleTitle}.`;
  }

  return `Reference “${truncate(work.title, 80)}” (${work.year ?? "n.d."}) as public evidence related to ${top.criterion}, and ask whether similar hands-on work is of ongoing interest.`;
}

function buildConcerns(input: ScoreResearcherInput): string[] {
  const concerns: string[] = [];

  if (input.relevantWorks.some((w) => w.isRetracted)) {
    concerns.push(
      "One or more retrieved works are marked retracted — review carefully before outreach.",
    );
  }

  const required = input.criteria.requiredTechniques.filter((t) => t.trim());
  const matchedKeys = new Set(
    input.matchedRequired.map((m) => normalizeKey(m.criterion)),
  );
  const missing = required.filter((t) => !matchedKeys.has(normalizeKey(t)));
  if (missing.length > 0 && required.length > 0) {
    concerns.push(
      `No clear public evidence yet for required technique(s): ${missing.slice(0, 3).join(", ")}.`,
    );
  }

  if (
    input.mostRecentRelevantYear != null &&
    new Date().getUTCFullYear() - input.mostRecentRelevantYear > 8
  ) {
    concerns.push(
      "Most recent relevant public work appears older than eight years.",
    );
  }

  for (const exclusion of input.criteria.exclusions) {
    const key = exclusion.toLowerCase().trim();
    if (!key) {
      continue;
    }
    const hit = input.relevantWorks.some(
      (w) =>
        w.title.toLowerCase().includes(key) ||
        (w.abstractSnippet ?? "").toLowerCase().includes(key),
    );
    if (hit) {
      concerns.push(
        `Possible exclusion signal (“${exclusion}”) appears in retrieved work metadata.`,
      );
    }
  }

  return concerns;
}

function bestConfidenceByCriterion(
  matches: EvidenceMatch[],
): Map<string, EvidenceMatch["confidence"]> {
  const rank: Record<EvidenceMatch["confidence"], number> = {
    direct: 4,
    strong_adjacent: 3,
    possible: 2,
    topical: 1,
  };
  const map = new Map<string, EvidenceMatch["confidence"]>();
  for (const match of matches) {
    const key = normalizeKey(match.criterion);
    const existing = map.get(key);
    if (!existing || rank[match.confidence] > rank[existing]) {
      map.set(key, match.confidence);
    }
  }
  return map;
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = normalizeKey(v);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(v);
  }
  return out;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
