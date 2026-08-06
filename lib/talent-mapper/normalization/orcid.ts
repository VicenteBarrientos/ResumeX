const ORCID_RE = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i;

/**
 * Normalize ORCID to hyphenated form without URL prefix.
 */
export function normalizeOrcid(value: string | null | undefined): string | null {
  if (!value) return null;
  let orcid = value.trim();
  if (!orcid) return null;

  orcid = orcid.replace(/^https?:\/\/orcid\.org\//i, "");
  orcid = orcid.replace(/^orcid:\s*/i, "");
  orcid = orcid.trim();

  if (!ORCID_RE.test(orcid)) {
    return null;
  }
  return orcid.toUpperCase().replace(/X$/, "X");
}

export function orcidUrl(orcid: string): string {
  return `https://orcid.org/${orcid}`;
}
