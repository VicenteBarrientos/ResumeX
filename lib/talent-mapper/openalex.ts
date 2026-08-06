/** OpenAlex client for Talent Mapper — server-only. */
import "server-only";

import { reconstructAbstract } from "@/lib/talent-mapper/abstract";
import {
  TalentMapperError,
  normalizeOpenAlexHttpError,
} from "@/lib/talent-mapper/errors";
import type { ScholarlyWork, SearchQuery } from "@/lib/talent-mapper/types";

export const OPENALEX_BASE = "https://api.openalex.org";

const DEFAULT_PER_PAGE = 25;
const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_RETRIES = 3;

const WORK_SELECT = [
  "id",
  "doi",
  "display_name",
  "title",
  "publication_year",
  "publication_date",
  "cited_by_count",
  "authorships",
  "primary_topic",
  "topics",
  "keywords",
  "abstract_inverted_index",
  "primary_location",
  "locations",
  "is_retracted",
].join(",");

export type OpenAlexAuthorRef = {
  id?: string | null;
  display_name?: string | null;
  orcid?: string | null;
};

export type OpenAlexInstitutionRef = {
  id?: string | null;
  display_name?: string | null;
  ror?: string | null;
  country_code?: string | null;
  type?: string | null;
};

export type OpenAlexAuthorship = {
  author_position?: string | null;
  author?: OpenAlexAuthorRef | null;
  institutions?: OpenAlexInstitutionRef[] | null;
  raw_affiliation_strings?: string[] | null;
};

export type OpenAlexTopic = {
  id?: string | null;
  display_name?: string | null;
};

export type OpenAlexKeyword = {
  id?: string | null;
  display_name?: string | null;
  keyword?: string | null;
};

export type OpenAlexSource = {
  id?: string | null;
  display_name?: string | null;
};

export type OpenAlexLocation = {
  source?: OpenAlexSource | null;
  landing_page_url?: string | null;
  pdf_url?: string | null;
};

export type OpenAlexWorkRaw = {
  id?: string | null;
  doi?: string | null;
  display_name?: string | null;
  title?: string | null;
  publication_year?: number | null;
  publication_date?: string | null;
  cited_by_count?: number | null;
  authorships?: OpenAlexAuthorship[] | null;
  primary_topic?: OpenAlexTopic | null;
  topics?: OpenAlexTopic[] | null;
  keywords?: OpenAlexKeyword[] | null;
  abstract_inverted_index?: Record<string, number[]> | null;
  primary_location?: OpenAlexLocation | null;
  locations?: OpenAlexLocation[] | null;
  is_retracted?: boolean | null;
};

export type OpenAlexWorksResponse = {
  meta?: {
    count?: number;
    db_response_time_ms?: number;
    page?: number;
    per_page?: number;
  };
  results?: OpenAlexWorkRaw[];
  message?: string;
  error?: string;
};

