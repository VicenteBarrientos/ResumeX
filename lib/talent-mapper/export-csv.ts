import type {
  ResearcherCandidate,
  ShortlistExportMeta,
} from "@/lib/talent-mapper/types";

const CSV_COLUMNS = [
  "Name",
  "OpenAlex Author ID",
  "ORCID",
  "Likely Institution",
  "Country",
  "Research Relevance Score",
  "Score Breakdown",
  "Matched Required Criteria",
  "Matched Preferred Criteria",
  "Relevant Work Count",
  "Most Recent Relevant Publication",
  "Top Evidence",
  "OpenAlex URL",
  "Recruiter Notes",
  "Search Mode",
] as const;

/**
 * Export shortlisted researchers as a properly escaped CSV string.
 */
export function exportShortlistCsv(
  candidates: ResearcherCandidate[],
  meta: ShortlistExportMeta,
): string {
  const lines: string[] = [CSV_COLUMNS.map(escapeCsvField).join(",")];

  for (const candidate of candidates) {
    const breakdown = candidate.scoreBreakdown;
    const scoreBreakdown = [
      `required ${breakdown.requiredTechniques}/40`,
      `researchArea ${breakdown.researchArea}/20`,
      `recency ${breakdown.recency}/15`,
      `repeated ${breakdown.repeatedEvidence}/10`,
      `geography ${breakdown.geography}/10`,
      `seniority ${breakdown.seniority}/5`,
      `total ${breakdown.total}/100`,
    ].join("; ");

    const matchedRequired = uniqueCriteria(
      candidate.matchedRequiredCriteria.map((m) => m.criterion),
    ).join("; ");

    const matchedPreferred = uniqueCriteria(
      candidate.matchedPreferredCriteria.map((m) => m.criterion),
    ).join("; ");

    const topEvidence = candidate.matchedRequiredCriteria
      .concat(candidate.matchedPreferredCriteria)
      .slice(0, 5)
      .map((m) => `${m.criterion} (${m.confidence}): ${m.snippet}`)
      .join(" | ");

    const notesParts = [
      candidate.recruiterNotes?.trim(),
      meta.recruiterNotes?.trim(),
      meta.roleTitle ? `Role: ${meta.roleTitle}` : undefined,
      meta.exportedAt ? `Exported: ${meta.exportedAt}` : undefined,
      ...candidate.possibleConcerns.map((c) => `Concern: ${c}`),
    ].filter(Boolean);

    const row = [
      candidate.name,
      candidate.authorId,
      candidate.orcid ?? "",
      candidate.likelyInstitution?.name ?? "",
      candidate.likelyInstitution?.countryCode ?? "",
      String(candidate.score),
      scoreBreakdown,
      matchedRequired,
      matchedPreferred,
      String(candidate.relevantWorkCount),
      candidate.mostRecentRelevantYear != null
        ? String(candidate.mostRecentRelevantYear)
        : "",
      topEvidence,
      candidate.openAlexUrl,
      notesParts.join(" | "),
      meta.searchMode,
    ];

    lines.push(row.map(escapeCsvField).join(","));
  }

  return `${lines.join("\r\n")}\r\n`;
}

/** Escape a single CSV field per RFC 4180-ish rules. */
export function escapeCsvField(value: string): string {
  const str = value ?? "";
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Alias used by tests and callers. */
export const escapeCsv = escapeCsvField;

function uniqueCriteria(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = v.toLowerCase().trim();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(v);
  }
  return out;
}
