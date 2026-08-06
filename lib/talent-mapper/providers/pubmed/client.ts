/** PubMed / NCBI E-utilities client — server-only. */
import "server-only";

import {
  PubmedError,
  pubmedErrorMessage,
} from "@/lib/talent-mapper/providers/pubmed/errors";
import {
  parseEsearchResponse,
  prioritizePmidsByRrf,
  type PmidQueryHit,
} from "@/lib/talent-mapper/providers/pubmed/parse-esearch";
import { parsePubmedXml } from "@/lib/talent-mapper/providers/pubmed/parse-pubmed-xml";
import { normalizePubmedArticle } from "@/lib/talent-mapper/providers/pubmed/normalize";
import { schedulePubmedRequest } from "@/lib/talent-mapper/providers/pubmed/throttle";
import type {
  ResearchSearchProvider,
  SourceSearchInput,
  SourceSearchResult,
} from "@/lib/talent-mapper/providers/types";
import type { QueryMatchReference, SearchQuery } from "@/lib/talent-mapper/types";

export const NCBI_EUTILS_BASE =
  "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_RETRIES = 3;
const EFETCH_BATCH_SIZE = 100;

export type PubmedConfig = {
  email?: string;
  apiKey?: string;
  tool?: string;
  enabled?: boolean;
  maxResultsPerQuery?: number;
  maxTotalRecords?: number;
};

export function getPubmedConfig(): PubmedConfig {
  return {
    email: process.env.NCBI_EMAIL?.trim() || undefined,
    apiKey: process.env.NCBI_API_KEY?.trim() || undefined,
    tool: process.env.NCBI_TOOL?.trim() || "ResumeXTalentMapper",
    enabled: process.env.PUBMED_ENABLED !== "false",
    maxResultsPerQuery: Number(process.env.PUBMED_MAX_RESULTS_PER_QUERY || 25),
    maxTotalRecords: Number(process.env.PUBMED_MAX_TOTAL_RECORDS || 150),
  };
}

export function isPubmedConfigured(): boolean {
  const cfg = getPubmedConfig();
  return Boolean(cfg.enabled && cfg.email);
}

export function isPubmedEnabled(): boolean {
  return getPubmedConfig().enabled !== false;
}

export const pubmedProvider: ResearchSearchProvider = {
  id: "pubmed",
  displayName: "PubMed",
  isConfigured: isPubmedConfigured,
  search: searchPubmedWorks,
};

