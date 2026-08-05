import type {
  EvidenceConfidence,
  EvidenceMatch,
  EvidenceMatchType,
  ScholarlyWork,
  SourcingCriteria,
} from "@/lib/talent-mapper/types";

const SNIPPET_TARGET = 120;

type CriterionBucket =
  | "required"
  | "preferred"
  | "researchArea"
  | "organism"
  | "adjacent"
  | "seniority";

/**
 * Match a scholarly work against sourcing criteria using title, abstract,
 * topics, and keywords. Prefer exact phrases; fall back to adjacent terms
 * and loose token overlap.
 */
export function matchEvidence(
  work: ScholarlyWork,
  criteria: SourcingCriteria,
): EvidenceMatch[] {
  const corpus = buildCorpus(work);
  const matches: EvidenceMatch[] = [];
  const seen = new Set<string>();

  const buckets: Array<{ bucket: CriterionBucket; terms: string[] }> = [
    { bucket: "required", terms: criteria.requiredTechniques },
    { bucket: "preferred", terms: criteria.preferredTechniques },
    { bucket: "researchArea", terms: criteria.researchAreas },
    { bucket: "organism", terms: criteria.organismsOrSystems },
    { bucket: "adjacent", terms: criteria.adjacentTerms },
    { bucket: "seniority", terms: criteria.senioritySignals },
  ];

  for (const { terms } of buckets) {
    for (const term of terms) {
      const criterion = term.trim();
      if (!criterion) {
        continue;
      }

      const exact = findExactPhrase(corpus.normalized, criterion);
      if (exact) {
        pushMatch(matches, seen, {
          criterion,
          matchType: "exact",
          confidence: "direct",
          work,
          snippet: excerptAround(corpus.display, exact.index, criterion.length),
        });
        continue;
      }

      const adjacentHit = findAdjacentMatch(
        corpus.normalized,
        criterion,
        criteria.adjacentTerms,
      );
      if (adjacentHit) {
        pushMatch(matches, seen, {
          criterion,
          matchType: "adjacent",
          confidence: "strong_adjacent",
          work,
          snippet: excerptAround(
            corpus.display,
            adjacentHit.index,
            adjacentHit.length,
          ),
        });
        continue;
      }

      const loose = findLooseTokenOverlap(corpus.normalized, criterion);
      if (loose) {
        pushMatch(matches, seen, {
          criterion,
          matchType: "inferred",
          confidence: "possible",
          work,
          snippet: excerptAround(corpus.display, loose.index, loose.length),
        });
      }
    }
  }

  return matches;
}

function pushMatch(
  matches: EvidenceMatch[],
  seen: Set<string>,
  args: {
    criterion: string;
    matchType: EvidenceMatchType;
    confidence: EvidenceConfidence;
    work: ScholarlyWork;
    snippet: string;
  },
): void {
  const key = `${normalizeText(args.criterion)}::${args.work.id}`;
  if (seen.has(key)) {
    return;
  }
  seen.add(key);

  matches.push({
    criterion: args.criterion,
    matchType: args.matchType,
    workTitle: args.work.title,
    year: args.work.year,
    snippet: args.snippet,
    doi: args.work.doi,
    openAlexUrl: args.work.openAlexUrl,
    confidence: args.confidence,
    workId: args.work.id,
  });
}

function buildCorpus(work: ScholarlyWork): {
  display: string;
  normalized: string;
} {
  const parts = [
    work.title,
    work.abstract ?? "",
    ...(work.topics ?? []),
    ...(work.keywords ?? []),
    work.sourceName ?? "",
  ];
  const display = parts.filter(Boolean).join(" \n ");
  return {
    display,
    normalized: normalizeText(display),
  };
}

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+/.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findExactPhrase(
  normalizedCorpus: string,
  criterion: string,
): { index: number } | null {
  const needle = normalizeText(criterion);
  if (!needle) {
    return null;
  }
  const index = normalizedCorpus.indexOf(needle);
  if (index === -1) {
    return null;
  }
  return { index };
}

function findAdjacentMatch(
  normalizedCorpus: string,
  criterion: string,
  adjacentTerms: string[],
): { index: number; length: number } | null {
  const criterionTokens = tokenize(criterion);
  for (const adj of adjacentTerms) {
    const adjNorm = normalizeText(adj);
    if (!adjNorm) {
      continue;
    }
    const index = normalizedCorpus.indexOf(adjNorm);
    if (index !== -1) {
      // Adjacent term present → credit the criterion only when they share
      // meaningful tokens. (Never match solely because adj is in adjacentTerms —
      // that condition is always true inside this loop and was flooding scores.)
      const shared = criterionTokens.filter((t) =>
        tokenize(adj).includes(t),
      );
      if (shared.length > 0) {
        return { index, length: adjNorm.length };
      }
    }
  }

  // Also treat multi-word criteria where most content words appear near each other
  if (criterionTokens.length >= 2) {
    const present = criterionTokens.filter((t) =>
      hasToken(normalizedCorpus, t),
    );
    if (present.length >= Math.ceil(criterionTokens.length * 0.6)) {
      const first = normalizedCorpus.indexOf(present[0]);
      if (first !== -1) {
        return { index: first, length: present[0].length };
      }
    }
  }

  return null;
}

function findLooseTokenOverlap(
  normalizedCorpus: string,
  criterion: string,
): { index: number; length: number } | null {
  const tokens = tokenize(criterion).filter((t) => t.length >= 4);
  if (tokens.length === 0) {
    return null;
  }
  const hits = tokens.filter((t) => hasToken(normalizedCorpus, t));
  if (hits.length === 0) {
    return null;
  }
  // Require at least half of significant tokens for "possible"
  if (hits.length < Math.max(1, Math.ceil(tokens.length / 2))) {
    return null;
  }
  const index = normalizedCorpus.indexOf(hits[0]);
  if (index === -1) {
    return null;
  }
  return { index, length: hits[0].length };
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));
}

function hasToken(corpus: string, token: string): boolean {
  const re = new RegExp(`(?:^|\\s)${escapeRegExp(token)}(?:\\s|$)`);
  return re.test(corpus);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function excerptAround(
  display: string,
  normalizedIndex: number,
  matchLength: number,
): string {
  // Map approximately onto display text by normalizing on the fly
  const normalizedDisplay = normalizeText(display);
  const start = Math.max(0, normalizedIndex - 40);
  const end = Math.min(
    normalizedDisplay.length,
    normalizedIndex + matchLength + 40,
  );
  let snippet = normalizedDisplay.slice(start, end).trim();

  if (snippet.length > SNIPPET_TARGET) {
    snippet = `${snippet.slice(0, SNIPPET_TARGET - 1).trimEnd()}…`;
  }

  if (start > 0) {
    snippet = `…${snippet}`;
  }
  if (end < normalizedDisplay.length && !snippet.endsWith("…")) {
    snippet = `${snippet}…`;
  }

  // Prefer a short window from the original display when possible
  const originalWindow = softExcerpt(display, SNIPPET_TARGET);
  if (!snippet) {
    return originalWindow;
  }
  return snippet;
}

function softExcerpt(text: string, max: number): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= max) {
    return collapsed;
  }
  return `${collapsed.slice(0, max - 1).trimEnd()}…`;
}

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "or",
  "the",
  "of",
  "in",
  "on",
  "for",
  "to",
  "with",
  "by",
  "from",
  "as",
  "at",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "this",
  "that",
  "these",
  "those",
  "into",
  "via",
  "using",
  "use",
  "used",
  "experience",
  "including",
]);
