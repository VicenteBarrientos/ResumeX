import { normalizeDoi } from "@/lib/talent-mapper/normalization/doi";
import {
  normalizePmcid,
  normalizePmid,
} from "@/lib/talent-mapper/normalization/pmid";
import { titleYearKey } from "@/lib/talent-mapper/normalization/title";
import type { ScholarlyWork } from "@/lib/talent-mapper/types";

/**
 * Deterministic canonical key for a scholarly work.
 * Priority: DOI > PMID > PMCID > OpenAlex ID > title+year.
 */
export function computeCanonicalKey(
  work: Pick<
    ScholarlyWork,
    "doi" | "pmid" | "pmcid" | "openAlexId" | "id" | "title" | "year"
  >,
): string {
  const doi = normalizeDoi(work.doi);
  if (doi) return `doi:${doi}`;

  const pmid = normalizePmid(work.pmid);
  if (pmid) return `pmid:${pmid}`;

  const pmcid = normalizePmcid(work.pmcid);
  if (pmcid) return `pmcid:${pmcid}`;

  const openAlexId = extractOpenAlexWorkId(work.openAlexId || work.id);
  if (openAlexId) return `openalex:${openAlexId}`;

  const ty = titleYearKey(work.title, work.year);
  if (ty) return ty;

  return `local:${(work.id || work.title || "unknown").toLowerCase()}`;
}

export function extractOpenAlexWorkId(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const match = value.trim().match(/W\d+/i);
  return match ? match[0].toUpperCase() : null;
}

export function withCanonicalKey(work: ScholarlyWork): ScholarlyWork {
  return {
    ...work,
    canonicalKey: computeCanonicalKey(work),
  };
}