export async function searchPubmedWorks(
  input: SourceSearchInput,
): Promise<SourceSearchResult> {
  const started = Date.now();
  const cfg = getPubmedConfig();
  const warnings: string[] = [];

  if (!cfg.enabled) {
    return {
      source: "pubmed",
      records: [],
      diagnostics: {
        status: "skipped",
        warnings: ["PubMed is disabled via PUBMED_ENABLED=false."],
        durationMs: Date.now() - started,
      },
      warnings: ["PubMed is disabled via PUBMED_ENABLED=false."],
    };
  }

  if (!cfg.email) {
    const message = pubmedErrorMessage("PUBMED_NOT_CONFIGURED");
    return {
      source: "pubmed",
      records: [],
      diagnostics: {
        status: "unconfigured",
        errorCode: "PUBMED_NOT_CONFIGURED",
        warnings: [message],
        durationMs: Date.now() - started,
      },
      warnings: [message],
    };
  }

  const enabled = input.queries.filter((q) => q.enabled && q.query.trim());
  if (enabled.length === 0) {
    return {
      source: "pubmed",
      records: [],
      diagnostics: {
        status: "skipped",
        queryCount: 0,
        warnings: ["No enabled PubMed queries."],
        durationMs: Date.now() - started,
      },
      warnings: ["No enabled PubMed queries."],
    };
  }

  const limitPerQuery = Math.min(
    input.limitPerQuery || cfg.maxResultsPerQuery || 25,
    100,
  );
  const totalLimit = Math.min(
    input.totalResultLimit || cfg.maxTotalRecords || 150,
    300,
  );

  const hits: PmidQueryHit[] = [];
  let rawPmidCount = 0;

  for (const query of enabled) {
    if (input.signal?.aborted) {
      warnings.push("PubMed search stopped early (deadline).");
      break;
    }
    try {
      const esearch = await runEsearch(query, {
        cfg,
        retmax: limitPerQuery,
        signal: input.signal,
      });
      if (esearch.error) {
        warnings.push(`PubMed query “${query.label}”: ${esearch.error}`);
        continue;
      }
      warnings.push(...esearch.warnings.map((w) => `PubMed: ${w}`));
      rawPmidCount += esearch.pmids.length;
      esearch.pmids.forEach((pmid, index) => {
        hits.push({ pmid, queryId: query.id, rank: index + 1 });
      });
    } catch (error) {
      if (error instanceof PubmedError) {
        if (error.code === "PUBMED_RATE_LIMITED") {
          warnings.push(error.message);
          break;
        }
        if (
          error.code === "PUBMED_NOT_CONFIGURED" ||
          error.code === "PUBMED_ABORTED"
        ) {
          throw error;
        }
        warnings.push(`PubMed query “${query.label}”: ${error.message}`);
        continue;
      }
      throw error;
    }
  }

  const prioritized = prioritizePmidsByRrf(hits, totalLimit);
  const pmidList = prioritized.map((p) => p.pmid);

  if (pmidList.length === 0) {
    return {
      source: "pubmed",
      records: [],
      diagnostics: {
        status: "success",
        queryCount: enabled.length,
        rawRecordCount: rawPmidCount,
        uniquePmidCount: 0,
        fetchedRecordCount: 0,
        durationMs: Date.now() - started,
        warnings,
      },
      warnings,
    };
  }

  const records = [];
  let fetched = 0;

  for (let i = 0; i < pmidList.length; i += EFETCH_BATCH_SIZE) {
    if (input.signal?.aborted) {
      warnings.push("PubMed EFetch stopped early (deadline).");
      break;
    }
    const batch = pmidList.slice(i, i + EFETCH_BATCH_SIZE);
    try {
      const xml = await runEfetch(batch, { cfg, signal: input.signal });
      const { articles, warnings: parseWarnings } = parsePubmedXml(xml);
      warnings.push(...parseWarnings.filter((w) => !w.includes("abstract missing")));
      for (const article of articles) {
        const matches = prioritized.find((p) => p.pmid === article.pmid);
        const queryMatches: QueryMatchReference[] = (matches?.queryMatches || []).map(
          (m) => ({
            source: "pubmed" as const,
            queryId: m.queryId,
            rank: m.rank,
          }),
        );
        const normalized = normalizePubmedArticle(article, { queryMatches });
        if (normalized) {
          records.push(normalized);
          fetched += 1;
        } else {
          warnings.push(`PMID ${article.pmid} could not be normalized.`);
        }
      }
    } catch (error) {
      if (error instanceof PubmedError) {
        warnings.push(error.message);
        if (error.code === "PUBMED_RATE_LIMITED") break;
        continue;
      }
      throw error;
    }
  }

  return {
    source: "pubmed",
    records,
    diagnostics: {
      status: "success",
      queryCount: enabled.length,
      rawRecordCount: rawPmidCount,
      uniquePmidCount: pmidList.length,
      fetchedRecordCount: fetched,
      durationMs: Date.now() - started,
      warnings,
    },
    warnings,
  };
}

async function runEsearch(
  query: SearchQuery,
  options: {
    cfg: PubmedConfig;
    retmax: number;
    signal?: AbortSignal;
  },
): Promise<ReturnType<typeof parseEsearchResponse>> {
  const params = new URLSearchParams();
  params.set("db", "pubmed");
  params.set("term", query.query);
  params.set("retmode", "json");
  params.set("sort", "relevance");
  params.set("retmax", String(options.retmax));
  params.set("tool", options.cfg.tool || "ResumeXTalentMapper");
  params.set("email", options.cfg.email!);
  if (options.cfg.apiKey) {
    params.set("api_key", options.cfg.apiKey);
  }

  const text = await ncbiRequest({
    path: "/esearch.fcgi",
    body: params,
    cfg: options.cfg,
    signal: options.signal,
  });

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new PubmedError(
      pubmedErrorMessage("PUBMED_INVALID_RESPONSE"),
      "PUBMED_INVALID_RESPONSE",
    );
  }

  const parsed = parseEsearchResponse(json);
  if (parsed.error) {
    throw new PubmedError(
      parsed.error.slice(0, 200),
      "PUBMED_INVALID_QUERY",
      400,
    );
  }
  return parsed;
}

