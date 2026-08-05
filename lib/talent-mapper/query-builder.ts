import type { SearchQuery, SourcingCriteria } from "@/lib/talent-mapper/types";

/**
 * Build 4–8 transparent OpenAlex search queries from sourcing criteria.
 * Core queries emphasize required techniques; adjacent queries broaden coverage.
 */
export function buildSearchQueries(criteria: SourcingCriteria): SearchQuery[] {
  const required = uniqueNonEmpty(criteria.requiredTechniques);
  const areas = uniqueNonEmpty(criteria.researchAreas);
  const organisms = uniqueNonEmpty(criteria.organismsOrSystems);
  const adjacent = uniqueNonEmpty(criteria.adjacentTerms);
  const preferred = uniqueNonEmpty(criteria.preferredTechniques);

  const queries: SearchQuery[] = [];

  // Pair required techniques into focused core queries
  for (let i = 0; i < required.length && queries.length < 4; i += 2) {
    const a = required[i];
    const b = required[i + 1];
    if (b) {
      queries.push(
        makeQuery(
          "core",
          `Core: ${a} + ${b}`,
          `${quotePhrase(a)} ${quotePhrase(b)}`,
        ),
      );
    } else if (areas[0]) {
      queries.push(
        makeQuery(
          "core",
          `Core: ${a} + ${areas[0]}`,
          `${quotePhrase(a)} ${quotePhrase(areas[0])}`,
        ),
      );
    } else {
      queries.push(makeQuery("core", `Core: ${a}`, quotePhrase(a)));
    }
  }

  // Technique + organism / system
  if (required[0] && organisms[0] && queries.length < 6) {
    queries.push(
      makeQuery(
        "core",
        `Core: ${required[0]} + ${organisms[0]}`,
        `${quotePhrase(required[0])} ${quotePhrase(organisms[0])}`,
      ),
    );
  }

  // Research area + cloning technique
  if (areas[0] && required.length > 0 && queries.length < 6) {
    const tech = required[Math.min(2, required.length - 1)];
    const candidate = makeQuery(
      "core",
      `Core: ${tech} + ${areas[0]}`,
      `${quotePhrase(tech)} ${quotePhrase(areas[0])}`,
    );
    if (!queries.some((q) => q.query === candidate.query)) {
      queries.push(candidate);
    }
  }

  // Adjacent expansions
  const adjacentSeeds: string[] = [];
  if (organisms[0] && required[1]) {
    adjacentSeeds.push(`${quotePhrase(organisms[0])} ${required[1]}`);
  }
  if (organisms[1] && required[0]) {
    adjacentSeeds.push(`${quotePhrase(organisms[1])} ${required[0]}`);
  }
  if (adjacent[0] && required[0]) {
    adjacentSeeds.push(`${quotePhrase(adjacent[0])} ${quotePhrase(required[0])}`);
  }
  if (preferred[0] && areas[0]) {
    adjacentSeeds.push(`${quotePhrase(preferred[0])} ${quotePhrase(areas[0])}`);
  }
  if (adjacent[1]) {
    adjacentSeeds.push(quotePhrase(adjacent[1]));
  }
  if (organisms[0] && adjacent[0]) {
    adjacentSeeds.push(`${quotePhrase(organisms[0])} ${quotePhrase(adjacent[0])}`);
  }

  for (const seed of adjacentSeeds) {
    if (queries.length >= 8) {
      break;
    }
    const q = makeQuery("adjacent", `Adjacent: ${unquoteLabel(seed)}`, seed);
    if (!queries.some((existing) => existing.query === q.query)) {
      queries.push(q);
    }
  }

  // Ensure at least 4 queries when enough criteria exist
  if (queries.length < 4) {
    for (const tech of required) {
      if (queries.length >= 4) {
        break;
      }
      const q = makeQuery("core", `Core: ${tech}`, quotePhrase(tech));
      if (!queries.some((existing) => existing.query === q.query)) {
        queries.push(q);
      }
    }
  }

  if (queries.length < 4) {
    for (const area of areas) {
      if (queries.length >= 4) {
        break;
      }
      const q = makeQuery("adjacent", `Adjacent: ${area}`, quotePhrase(area));
      if (!queries.some((existing) => existing.query === q.query)) {
        queries.push(q);
      }
    }
  }

  // Absolute fallback
  if (queries.length === 0 && criteria.roleTitle.trim()) {
    queries.push(
      makeQuery(
        "core",
        `Core: ${criteria.roleTitle}`,
        quotePhrase(criteria.roleTitle),
      ),
    );
  }

  return queries.slice(0, 8);
}

/** Return only enabled, non-empty queries. */
export function enabledQueries(queries: SearchQuery[]): SearchQuery[] {
  return queries.filter((q) => q.enabled && q.query.trim().length > 0);
}

function makeQuery(
  group: SearchQuery["group"],
  label: string,
  query: string,
): SearchQuery {
  const normalized = query.trim().replace(/\s+/g, " ");
  return {
    id: hashQueryId(normalized),
    label,
    group,
    query: normalized,
    enabled: true,
  };
}

/** Deterministic non-cryptographic hash for stable query ids. */
export function hashQueryId(query: string): string {
  let hash = 2166136261;
  for (let i = 0; i < query.length; i++) {
    hash ^= query.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `q_${(hash >>> 0).toString(16)}`;
}

function quotePhrase(value: string): string {
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (!cleaned) {
    return "";
  }
  if (cleaned.includes(" ")) {
    return `"${cleaned.replace(/"/g, "")}"`;
  }
  return cleaned;
}

function unquoteLabel(value: string): string {
  return value.replace(/"/g, "").replace(/\s+/g, " ").trim();
}

function uniqueNonEmpty(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}