export type SearchWorksOptions = {
  apiKey?: string;
  mailto?: string;
  perPage?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type SearchWorksResult = {
  works: ScholarlyWork[];
  worksReviewed: number;
  warnings: string[];
  queriesExecuted: SearchQuery[];
};

/**
 * Search OpenAlex /works for each enabled query, with timeout, retries,
 * 429 handling, and work deduplication.
 */
export async function searchWorks(
  queries: SearchQuery[],
  options: SearchWorksOptions = {},
): Promise<SearchWorksResult> {
  const apiKey = options.apiKey?.trim();
  const mailto = options.mailto?.trim();

  if (!apiKey && !mailto) {
    throw new TalentMapperError(
      "Live search is not configured. Add OPENALEX_API_KEY to use current public research data, or continue with the demo snapshot.",
      "missing_openalex_key",
      503,
    );
  }

  const enabled = queries.filter((q) => q.enabled && q.query.trim());
  if (enabled.length === 0) {
    throw new TalentMapperError(
      "No enabled search queries. Enable or add at least one query before searching.",
      "no_queries",
      400,
    );
  }

  const perPage = options.perPage ?? DEFAULT_PER_PAGE;
  const warnings: string[] = [];
  const collected: ScholarlyWork[] = [];
  const executed: SearchQuery[] = [];

  for (const query of enabled) {
    if (options.signal?.aborted) {
      warnings.push(
        "Search stopped early because the request deadline was reached. Partial results may be incomplete.",
      );
      break;
    }
    try {
      const rawWorks = await fetchWorksForQuery(query.query, {
        apiKey,
        mailto,
        perPage,
        signal: options.signal,
        timeoutMs: options.timeoutMs,
      });
      executed.push(query);
      for (const raw of rawWorks) {
        const normalized = normalizeOpenAlexWork(raw);
        if (normalized) {
          collected.push(normalized);
        }
      }
    } catch (error) {
      if (error instanceof TalentMapperError) {
        // Hard auth/quota failures should abort the whole search
        if (
          error.code === "invalid_openalex_key" ||
          error.code === "openalex_quota" ||
          error.code === "missing_openalex_key"
        ) {
          throw error;
        }
        // Rate limit: keep works already fetched; do not burn more quota.
        if (error.code === "openalex_rate_limit") {
          warnings.push(
            `Stopped after query “${query.label}”: ${error.message}`,
          );
          break;
        }
        warnings.push(
          `Query “${query.label}” failed: ${error.message}`,
        );
        continue;
      }
      throw normalizeTalentMapperOpenAlexError(error);
    }
  }

  const works = dedupeScholarlyWorks(collected);

  if (works.length === 0 && warnings.length === 0) {
    warnings.push(
      "No works found. Try adding adjacent terminology, broadening the publication window, or removing one required technique.",
    );
  }

  const withoutAuthors = works.filter((w) => w.authorships.length === 0);
  if (withoutAuthors.length > 0 && withoutAuthors.length === works.length) {
    warnings.push(
      "Works were found but author metadata was missing. Try another query or demo snapshot.",
    );
  }

  return {
    works,
    worksReviewed: works.length,
    warnings,
    queriesExecuted: executed,
  };
}

async function fetchWorksForQuery(
  query: string,
  options: {
    apiKey?: string;
    mailto?: string;
    perPage: number;
    signal?: AbortSignal;
    timeoutMs?: number;
  },
): Promise<OpenAlexWorkRaw[]> {
  const url = new URL(`${OPENALEX_BASE}/works`);
  url.searchParams.set("search", query);
  url.searchParams.set("per_page", String(options.perPage));
  url.searchParams.set("select", WORK_SELECT);

  if (options.apiKey) {
    url.searchParams.set("api_key", options.apiKey);
  }
  if (options.mailto) {
    url.searchParams.set("mailto", options.mailto);
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= MAX_RETRIES) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const onParentAbort = () => controller.abort();
    options.signal?.addEventListener("abort", onParentAbort);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      if (response.status === 429) {
        const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
        if (attempt >= MAX_RETRIES) {
          throw new TalentMapperError(
            "OpenAlex rate limit exceeded. Please wait and try again, or use the demo snapshot.",
            "openalex_rate_limit",
            429,
          );
        }
        await sleep(retryAfter ?? backoffMs(attempt));
        attempt += 1;
        continue;
      }

      if (!response.ok) {
        const bodyText = await safeReadText(response);
        throw normalizeOpenAlexHttpError(response.status, bodyText);
      }

      const data = (await response.json()) as OpenAlexWorksResponse;
      return Array.isArray(data.results) ? data.results : [];
    } catch (error) {
      lastError = error;

      if (error instanceof TalentMapperError) {
        if (
          error.code === "openalex_rate_limit" &&
          attempt < MAX_RETRIES
        ) {
          await sleep(backoffMs(attempt));
          attempt += 1;
          continue;
        }
        throw error;
      }

      if (isAbortError(error)) {
        if (options.signal?.aborted) {
          throw new TalentMapperError(
            "The OpenAlex search was cancelled.",
            "openalex_aborted",
            499,
            error,
          );
        }
        if (attempt < MAX_RETRIES) {
          await sleep(backoffMs(attempt));
          attempt += 1;
          continue;
        }
        throw new TalentMapperError(
          "The OpenAlex request timed out. Please try again or use the demo snapshot.",
          "openalex_timeout",
          504,
          error,
        );
      }

      if (attempt < MAX_RETRIES && isTransientNetworkError(error)) {
        await sleep(backoffMs(attempt));
        attempt += 1;
        continue;
      }

      throw normalizeTalentMapperOpenAlexError(error);
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", onParentAbort);
    }
  }

  throw normalizeTalentMapperOpenAlexError(lastError);
}