async function runEfetch(
  pmids: string[],
  options: { cfg: PubmedConfig; signal?: AbortSignal },
): Promise<string> {
  const params = new URLSearchParams();
  params.set("db", "pubmed");
  params.set("id", pmids.join(","));
  params.set("retmode", "xml");
  params.set("rettype", "abstract");
  params.set("tool", options.cfg.tool || "ResumeXTalentMapper");
  params.set("email", options.cfg.email!);
  if (options.cfg.apiKey) {
    params.set("api_key", options.cfg.apiKey);
  }

  return ncbiRequest({
    path: "/efetch.fcgi",
    body: params,
    cfg: options.cfg,
    signal: options.signal,
  });
}

async function ncbiRequest(args: {
  path: string;
  body: URLSearchParams;
  cfg: PubmedConfig;
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<string> {
  const timeoutMs = args.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= MAX_RETRIES) {
    await schedulePubmedRequest(Boolean(args.cfg.apiKey), args.signal);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const onParentAbort = () => controller.abort();
    args.signal?.addEventListener("abort", onParentAbort);

    try {
      const response = await fetch(`${NCBI_EUTILS_BASE}${args.path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "*/*",
        },
        body: args.body.toString(),
        signal: controller.signal,
      });

      if (response.status === 429) {
        const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
        if (attempt >= MAX_RETRIES) {
          throw new PubmedError(
            pubmedErrorMessage("PUBMED_RATE_LIMITED"),
            "PUBMED_RATE_LIMITED",
            429,
          );
        }
        await sleep(retryAfter ?? backoffMs(attempt));
        attempt += 1;
        continue;
      }

      if (response.status >= 500) {
        if (attempt >= MAX_RETRIES) {
          throw new PubmedError(
            pubmedErrorMessage("PUBMED_UNAVAILABLE"),
            "PUBMED_UNAVAILABLE",
            response.status,
          );
        }
        await sleep(backoffMs(attempt));
        attempt += 1;
        continue;
      }

      if (response.status >= 400) {
        throw new PubmedError(
          pubmedErrorMessage("PUBMED_INVALID_QUERY"),
          "PUBMED_INVALID_QUERY",
          response.status,
        );
      }

      return await response.text();
    } catch (error) {
      lastError = error;
      if (error instanceof PubmedError) throw error;

      if (isAbortError(error)) {
        if (args.signal?.aborted) {
          throw new PubmedError(
            pubmedErrorMessage("PUBMED_ABORTED"),
            "PUBMED_ABORTED",
            499,
          );
        }
        if (attempt < MAX_RETRIES) {
          await sleep(backoffMs(attempt));
          attempt += 1;
          continue;
        }
        throw new PubmedError(
          pubmedErrorMessage("PUBMED_TIMEOUT"),
          "PUBMED_TIMEOUT",
          504,
        );
      }

      if (attempt < MAX_RETRIES) {
        await sleep(backoffMs(attempt));
        attempt += 1;
        continue;
      }

      throw new PubmedError(
        pubmedErrorMessage("PUBMED_UNAVAILABLE"),
        "PUBMED_UNAVAILABLE",
        503,
      );
    } finally {
      clearTimeout(timeout);
      args.signal?.removeEventListener("abort", onParentAbort);
    }
  }

  throw (
    lastError instanceof PubmedError
      ? lastError
      : new PubmedError(
          pubmedErrorMessage("PUBMED_UNAVAILABLE"),
          "PUBMED_UNAVAILABLE",
          503,
        )
  );
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
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
  const bases = [500, 1000, 2000];
  const base = bases[Math.min(attempt, bases.length - 1)];
  const jitter = Math.floor(Math.random() * 200);
  return base + jitter;
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
