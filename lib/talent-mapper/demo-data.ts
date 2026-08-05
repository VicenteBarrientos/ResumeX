/** Demo snapshot helpers for Talent Mapper — server-only. */
import "server-only";

import demoSnapshot from "@/data/talent-mapper-demo.json";
import type { OpenAlexWorkLike, SearchQuery } from "./types";

export type DemoSnapshot = {
  mode: string;
  label: string;
  disclaimer: string;
  fetchedAt: string;
  source: string;
  queries: string[];
  works: OpenAlexWorkLike[];
};

export function getDemoSnapshot(): DemoSnapshot {
  return demoSnapshot as DemoSnapshot;
}

/**
 * Filter demo works with a lightweight local search against enabled queries.
 * Falls back to returning the full snapshot if filtering yields too few hits.
 */
export function searchDemoWorks(queries: SearchQuery[]): {
  works: OpenAlexWorkLike[];
  warnings: string[];
  queriesRun: string[];
} {
  const snapshot = getDemoSnapshot();
  const enabled = queries.filter((q) => q.enabled && q.query.trim());
  const queriesRun = enabled.map((q) => q.query);
  const warnings = [
    snapshot.disclaimer,
    "Demo snapshot: saved public OpenAlex data — not a live search.",
  ];

  if (enabled.length === 0) {
    return { works: snapshot.works as OpenAlexWorkLike[], warnings, queriesRun };
  }

  const terms = enabled.flatMap((q) =>
    q.query
      .toLowerCase()
      .replace(/"/g, "")
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );

  const filtered = (snapshot.works as OpenAlexWorkLike[]).filter((w) => {
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
    // Require at least 2 term hits for relevance, or 1 if few terms
    const hits = terms.filter((t) => hay.includes(t)).length;
    return hits >= Math.min(2, terms.length);
  });

  return {
    works:
      filtered.length >= 8
        ? filtered
        : (snapshot.works as OpenAlexWorkLike[]),
    warnings,
    queriesRun,
  };
}
