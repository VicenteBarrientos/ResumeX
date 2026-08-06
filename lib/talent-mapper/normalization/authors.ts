/**
 * Normalize author display names for conservative matching.
 */
export function normalizeAuthorName(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeAffiliationSignal(
  value: string | null | undefined,
): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

/**
 * Build a provisional PubMed-only author identity key.
 * Does not merge common names globally — affiliation signal required when present.
 */
export function provisionalPubmedAuthorId(args: {
  displayName: string;
  affiliation?: string;
  orcid?: string;
}): string {
  if (args.orcid) {
    return `orcid:${args.orcid}`;
  }
  const name = normalizeAuthorName(args.displayName) || "unknown";
  const aff = normalizeAffiliationSignal(args.affiliation);
  if (aff) {
    return `pubmed-provisional:${name}|${aff}`;
  }
  return `pubmed-provisional:${name}|unaffiliated`;
}

export function namesCompatible(
  a: {
    displayName: string;
    lastName?: string;
    foreName?: string;
    initials?: string;
  },
  b: {
    displayName: string;
    lastName?: string;
    foreName?: string;
    initials?: string;
  },
): boolean {
  const aNorm = normalizeAuthorName(a.displayName);
  const bNorm = normalizeAuthorName(b.displayName);
  if (aNorm && bNorm && aNorm === bNorm) {
    return true;
  }

  const aLast = normalizeAuthorName(a.lastName || a.displayName.split(/\s+/).pop());
  const bLast = normalizeAuthorName(b.lastName || b.displayName.split(/\s+/).pop());
  if (!aLast || !bLast || aLast !== bLast) {
    return false;
  }

  const aFirst = normalizeAuthorName(
    a.foreName || a.initials || a.displayName.split(/\s+/)[0],
  );
  const bFirst = normalizeAuthorName(
    b.foreName || b.initials || b.displayName.split(/\s+/)[0],
  );
  if (!aFirst || !bFirst) {
    return false;
  }
  if (aFirst === bFirst) {
    return true;
  }
  // Compatible initials vs full forename
  return (
    aFirst[0] === bFirst[0] &&
    (aFirst.length === 1 ||
      bFirst.length === 1 ||
      aFirst.startsWith(bFirst[0]) ||
      bFirst.startsWith(aFirst[0]))
  );
}
