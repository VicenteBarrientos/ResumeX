import { hashQueryId } from "@/lib/talent-mapper/query-builder";
import type { SearchQuery, SourcingCriteria } from "@/lib/talent-mapper/types";

const MAX_QUERY_LENGTH = 1200;
const MAX_QUERIES = 8;

export type PubmedQueryOptions = {
  requireAbstract?: boolean;
  maxQueries?: number;
};

/**
 * Build 4–8 source-specific PubMed Boolean queries from recruiter criteria.
 * Uses [tiab] / [mh] field tags — not interchangeable with OpenAlex queries.
 */
export function buildPubmedQueries(
  criteria: SourcingCriteria,
  options: PubmedQueryOptions = {},
): SearchQuery[] {
  const requireAbstract = options.requireAbstract ?? true;
  const maxQueries = options.maxQueries ?? MAX_QUERIES;

  const required = uniqueNonEmpty(criteria.requiredTechniques);
  const preferred = uniqueNonEmpty(criteria.preferredTechniques);
  const areas = uniqueNonEmpty(criteria.researchAreas);
  const organisms = uniqueNonEmpty(criteria.organismsOrSystems);
  const adjacent = uniqueNonEmpty(criteria.adjacentTerms);

  const queries: SearchQuery[] = [];
  const seen = new Set<string>();

  const push = (
    group: SearchQuery["group"],
    label: string,
    clauses: string[],
    purpose: string,
  ) => {
    if (queries.length >= maxQueries) return;
    const body = clauses.filter(Boolean).join(" AND ");
    if (!body.trim()) return;
    const withDate = appendDateRange(body, criteria.publicationYearFrom);
    const withAbstract = requireAbstract
      ? `${withDate} AND hasabstract`
      : withDate;
    const query = clampQuery(withAbstract);
    const key = query.toLowerCase();
    if (seen.has(key)) return;
    if (!isBalancedParentheses(query)) return;
    seen.add(key);
    queries.push({
      id: `pm_${hashQueryId(query)}`,
      label,
      group,
      query,
      enabled: true,
      purpose,
    });
  };

  // Group A: direct technique evidence
  if (required.length > 0) {
    const techs = required.slice(0, 4).map((t) => tiab(t));
    push(
      "core",
      `PubMed core techniques`,
      [`(${techs.join(" OR ")})`],
      "Direct technique evidence in title/abstract",
    );
  }

  // Group B: technique + organism/system
  if (required[0] && organisms.length > 0) {
    const techOr = required.slice(0, 3).map((t) => tiab(t));
    const orgOr = organisms.slice(0, 4).map((o) => tiab(o));
    push(
      "core",
      `PubMed techniques + systems`,
      [`(${techOr.join(" OR ")})`, `(${orgOr.join(" OR ")})`],
      "Technique evidence constrained to relevant organisms/systems",
    );
  }

  // Group C: adjacent terminology
  if (adjacent.length > 0 || preferred.length > 0) {
    const adjOr = [...adjacent, ...preferred]
      .slice(0, 5)
      .map((t) => tiab(t));
    const contextOr = [...required.slice(0, 2), ...organisms.slice(0, 2)]
      .filter(Boolean)
      .map((t) => tiab(t));
    if (adjOr.length > 0) {
      push(
        "adjacent",
        `PubMed adjacent terminology`,
        [
          `(${adjOr.join(" OR ")})`,
          contextOr.length > 0 ? `(${contextOr.join(" OR ")})` : "",
        ].filter(Boolean),
        "Adjacent synonyms that may surface relevant methods papers",
      );
    }
  }

  // Group D: broader MeSH / domain
  if (areas.length > 0) {
    const meshOr = areas.slice(0, 3).flatMap((a) => [mh(a), tiab(a)]);
    const methodOr = [...required.slice(0, 2), ...preferred.slice(0, 2)]
      .filter(Boolean)
      .map((t) => tiab(t));
    push(
      "broadening",
      `PubMed domain MeSH`,
      [
        `(${meshOr.join(" OR ")})`,
        methodOr.length > 0 ? `(${methodOr.join(" OR ")})` : "",
      ].filter(Boolean),
      "Broader indexed topic (MeSH) — topical evidence only, not hands-on proof",
    );
  }

  // Extra focused pairs when still under 4
  for (let i = 0; i < required.length && queries.length < 4; i++) {
    const tech = required[i];
    const partner = organisms[i] || areas[i] || adjacent[i];
    if (partner) {
      push(
        "core",
        `PubMed: ${tech} + ${partner}`,
        [`(${tiab(tech)})`, `(${tiab(partner)})`],
        `Focused pair for ${tech}`,
      );
    } else {
      push(
        "core",
        `PubMed: ${tech}`,
        [`(${tiab(tech)})`],
        `Focused technique search for ${tech}`,
      );
    }
  }

  if (queries.length === 0 && criteria.roleTitle.trim()) {
    push(
      "core",
      `PubMed: ${criteria.roleTitle}`,
      [`(${tiab(criteria.roleTitle)})`],
      "Fallback from role title",
    );
  }

  return queries.slice(0, maxQueries);
}

export function validatePubmedQuery(query: string): string | null {
  const trimmed = query.trim();
  if (!trimmed) return "Query is empty.";
  if (trimmed.length > MAX_QUERY_LENGTH) {
    return `Query exceeds ${MAX_QUERY_LENGTH} characters.`;
  }
  if (!isBalancedParentheses(trimmed)) {
    return "Unbalanced parentheses in PubMed query.";
  }
  return null;
}

function tiab(term: string): string {
  return `${quoteIfNeeded(term)}[tiab]`;
}

function mh(term: string): string {
  return `${quoteIfNeeded(term)}[mh]`;
}

function quoteIfNeeded(term: string): string {
  const cleaned = term.trim().replace(/\s+/g, " ").replace(/"/g, "");
  if (!cleaned) return '""';
  if (/\s/.test(cleaned) || /[()]/.test(cleaned)) {
    return `"${cleaned}"`;
  }
  return cleaned;
}

function appendDateRange(query: string, yearFrom?: number): string {
  if (yearFrom == null || !Number.isFinite(yearFrom)) {
    return query;
  }
  const currentYear = new Date().getUTCFullYear();
  const from = Math.max(1900, Math.floor(yearFrom));
  const to = Math.max(from, currentYear);
  return `${query} AND ${from}:${to}[dp]`;
}

function clampQuery(query: string): string {
  const normalized = query.replace(/\s+/g, " ").trim();
  if (normalized.length <= MAX_QUERY_LENGTH) return normalized;
  return normalized.slice(0, MAX_QUERY_LENGTH).trim();
}

function isBalancedParentheses(query: string): boolean {
  let depth = 0;
  for (const ch of query) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0;
}

function uniqueNonEmpty(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}
