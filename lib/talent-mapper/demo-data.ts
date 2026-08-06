/** Demo snapshot helpers for Talent Mapper — server-only. */
import "server-only";

import demoSnapshot from "@/data/talent-mapper-demo.json";
import pubmedDemoSnapshot from "@/data/talent-mapper-pubmed-demo.json";
import { normalizeOpenAlexWork } from "@/lib/talent-mapper/openalex";
import type { OpenAlexWorkLike, ScholarlyWork, SearchQuery } from "./types";

export type DemoSnapshot = {
  mode: string;
  label: string;
  disclaimer: string;
  fetchedAt: string;
  source: string;
  queries: string[];
  works: OpenAlexWorkLike[];
};

export type PubmedDemoSnapshot = {
  mode: string;
  label: string;
  disclaimer: string;
  fetchedAt: string;
  source: string;
  works: ScholarlyWork[];
};

export function getDemoSnapshot(): DemoSnapshot {
  return demoSnapshot as DemoSnapshot;
}

export function getPubmedDemoSnapshot(): PubmedDemoSnapshot {
  return pubmedDemoSnapshot as PubmedDemoSnapshot;
}

/**
 * Filter demo OpenAlex works and normalize to ScholarlyWork.
 */
export function searchDemoWorks(queries: SearchQuery[]): {
  works: ScholarlyWork[];
  warnings: string[];
  queriesRun: string[];
} {
  const snapshot = getDemoSnapshot();
  const enabled = queries.filter((q) => q.enabled && q.query.trim());
  const queriesRun = enabled.map((q) => q.query);
  const warnings = [
    snapshot.disclaimer,
    "Demo snapshot: saved public-data snapshot — not a live search.",
  ];

  const rawWorks = selectMatchingOpenAlex(
    snapshot.works as OpenAlexWorkLike[],
    enabled,
  );

  const works = rawWorks
    .map((raw) =>
      normalizeOpenAlexWork(raw as Parameters<typeof normalizeOpenAlexWork>[0]),
    )
    .filter((w): w is ScholarlyWork => w != null);

  return { works, warnings, queriesRun };
}

/**
 * Return PubMed-style demo works (including records that merge with OpenAlex via DOI/PMID).
 */
export function searchDemoPubmedWorks(queries: SearchQuery[]): {
  works: ScholarlyWork[];
  warnings: string[];
  queriesRun: string[];
} {
  const snapshot = getPubmedDemoSnapshot();
  const enabled = queries.filter((q) => q.enabled && q.query.trim());
  const queriesRun = enabled.map((q) => q.query);
  const warnings = [
    snapshot.disclaimer,
    "Demo snapshot: saved public PubMed-style evidence — not a live NCBI search.",
  ];

  const works = selectMatchingScholarly(snapshot.works, enabled);
  return {
    works: works.length >= 2 ? works : snapshot.works,
    warnings,
    queriesRun,
  };
}

function selectMatchingOpenAlex(
  works: OpenAlexWorkLike[],
  enabled: SearchQuery[],
): OpenAlexWorkLike[] {
  if (enabled.length === 0) return works;

  const terms = enabled.flatMap((q) =>
    q.query
      .toLowerCase()
      .replace(/"/g, "")
      .replace(/\[tiab\]|\[mh\]|\[dp\]|\[pt\]|\[ad\]/gi, "")
      .replace(/\b(and|or|not|hasabstract)\b/gi, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );

  const filtered = works.filter((w) => {
    const hay = [
      w.display_name,
      w.title,
      w.abstract_text,
      w.primary_topic?.display_name,
      ...(w.topics || []).map((t) => t.display_name),
      ...(w.keywords || []).map((k) => k.display_name || k.keyword),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const hits = terms.filter((t) => hay.includes(t)).length;
    return hits >= Math.min(2, terms.length);
  });

  return filtered.length >= 8 ? filtered : works;
}

function selectMatchingScholarly(
  works: ScholarlyWork[],
  enabled: SearchQuery[],
): ScholarlyWork[] {
  if (enabled.length === 0) return works;

  const terms = enabled.flatMap((q) =>
    q.query
      .toLowerCase()
      .replace(/"/g, "")
      .replace(/\[tiab\]|\[mh\]|\[dp\]|\[pt\]|\[ad\]/gi, "")
      .replace(/\b(and|or|not|hasabstract)\b/gi, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );

  return works.filter((w) => {
    const hay = [
      w.title,
      w.abstract,
      ...(w.meshTerms || []),
      ...(w.keywords || []),
      ...(w.topics || []),
      w.sourceName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const hits = terms.filter((t) => hay.includes(t)).length;
    return hits >= Math.min(1, terms.length);
  });
}
