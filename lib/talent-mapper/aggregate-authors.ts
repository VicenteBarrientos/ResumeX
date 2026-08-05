import { reconstructAbstract } from "@/lib/talent-mapper/abstract";
import { matchEvidence } from "@/lib/talent-mapper/evidence";
import { scoreResearcher } from "@/lib/talent-mapper/scoring";
import { withScreeningQuestions } from "@/lib/talent-mapper/screening-questions";
import type {
  AggregateAuthorsOptions,
  EvidenceMatch,
  LikelyInstitution,
  OpenAlexWorkLike,
  RelevantWork,
  ResearcherCandidate,
  ScholarlyWork,
  SourcingCriteria,
} from "@/lib/talent-mapper/types";

export type AggregateWorkInput = ScholarlyWork | OpenAlexWorkLike;

/**
 * Aggregate scholarly works into ranked researcher candidates.
 * Deduplicates works by OpenAlex work ID and authors by author ID.
 * Accepts normalized ScholarlyWork or raw OpenAlex-like work shapes.
 */
export function aggregateAuthors(
  works: AggregateWorkInput[],
  criteria: SourcingCriteria,
  options: AggregateAuthorsOptions = {},
): ResearcherCandidate[] {
  const includeRetracted = options.includeRetracted ?? false;
  const dedupedWorks = dedupeWorks(works.map(coerceToScholarlyWork).filter((w): w is ScholarlyWork => w != null));


  type Acc = {
    authorId: string;
    name: string;
    orcid?: string;
    works: ScholarlyWork[];
    evidence: EvidenceMatch[];
    retractedSeen: boolean;
  };

  const byAuthor = new Map<string, Acc>();

  for (const work of dedupedWorks) {
    if (work.isRetracted && !includeRetracted) {
      continue;
    }

    const evidence = matchEvidence(work, criteria);
    if (evidence.length === 0 && !workMentionsAnyCriterion(work, criteria)) {
      // Skip works with no criterion overlap to keep shortlist focused
      continue;
    }

    for (const authorship of work.authorships) {
      const authorId = normalizeAuthorId(authorship.authorId);
      if (!authorId) {
        continue;
      }

      let acc = byAuthor.get(authorId);
      if (!acc) {
        acc = {
          authorId,
          name: authorship.name || "Unknown researcher",
          orcid: authorship.orcid,
          works: [],
          evidence: [],
          retractedSeen: false,
        };
        byAuthor.set(authorId, acc);
      }

      if (!acc.orcid && authorship.orcid) {
        acc.orcid = authorship.orcid;
      }
      if (authorship.name && acc.name === "Unknown researcher") {
        acc.name = authorship.name;
      }

      if (!acc.works.some((w) => w.id === work.id)) {
        acc.works.push(work);
      }
      acc.evidence.push(...evidence);
      if (work.isRetracted) {
        acc.retractedSeen = true;
      }
    }
  }

  const candidates: ResearcherCandidate[] = [];

  for (const acc of byAuthor.values()) {
    const matchedRequired = filterEvidence(
      acc.evidence,
      criteria.requiredTechniques,
    );
    const matchedPreferred = filterEvidence(
      acc.evidence,
      criteria.preferredTechniques,
    );
    const matchedResearchAreas = filterEvidence(
      acc.evidence,
      criteria.researchAreas,
    );
    const matchedOrganismsOrSystems = filterEvidence(
      acc.evidence,
      criteria.organismsOrSystems,
    );

    const relevantWorks = buildRelevantWorks(acc.works, acc.evidence);
    if (relevantWorks.length === 0) {
      continue;
    }

    const publicationYears = uniqueNumbers(
      relevantWorks
        .map((w) => w.year)
        .filter((y): y is number => typeof y === "number"),
    ).sort((a, b) => a - b);

    const mostRecentRelevantYear =
      publicationYears.length > 0
        ? publicationYears[publicationYears.length - 1]
        : undefined;

    const totalCitationCountForRelevantWorks = relevantWorks.reduce(
      (sum, w) => sum + (w.citedByCount ?? 0),
      0,
    );

    const likelyInstitution = deriveLikelyInstitution(
      acc.works,
      acc.authorId,
    );

    const scored = scoreResearcher({
      name: acc.name,
      criteria,
      matchedRequired,
      matchedPreferred,
      matchedResearchAreas,
      matchedOrganisms: matchedOrganismsOrSystems,
      relevantWorks,
      likelyInstitution,
      publicationYears,
      mostRecentRelevantYear,
    });

    const possibleConcerns = [...scored.possibleConcerns];
    if (acc.retractedSeen && !possibleConcerns.some((c) => c.includes("retracted"))) {
      possibleConcerns.unshift(
        "One or more retrieved works are marked retracted — review carefully before outreach.",
      );
    }

    candidates.push(
      withScreeningQuestions(
        {
          authorId: acc.authorId,
          name: acc.name,
          orcid: acc.orcid,
          openAlexUrl: toOpenAlexAuthorUrl(acc.authorId),
          likelyInstitution,
          relevantWorks,
          matchedRequiredCriteria: dedupeEvidence(matchedRequired),
          matchedPreferredCriteria: dedupeEvidence(matchedPreferred),
          matchedResearchAreas: dedupeEvidence(matchedResearchAreas),
          matchedOrganismsOrSystems: dedupeEvidence(matchedOrganismsOrSystems),
          publicationYears,
          mostRecentRelevantYear,
          relevantWorkCount: relevantWorks.length,
          totalCitationCountForRelevantWorks,
          score: scored.score,
          scoreBreakdown: scored.scoreBreakdown,
          evidenceSummary: scored.evidenceSummary,
          outreachAngle: scored.outreachAngle,
          possibleConcerns,
          unknowns: scored.unknowns,
        },
        criteria,
      ),
    );
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.name.localeCompare(b.name);
  });

  if (options.limit != null && options.limit > 0) {
    return candidates.slice(0, options.limit);
  }

  return candidates;
}

