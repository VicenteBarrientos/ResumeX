import "server-only";

import { aggregateAuthors } from "@/lib/talent-mapper/aggregate-authors";
import {
  searchDemoPubmedWorks,
  searchDemoWorks,
} from "@/lib/talent-mapper/demo-data";
import { mergeScholarlyWorks } from "@/lib/talent-mapper/merge/merge-works";
import {
  findPossibleDuplicateAuthorIds,
  reconcileAuthorsOnWorks,
} from "@/lib/talent-mapper/merge/reconcile-authors";
import {
  getOpenAlexApiKey,
  isOpenAlexConfigured,
  searchOpenAlexWorks,
} from "@/lib/talent-mapper/openalex";
import {
  isPubmedConfigured,
  searchPubmedWorks,
} from "@/lib/talent-mapper/providers/pubmed";
import type {
  ResearchSource,
  SearchMode,
  SearchQuery,
  ScholarlyWork,
  SourcingCriteria,
  TalentSearchResult,
} from "@/lib/talent-mapper/types";

const DISCLAIMER =
  "Talent Mapper uses public scholarly metadata to prioritize research evidence for recruiter review. Publication authorship does not establish a person’s exact experimental contribution, current employment, availability, work authorization, or hiring eligibility.";

export type OrchestratedSearchInput = {
  criteria: SourcingCriteria;
  mode: SearchMode;
  sources: ResearchSource[];
  openAlexQueries: SearchQuery[];
  pubmedQueries: SearchQuery[];
  limitPerQuery?: number;
  totalPerSource?: number;
  signal?: AbortSignal;
};

/**
 * Run selected research sources, merge canonical works, reconcile authors,
 * and aggregate researcher candidates. One provider failure does not discard
 * successful results from the other.
 */
