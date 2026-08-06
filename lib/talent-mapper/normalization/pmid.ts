/**
 * Normalize PubMed identifiers.
 */
export function normalizePmid(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const fromUrl = trimmed.match(
    /pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i,
  );
  if (fromUrl) return fromUrl[1];

  const digits = trimmed.replace(/^pmid:\s*/i, "").match(/(\d{1,12})/);
  return digits ? digits[1] : null;
}

export function normalizePmcid(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const fromUrl = trimmed.match(/PMC\d+/i);
  if (fromUrl) return fromUrl[0].toUpperCase();

  const cleaned = trimmed
    .replace(/^https?:\/\/www\.ncbi\.nlm\.nih\.gov\/pmc\/articles\//i, "")
    .replace(/\/$/, "")
    .replace(/^pmcid:\s*/i, "");

  const match = cleaned.match(/PMC\d+/i);
  return match ? match[0].toUpperCase() : null;
}

export function pubmedUrlForPmid(pmid: string): string {
  return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
}
