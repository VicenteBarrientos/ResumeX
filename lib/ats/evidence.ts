import type { AtsEvidencePayload } from "@/lib/ats/types";

const DEFAULT_PLAIN_LIMIT = 4000;
const DEFAULT_HTML_LIMIT = 6000;
const DEFAULT_FIELD_LIMIT = 2000;

function truncateWithNote(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const note = "\n\n[Truncated by ResumeX to fit ATS field limits.]";
  const room = Math.max(0, limit - note.length);
  return text.slice(0, room) + note;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function bullet(items: string[]): string {
  return items.map((item) => `• ${item}`).join("\n");
}

/**
 * Concise plain-text evidence for ATS notes / multi-line fields.
 * Does not include full abstracts. Does not claim score = candidate quality.
 */
export function buildAtsEvidencePlainText(
  evidence: AtsEvidencePayload,
  options?: { maxLength?: number }
): string {
  const lines: string[] = [];
  lines.push(`Sourced through ${evidence.sourceProduct}`);
  lines.push("");
  lines.push(
    evidence.relevanceScore != null
      ? `Research relevance: ${evidence.relevanceScore}/100 (${evidence.relevanceLabel})`
      : `Research relevance: ${evidence.relevanceLabel}`
  );
  lines.push("");
  lines.push(
    "Research relevance reflects overlap with the search criteria from public scholarly evidence — not hiring fitness or candidate quality."
  );

  if (evidence.directEvidence.length > 0) {
    lines.push("");
    lines.push("Direct public evidence");
    lines.push(
      bullet(
        evidence.directEvidence.map((item) => {
          const year = item.sourceYear ? ` (${item.sourceYear})` : "";
          const title = item.sourceTitle ? ` — ${item.sourceTitle}${year}` : "";
          return `${item.criterion}${title}: ${item.explanation}`;
        })
      )
    );
  }

  if (evidence.adjacentEvidence.length > 0) {
    lines.push("");
    lines.push("Adjacent public evidence");
    lines.push(
      bullet(
        evidence.adjacentEvidence.map((item) => {
          const title = item.sourceTitle ? ` — ${item.sourceTitle}` : "";
          return `${item.criterion}${title}: ${item.explanation}`;
        })
      )
    );
  }

  if (evidence.likelyInstitution) {
    lines.push("");
    lines.push("Likely institution signal");
    lines.push(
      `${evidence.likelyInstitution}, based on the most recent retrieved publication metadata. Validate current employment separately.`
    );
  }

  if (evidence.unknowns.length > 0) {
    lines.push("");
    lines.push("Unknowns requiring recruiter validation");
    lines.push(bullet(evidence.unknowns));
  }

  if (evidence.recruiterNotes?.trim()) {
    lines.push("");
    lines.push("Recruiter notes (explicitly included)");
    lines.push(evidence.recruiterNotes.trim());
  }

  if (evidence.publicProfileUrls.length > 0) {
    lines.push("");
    lines.push("Public sources");
    lines.push(bullet(evidence.publicProfileUrls));
  }

  if (evidence.localCandidateUrl) {
    lines.push("");
    lines.push(`ResumeX candidate link: ${evidence.localCandidateUrl}`);
  }

  if (evidence.searchProjectTitle || evidence.searchProjectId) {
    lines.push("");
    lines.push("ResumeX search project");
    lines.push(
      [evidence.searchProjectTitle, evidence.searchProjectId]
        .filter(Boolean)
        .join(" — ")
    );
  }

  lines.push("");
  lines.push(`Generated on: ${evidence.generatedAt}`);

  return truncateWithNote(lines.join("\n"), options?.maxLength ?? DEFAULT_PLAIN_LIMIT);
}

export function buildAtsEvidenceHtml(
  evidence: AtsEvidencePayload,
  options?: { maxLength?: number }
): string {
  const plain = buildAtsEvidencePlainText(evidence, {
    maxLength: options?.maxLength ?? DEFAULT_HTML_LIMIT,
  });
  const escaped = escapeHtml(plain);
  const html = `<div data-resumex-evidence="1"><pre style="white-space:pre-wrap;font-family:inherit">${escaped}</pre></div>`;
  return truncateWithNote(html, options?.maxLength ?? DEFAULT_HTML_LIMIT);
}

export type AtsEvidenceFields = {
  source: string;
  relevanceScore?: number;
  relevanceLabel: string;
  evidenceSummary: string;
  profileUrl?: string;
  publicSources: string;
};

export function buildAtsEvidenceFields(
  evidence: AtsEvidencePayload,
  options?: { fieldMaxLength?: number }
): AtsEvidenceFields {
  const limit = options?.fieldMaxLength ?? DEFAULT_FIELD_LIMIT;
  return {
    source: evidence.sourceProduct,
    relevanceScore: evidence.relevanceScore,
    relevanceLabel: evidence.relevanceLabel,
    evidenceSummary: truncateWithNote(
      buildAtsEvidencePlainText(evidence, { maxLength: limit }),
      limit
    ),
    profileUrl: evidence.localCandidateUrl,
    publicSources: truncateWithNote(
      evidence.publicProfileUrls.join("\n"),
      Math.min(limit, 1500)
    ),
  };
}

/** Escape helper exported for tests and adapters that write HTML. */
export { escapeHtml as escapeAtsHtml };
