/**
 * Normalize DOI identifiers for cross-source work matching.
 */
export function normalizeDoi(value: string | null | undefined): string | null {
  if (!value) return null;
  let doi = value.trim();
  if (!doi) return null;

  doi = doi.replace(/^doi:\s*/i, "");
  doi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
  doi = doi.replace(/\s+/g, "");
  doi = doi.replace(/[.,;:]+$/g, "");
  doi = doi.toLowerCase();

  if (!doi.includes("/") || doi.length < 5) {
    return null;
  }
  return doi;
}