export function normalizeOpenAlexWork(
  raw: OpenAlexWorkRaw,
): ScholarlyWork | null {
  const id = extractOpenAlexId(raw.id);
  if (!id) {
    return null;
  }

  const title =
    (raw.display_name || raw.title || "").trim() || "Untitled work";

  const topics = [
    raw.primary_topic?.display_name,
    ...(raw.topics ?? []).map((t) => t.display_name),
  ]
    .filter((t): t is string => Boolean(t && t.trim()))
    .map((t) => t.trim());

  const keywords = (raw.keywords ?? [])
    .map((k) => (k.display_name || k.keyword || "").trim())
    .filter(Boolean);

  const abstract = reconstructAbstract(raw.abstract_inverted_index ?? null);

  const sourceName =
    raw.primary_location?.source?.display_name?.trim() ||
    raw.locations?.[0]?.source?.display_name?.trim() ||
    undefined;

  const authorships = (raw.authorships ?? [])
    .map((a) => {
      const authorId = extractOpenAlexId(a.author?.id);
      if (!authorId) {
        return null;
      }
      return {
        authorId,
        name: (a.author?.display_name || "").trim() || "Unknown researcher",
        orcid: a.author?.orcid?.trim() || undefined,
        authorPosition: a.author_position?.trim() || undefined,
        institutions: (a.institutions ?? [])
          .map((inst) => {
            const name = inst.display_name?.trim();
            if (!name) {
              return null;
            }
            return {
              name,
              id: extractOpenAlexId(inst.id) || undefined,
              countryCode: inst.country_code?.trim() || undefined,
              type: inst.type?.trim() || undefined,
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
    openAlexId: id,
    openAlexUrl: `https://openalex.org/${id}`,
    citedByCount:
      typeof raw.cited_by_count === "number" ? raw.cited_by_count : undefined,
    sourceName,
    abstract: abstract || undefined,
    topics: uniqueStrings(topics),
    keywords: uniqueStrings(keywords),
    isRetracted: Boolean(raw.is_retracted),
    retractionStatus: raw.is_retracted ? "retracted" : "none",
    sources: ["openalex"],
    sourceRefs: [
      {
        source: "openalex",
        sourceId: id,
        url: `https://openalex.org/${id}`,
      },
    ],
    authorships,
  };
}

export function dedupeScholarlyWorks(works: ScholarlyWork[]): ScholarlyWork[] {
  const map = new Map<string, ScholarlyWork>();
  for (const work of works) {
    if (!map.has(work.id)) {
      map.set(work.id, work);
    }
  }
  return [...map.values()];
}

export function extractOpenAlexId(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }
  const match = value.trim().match(/([WAISPCYF]\d+)/i);
  return match ? match[1].toUpperCase() : null;
}

function normalizeTalentMapperOpenAlexError(error: unknown): TalentMapperError {
  if (error instanceof TalentMapperError) {
    return error;
  }
  if (isAbortError(error)) {
    return new TalentMapperError(
      "The OpenAlex request timed out. Please try again or use the demo snapshot.",
      "openalex_timeout",
      504,
      error,
    );
  }
  return new TalentMapperError(
    "OpenAlex is temporarily unavailable. Please try again or use the demo snapshot.",
    "openalex_unavailable",
    503,
    error,
  );
}

export function getOpenAlexApiKey(): string | undefined {
  const value = process.env.OPENALEX_API_KEY;
  return value?.trim() || undefined;
}

export function isOpenAlexConfigured(): boolean {
  return Boolean(getOpenAlexApiKey());
}

/**
 * API-facing OpenAlex search wrapper used by route handlers.
 */
export async function searchOpenAlexWorks(
  queries: SearchQuery[],
  options: SearchWorksOptions = {},
): Promise<{
  works: ScholarlyWork[];
  warnings: string[];
  queriesRun: string[];
}> {
  const result = await searchWorks(queries, {
    ...options,
    apiKey: options.apiKey ?? getOpenAlexApiKey(),
    mailto: options.mailto ?? process.env.OPENALEX_MAILTO?.trim(),
  });

  return {
    works: result.works,
    warnings: result.warnings,
    queriesRun: result.queriesExecuted.map((q) => q.query),
  };
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) {
    return null;
  }
  const asInt = Number(header);
  if (Number.isFinite(asInt) && asInt >= 0) {
    return Math.min(asInt * 1000, 30_000);
  }
  const date = Date.parse(header);
  if (!Number.isNaN(date)) {
    return Math.min(Math.max(date - Date.now(), 0), 30_000);
  }
  return null;
}

function backoffMs(attempt: number): number {
  const base = 400 * 2 ** attempt;
  const jitter = Math.floor(Math.random() * 200);
  return Math.min(base + jitter, 8_000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === "AbortError") ||
    (typeof DOMException !== "undefined" &&
      error instanceof DOMException &&
      error.name === "AbortError")
  );
}

function isTransientNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const msg = error.message.toLowerCase();
  return (
    msg.includes("fetch failed") ||
    msg.includes("network") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket")
  );
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = v.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(v);
  }
  return out;
}
