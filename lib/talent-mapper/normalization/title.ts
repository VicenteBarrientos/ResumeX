/**
 * Normalize titles for exact title+year fallback matching.
 * Deliberately strict — no fuzzy similarity.
 */
export function normalizeTitle(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function titleYearKey(
  title: string | null | undefined,
  year: number | null | undefined,
): string | null {
  const normalized = normalizeTitle(title);
  if (!normalized || year == null || !Number.isFinite(year)) {
    return null;
  }
  return `titleyear:${normalized}|${year}`;
}