export function dedupeWorks(works: ScholarlyWork[]): ScholarlyWork[] {
  const map = new Map<string, ScholarlyWork>();
  for (const work of works) {
    const id = normalizeWorkId(work.id);
    if (!id) {
      continue;
    }
    if (!map.has(id)) {
      map.set(id, { ...work, id });
    }
  }
  return [...map.values()];
}

/** Alias expected by some callers/tests. */
export const dedupeWorksById = dedupeWorks;

function coerceToScholarlyWork(work: AggregateWorkInput): ScholarlyWork | null {
  if (isScholarlyWork(work)) {
    return work;
  }

  const raw = work as OpenAlexWorkLike;
  const id = normalizeWorkId(raw.id);
  if (!id) {
    return null;
  }

  const title =
    (raw.display_name || raw.title || "").trim() || "Untitled work";

  const topics = [
    raw.primary_topic?.display_name,
    ...(raw.topics ?? []).map((t) => t?.display_name),
  ]
    .filter((t): t is string => Boolean(t && t.trim()))
    .map((t) => t.trim());

  const keywords = (raw.keywords ?? [])
    .map((k) => (k?.display_name || k?.keyword || "").trim())
    .filter(Boolean);

  const abstract =
    (raw.abstract_text || "").trim() ||
    reconstructAbstract(raw.abstract_inverted_index ?? null);

  const authorships = (raw.authorships ?? [])
    .map((a) => {
      const authorId = normalizeAuthorId(a?.author?.id ?? "");
      if (!authorId) {
        return null;
      }
      return {
        authorId,
        name: (a?.author?.display_name || "").trim() || "Unknown researcher",
        orcid: a?.author?.orcid?.trim() || undefined,
        authorPosition: a?.author_position?.trim() || undefined,
        institutions: (a?.institutions ?? [])
          .map((inst) => {
            const name = inst?.display_name?.trim();
            if (!name) {
              return null;
            }
            return {
              name,
              id: normalizeAuthorId(inst?.id ?? "") || undefined,
              countryCode: inst?.country_code?.trim() || undefined,
              type: inst?.type?.trim() || undefined,
            };
          })
          .filter((x): x is NonNullable<typeof x> => x != null),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  return {
    id,
    title,
    year:
      typeof raw.publication_year === "number"
        ? raw.publication_year
        : undefined,
    publicationDate: raw.publication_date ?? undefined,
    doi: raw.doi?.replace(/^https?:\/\/doi\.org\//i, "") || undefined,
    openAlexUrl: `https://openalex.org/${id}`,
    citedByCount:
      typeof raw.cited_by_count === "number" ? raw.cited_by_count : undefined,
    sourceName: raw.primary_location?.source?.display_name?.trim() || undefined,
    abstract: abstract || undefined,
    topics: uniqueStrings(topics),
    keywords: uniqueStrings(keywords),
    isRetracted: Boolean(raw.is_retracted),
    authorships,
  };
}

function isScholarlyWork(work: AggregateWorkInput): work is ScholarlyWork {
  const candidate = work as ScholarlyWork;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.isRetracted === "boolean" &&
    Array.isArray(candidate.topics) &&
    Array.isArray(candidate.keywords) &&
    Array.isArray(candidate.authorships) &&
    (candidate.authorships.length === 0 ||
      typeof candidate.authorships[0]?.authorId === "string")
  );
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function buildRelevantWorks(
  works: ScholarlyWork[],
  evidence: EvidenceMatch[],
): RelevantWork[] {
  const criteriaByWork = new Map<string, Set<string>>();
  for (const match of evidence) {
    const id = normalizeWorkId(match.workId);
    if (!criteriaByWork.has(id)) {
      criteriaByWork.set(id, new Set());
    }
    criteriaByWork.get(id)!.add(match.criterion);
  }

  const relevant: RelevantWork[] = [];
  for (const work of works) {
    const id = normalizeWorkId(work.id);
    const matched = criteriaByWork.get(id);
    if (!matched || matched.size === 0) {
      continue;
    }
    relevant.push({
      id,
      title: work.title,
      year: work.year,
      doi: work.doi,
      openAlexUrl: work.openAlexUrl ?? toOpenAlexWorkUrl(id),
      citedByCount: work.citedByCount,
      sourceName: work.sourceName,
      abstractSnippet: work.abstract
        ? softClip(work.abstract, 240)
        : undefined,
      isRetracted: work.isRetracted,
      matchedCriteria: [...matched],
    });
  }

  relevant.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  return relevant;
}

function deriveLikelyInstitution(
  works: ScholarlyWork[],
  authorId: string,
): LikelyInstitution | undefined {
  const targetId = normalizeAuthorId(authorId);
  const sorted = [...works].sort((a, b) => {
    const ay = a.year ?? (a.publicationDate ? Date.parse(a.publicationDate) : 0);
    const by = b.year ?? (b.publicationDate ? Date.parse(b.publicationDate) : 0);
    return by - ay;
  });

  for (const work of sorted) {
    const authorship = work.authorships.find(
      (a) => normalizeAuthorId(a.authorId) === targetId,
    );
    const institution = authorship?.institutions[0];
    if (institution?.name) {
      return { ...institution };
    }
  }

  return undefined;
}

function filterEvidence(
  evidence: EvidenceMatch[],
  criteria: string[],
): EvidenceMatch[] {
  const keys = new Set(criteria.map((c) => normalizeKey(c)));
  return evidence.filter((e) => keys.has(normalizeKey(e.criterion)));
}

function dedupeEvidence(matches: EvidenceMatch[]): EvidenceMatch[] {
  const rank: Record<EvidenceMatch["confidence"], number> = {
    direct: 3,
    strong_adjacent: 2,
    possible: 1,
  };
  // One best match per criterion for summary tags; paper-level detail lives on relevantWorks.
  const best = new Map<string, EvidenceMatch>();
  for (const match of matches) {
    const key = normalizeKey(match.criterion);
    const existing = best.get(key);
    if (!existing || rank[match.confidence] > rank[existing.confidence]) {
      best.set(key, match);
    } else if (
      existing &&
      rank[match.confidence] === rank[existing.confidence] &&
      (match.year ?? 0) > (existing.year ?? 0)
    ) {
      best.set(key, match);
    }
  }
  return [...best.values()];
}

function workMentionsAnyCriterion(
  work: ScholarlyWork,
  criteria: SourcingCriteria,
): boolean {
  const terms = [
    ...criteria.requiredTechniques,
    ...criteria.preferredTechniques,
    ...criteria.researchAreas,
    ...criteria.organismsOrSystems,
  ];
  if (terms.length === 0) {
    return true;
  }
  const hay = `${work.title} ${work.abstract ?? ""} ${work.topics.join(" ")} ${work.keywords.join(" ")}`.toLowerCase();
  return terms.some((t) => {
    const key = t.toLowerCase().trim();
    return key.length > 0 && hay.includes(key);
  });
}

function normalizeAuthorId(id: string): string {
  const trimmed = id.trim();
  if (!trimmed) {
    return "";
  }
  const match = trimmed.match(/A\d+/i);
  if (match) {
    return match[0].toUpperCase();
  }
  return trimmed.replace(/^https?:\/\/openalex\.org\//i, "");
}

function normalizeWorkId(id: string): string {
  const trimmed = id.trim();
  if (!trimmed) {
    return "";
  }
  const match = trimmed.match(/W\d+/i);
  if (match) {
    return match[0].toUpperCase();
  }
  return trimmed.replace(/^https?:\/\/openalex\.org\//i, "");
}

function toOpenAlexAuthorUrl(authorId: string): string {
  const id = normalizeAuthorId(authorId);
  return `https://openalex.org/${id}`;
}

function toOpenAlexWorkUrl(workId: string): string {
  const id = normalizeWorkId(workId);
  return `https://openalex.org/${id}`;
}

function uniqueNumbers(values: number[]): number[] {
  return [...new Set(values)];
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function softClip(value: string, max: number): string {
  const collapsed = value.replace(/\s+/g, " ").trim();
  if (collapsed.length <= max) {
    return collapsed;
  }
  return `${collapsed.slice(0, max - 1).trimEnd()}…`;
}
