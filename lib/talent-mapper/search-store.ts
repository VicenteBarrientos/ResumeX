import type { Prisma } from "@prisma/client";
import type {
  ResearchSource,
  SearchMode,
  SearchQuery,
  SourcingCriteria,
  TalentSearchResult,
} from "@/lib/talent-mapper/types";

export type TalentSearchUiStep = "role" | "criteria" | "strategy" | "results";

export type TalentSearchCriteriaPayload = {
  criteria: SourcingCriteria | null;
  extractedCriteria: SourcingCriteria | null;
};

export type TalentSearchSummary = {
  id: string;
  roleTitle: string;
  mode: SearchMode;
  worksReviewed: number;
  candidateCount: number;
  shortlistedCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TalentSearchDetail = {
  id: string;
  step: TalentSearchUiStep | null;
  roleTitle: string;
  jobDescription: string;
  criteria: SourcingCriteria | null;
  extractedCriteria: SourcingCriteria | null;
  queries: SearchQuery[];
  pubmedQueries: SearchQuery[];
  sources: ResearchSource[];
  mode: SearchMode;
  result: TalentSearchResult | null;
  shortlist: string[];
  notes: Record<string, string>;
  worksReviewed: number;
  createdAt: string;
  updatedAt: string;
};

export type TalentSearchWriteInput = {
  roleTitle: string;
  jobDescription?: string;
  criteria?: SourcingCriteria | null;
  extractedCriteria?: SourcingCriteria | null;
  queries?: SearchQuery[];
  pubmedQueries?: SearchQuery[];
  sources?: ResearchSource[];
  mode?: SearchMode;
  result?: TalentSearchResult | null;
  uiStep?: TalentSearchUiStep | null;
  shortlist?: string[];
  notes?: Record<string, string>;
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function parseCriteriaPayload(value: unknown): TalentSearchCriteriaPayload {
  const obj = asObject(value);
  if (!obj) {
    return { criteria: null, extractedCriteria: null };
  }
  return {
    criteria: (obj.criteria as SourcingCriteria | null) ?? null,
    extractedCriteria: (obj.extractedCriteria as SourcingCriteria | null) ?? null,
  };
}

export function toCriteriaJson(
  criteria: SourcingCriteria | null | undefined,
  extractedCriteria: SourcingCriteria | null | undefined,
): Prisma.InputJsonValue {
  return {
    criteria: criteria ?? null,
    extractedCriteria: extractedCriteria ?? null,
  };
}

export type ParsedQueriesPayload = {
  queries: SearchQuery[];
  pubmedQueries: SearchQuery[];
  sources: ResearchSource[];
};

/**
 * Backward-compatible queries JSON:
 * - legacy: SearchQuery[]
 * - current: { openalex, pubmed, sources }
 */
export function parseQueriesPayload(value: unknown): ParsedQueriesPayload {
  if (Array.isArray(value)) {
    return {
      queries: value as SearchQuery[],
      pubmedQueries: [],
      sources: ["openalex", "pubmed"],
    };
  }
  const obj = asObject(value);
  if (!obj) {
    return { queries: [], pubmedQueries: [], sources: ["openalex", "pubmed"] };
  }
  const sourcesRaw = Array.isArray(obj.sources) ? obj.sources : [];
  const sources = sourcesRaw.filter(
    (s): s is ResearchSource => s === "openalex" || s === "pubmed",
  );
  return {
    queries: Array.isArray(obj.openalex)
      ? (obj.openalex as SearchQuery[])
      : Array.isArray(obj.queries)
        ? (obj.queries as SearchQuery[])
        : [],
    pubmedQueries: Array.isArray(obj.pubmed)
      ? (obj.pubmed as SearchQuery[])
      : Array.isArray(obj.pubmedQueries)
        ? (obj.pubmedQueries as SearchQuery[])
        : [],
    sources:
      sources.length > 0 ? sources : (["openalex", "pubmed"] as ResearchSource[]),
  };
}

export function parseQueries(value: unknown): SearchQuery[] {
  return parseQueriesPayload(value).queries;
}

export function toQueriesJson(
  queries: SearchQuery[] | undefined,
  pubmedQueries?: SearchQuery[],
  sources?: ResearchSource[],
): Prisma.InputJsonValue {
  return {
    openalex: queries ?? [],
    pubmed: pubmedQueries ?? [],
    sources: sources ?? ["openalex", "pubmed"],
  };
}

export function parseResult(value: unknown): TalentSearchResult | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as TalentSearchResult;
}

export function candidateCountFromResult(result: TalentSearchResult | null): number {
  return result?.candidates?.length ?? 0;
}

export function worksReviewedFromResult(result: TalentSearchResult | null): number {
  return result?.meta?.worksReviewed ?? 0;
}

type SearchRow = {
  id: string;
  roleTitle: string;
  jobDescription: string;
  criteriaJson: unknown;
  queriesJson: unknown;
  mode: string;
  resultJson: unknown;
  worksReviewed: number;
  uiStep: string | null;
  createdAt: Date;
  updatedAt: Date;
  shortlist?: Array<{ authorId: string }>;
  notes?: Array<{ authorId: string; body: string }>;
  _count?: { shortlist: number };
};

export function toSearchSummary(row: SearchRow): TalentSearchSummary {
  const result = parseResult(row.resultJson);
  return {
    id: row.id,
    roleTitle: row.roleTitle,
    mode: row.mode === "live" ? "live" : "demo",
    worksReviewed: row.worksReviewed,
    candidateCount: candidateCountFromResult(result),
    shortlistedCount: row._count?.shortlist ?? row.shortlist?.length ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toSearchDetail(row: SearchRow): TalentSearchDetail {
  const { criteria, extractedCriteria } = parseCriteriaPayload(row.criteriaJson);
  const notes: Record<string, string> = {};
  for (const note of row.notes ?? []) {
    notes[note.authorId] = note.body;
  }

  const step =
    row.uiStep === "role" ||
    row.uiStep === "criteria" ||
    row.uiStep === "strategy" ||
    row.uiStep === "results"
      ? row.uiStep
      : null;

  const q = parseQueriesPayload(row.queriesJson);

  return {
    id: row.id,
    step,
    roleTitle: row.roleTitle,
    jobDescription: row.jobDescription,
    criteria,
    extractedCriteria,
    queries: q.queries,
    pubmedQueries: q.pubmedQueries,
    sources: q.sources,
    mode: row.mode === "live" ? "live" : "demo",
    result: parseResult(row.resultJson),
    shortlist: (row.shortlist ?? []).map((entry) => entry.authorId),
    notes,
    worksReviewed: row.worksReviewed,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