export async function runTalentMapperSearch(
  input: OrchestratedSearchInput,
): Promise<TalentSearchResult> {
  const sources = uniqueSources(input.sources);
  const warnings: string[] = [];
  const diagnostics: NonNullable<TalentSearchResult["meta"]["diagnostics"]> = {
    sources: {},
  };

  const collected: ScholarlyWork[] = [];
  const openAlexQueriesUsed: string[] = [];
  const pubmedQueriesUsed: string[] = [];

  if (input.mode === "demo") {
    if (sources.includes("openalex")) {
      const demo = searchDemoWorks(input.openAlexQueries);
      warnings.push(...demo.warnings);
      openAlexQueriesUsed.push(...demo.queriesRun);
      collected.push(...demo.works);
      diagnostics.sources!.openalex = {
        status: "success",
        queryCount: input.openAlexQueries.filter((q) => q.enabled).length,
        rawRecordCount: demo.works.length,
        warnings: demo.warnings,
      };
    }
    if (sources.includes("pubmed")) {
      const demoPm = searchDemoPubmedWorks(input.pubmedQueries);
      warnings.push(...demoPm.warnings);
      pubmedQueriesUsed.push(...demoPm.queriesRun);
      collected.push(...demoPm.works);
      diagnostics.sources!.pubmed = {
        status: "success",
        queryCount: input.pubmedQueries.filter((q) => q.enabled).length,
        rawRecordCount: demoPm.works.length,
        uniquePmidCount: demoPm.works.filter((w) => w.pmid).length,
        fetchedRecordCount: demoPm.works.length,
        warnings: demoPm.warnings,
      };
    }
  } else {
    const tasks: Array<Promise<void>> = [];

    if (sources.includes("openalex")) {
      tasks.push(
        (async () => {
          const started = Date.now();
          if (!isOpenAlexConfigured()) {
            const message =
              "Live OpenAlex search is not configured. Add OPENALEX_API_KEY to enable current OpenAlex results.";
            warnings.push(message);
            diagnostics.sources!.openalex = {
              status: "unconfigured",
              errorCode: "missing_openalex_key",
              warnings: [message],
              durationMs: Date.now() - started,
            };
            return;
          }
          try {
            const result = await searchOpenAlexWorks(input.openAlexQueries, {
              apiKey: getOpenAlexApiKey(),
              perPage: input.limitPerQuery ?? 25,
              signal: input.signal,
              timeoutMs: 15_000,
            });
            warnings.push(...result.warnings);
            openAlexQueriesUsed.push(...result.queriesRun);
            for (const work of result.works) {
              collected.push({
                ...work,
                sources: work.sources ?? ["openalex"],
                openAlexId: work.openAlexId || work.id,
              });
            }
            diagnostics.sources!.openalex = {
              status: "success",
              queryCount: input.openAlexQueries.filter((q) => q.enabled).length,
              rawRecordCount: result.works.length,
              durationMs: Date.now() - started,
              warnings: result.warnings,
            };
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "OpenAlex search failed.";
            warnings.push(`OpenAlex: ${message}`);
            diagnostics.sources!.openalex = {
              status: "failed",
              durationMs: Date.now() - started,
              warnings: [message],
              errorCode: (error as { code?: string }).code,
            };
          }
        })(),
      );
    }

    if (sources.includes("pubmed")) {
      tasks.push(
        (async () => {
          if (!isPubmedConfigured()) {
            const message =
              "PubMed live search is not configured. Add NCBI_EMAIL and optionally NCBI_API_KEY to enable current PubMed results.";
            warnings.push(message);
            diagnostics.sources!.pubmed = {
              status: "unconfigured",
              errorCode: "PUBMED_NOT_CONFIGURED",
              warnings: [message],
            };
            return;
          }
          try {
            const result = await searchPubmedWorks({
              queries: input.pubmedQueries,
              criteria: input.criteria,
              limitPerQuery: input.limitPerQuery ?? 25,
              totalResultLimit: input.totalPerSource ?? 150,
              signal: input.signal,
            });
            warnings.push(...result.warnings);
            pubmedQueriesUsed.push(
              ...input.pubmedQueries
                .filter((q) => q.enabled && q.query.trim())
                .map((q) => q.query),
            );
            collected.push(...result.records);
            diagnostics.sources!.pubmed = result.diagnostics;
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "PubMed search failed.";
            warnings.push(`PubMed: ${message}`);
            diagnostics.sources!.pubmed = {
              status: "failed",
              warnings: [message],
              errorCode: (error as { code?: string }).code,
            };
          }
        })(),
      );
    }

    await Promise.all(tasks);
  }

  if (collected.length === 0) {
    const err = new Error(
      warnings[0] ||
        "No research sources returned results. Check configuration or try the demo snapshot.",
    );
    (err as { code?: string }).code = "no_works";
    (err as { action?: string }).action =
      "Enable at least one configured source, broaden queries, or use the demo snapshot.";
    throw err;
  }

  const merged = mergeScholarlyWorks(collected);
  diagnostics.deduplication = merged.diagnostics;
  const reconciled = reconcileAuthorsOnWorks(merged.works);

  const forAggregate = reconciled.map((w) => ({
    ...w,
    abstract: w.abstract ? softClip(w.abstract, 1200) : undefined,
  }));

  const candidates = aggregateAuthors(forAggregate, input.criteria, {
    limit: 60,
  }).filter(
    (c) =>
      c.matchedRequiredCriteria.length > 0 ||
      c.matchedResearchAreas.length + c.matchedOrganismsOrSystems.length >= 2,
  );

  const duplicateIds = findPossibleDuplicateAuthorIds(candidates);
  const ranked = candidates.slice(0, 50).map((c) => ({
    ...c,
    possibleDuplicate: duplicateIds.has(c.authorId) || c.possibleDuplicate,
    possibleConcerns: duplicateIds.has(c.authorId)
      ? [
          "Possible duplicate researcher — identity unresolved across sources; review before merging outreach.",
          ...c.possibleConcerns,
        ]
      : c.possibleConcerns,
    relevantWorks: c.relevantWorks.map((w) => ({
      ...w,
      abstractSnippet: w.abstractSnippet
        ? softClip(w.abstractSnippet, 240)
        : undefined,
    })),
  }));

  if (merged.diagnostics.mergedDuplicateCount > 0) {
    warnings.push(
      `${merged.diagnostics.canonicalWorkCount} unique publications identified from ${merged.diagnostics.sourceRecordCount} source records. ResumeX merged ${merged.diagnostics.mergedDuplicateCount} records that referred to the same publication.`,
    );
  }

  return {
    candidates: ranked,
    meta: {
      roleTitle: input.criteria.roleTitle,
      worksReviewed: merged.diagnostics.canonicalWorkCount,
      uniqueResearchers: ranked.length,
      mode: input.mode,
      queriesUsed: openAlexQueriesUsed,
      pubmedQueriesUsed,
      sourcesUsed: sources,
      searchedAt: new Date().toISOString(),
      disclaimer: DISCLAIMER,
      warnings: uniqueStrings(warnings),
      diagnostics,
    },
  };
}

function uniqueSources(sources: ResearchSource[]): ResearchSource[] {
  const order: ResearchSource[] = ["openalex", "pubmed"];
  const set = new Set(sources);
  const selected = order.filter((s) => set.has(s));
  return selected.length > 0 ? selected : ["openalex", "pubmed"];
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function softClip(value: string, max: number): string {
  const collapsed = value.replace(/\s+/g, " ").trim();
  if (collapsed.length <= max) return collapsed;
  return `${collapsed.slice(0, max - 1).trimEnd()}…`;
}
