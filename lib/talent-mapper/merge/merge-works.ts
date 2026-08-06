import {
  computeCanonicalKey,
  extractOpenAlexWorkId,
  withCanonicalKey,
} from "@/lib/talent-mapper/normalization/canonical-work";
import { normalizeDoi } from "@/lib/talent-mapper/normalization/doi";
import {
  normalizePmcid,
  normalizePmid,
  pubmedUrlForPmid,
} from "@/lib/talent-mapper/normalization/pmid";
import { titleYearKey } from "@/lib/talent-mapper/normalization/title";
import type {
  DeduplicationDiagnostics,
  ResearchSource,
  ScholarlyWork,
} from "@/lib/talent-mapper/types";

export type MergeWorksResult = {
  works: ScholarlyWork[];
  diagnostics: DeduplicationDiagnostics;
};

/**
 * Merge OpenAlex and PubMed works into unique canonical publications.
 * Matching priority: DOI → PMID → PMCID → OpenAlex/PubMed cross-id → exact title+year.
 * Loose title similarity is intentionally not used.
 */
export function mergeScholarlyWorks(works: ScholarlyWork[]): MergeWorksResult {
  const indexed = new Map<string, ScholarlyWork>();
  const keyIndex = {
    doi: new Map<string, string>(),
    pmid: new Map<string, string>(),
    pmcid: new Map<string, string>(),
    openalex: new Map<string, string>(),
    titleyear: new Map<string, string>(),
  };

  let sourceRecordCount = 0;

  for (const raw of works) {
    sourceRecordCount += 1;
    const work = withCanonicalKey(raw);
    const matchKey = findExistingKey(work, keyIndex);

    if (!matchKey) {
      const canonical = work.canonicalKey || computeCanonicalKey(work);
      indexed.set(canonical, ensureSourceMeta(work, canonical));
      registerKeys(canonical, work, keyIndex);
      continue;
    }

    const existing = indexed.get(matchKey)!;
    const merged = mergePair(existing, work);
    indexed.set(matchKey, merged);
    registerKeys(matchKey, merged, keyIndex);
  }

  const merged = [...indexed.values()];
  return {
    works: merged,
    diagnostics: {
      sourceRecordCount,
      canonicalWorkCount: merged.length,
      mergedDuplicateCount: Math.max(0, sourceRecordCount - merged.length),
    },
  };
}

function findExistingKey(
  work: ScholarlyWork,
  keyIndex: {
    doi: Map<string, string>;
    pmid: Map<string, string>;
    pmcid: Map<string, string>;
    openalex: Map<string, string>;
    titleyear: Map<string, string>;
  },
): string | null {
  const doi = normalizeDoi(work.doi);
  if (doi && keyIndex.doi.has(doi)) return keyIndex.doi.get(doi)!;

  const pmid = normalizePmid(work.pmid);
  if (pmid && keyIndex.pmid.has(pmid)) return keyIndex.pmid.get(pmid)!;

  const pmcid = normalizePmcid(work.pmcid);
  if (pmcid && keyIndex.pmcid.has(pmcid)) return keyIndex.pmcid.get(pmcid)!;

  // Cross-reference: OpenAlex work that already carries a PMID / DOI
  const openAlexId = extractOpenAlexWorkId(work.openAlexId || work.id);
  if (openAlexId && keyIndex.openalex.has(openAlexId)) {
    return keyIndex.openalex.get(openAlexId)!;
  }

  const ty = titleYearKey(work.title, work.year);
  if (ty && keyIndex.titleyear.has(ty)) return keyIndex.titleyear.get(ty)!;

  return null;
}

function registerKeys(
  canonical: string,
  work: ScholarlyWork,
  keyIndex: {
    doi: Map<string, string>;
    pmid: Map<string, string>;
    pmcid: Map<string, string>;
    openalex: Map<string, string>;
    titleyear: Map<string, string>;
  },
): void {
  const doi = normalizeDoi(work.doi);
  if (doi) keyIndex.doi.set(doi, canonical);
  const pmid = normalizePmid(work.pmid);
  if (pmid) keyIndex.pmid.set(pmid, canonical);
  const pmcid = normalizePmcid(work.pmcid);
  if (pmcid) keyIndex.pmcid.set(pmcid, canonical);
  const openAlexId = extractOpenAlexWorkId(work.openAlexId || work.id);
  if (openAlexId) keyIndex.openalex.set(openAlexId, canonical);
  const ty = titleYearKey(work.title, work.year);
  if (ty) keyIndex.titleyear.set(ty, canonical);
}

function ensureSourceMeta(work: ScholarlyWork, canonical: string): ScholarlyWork {
  const sources = uniqueSources(work.sources ?? inferSources(work));
  const pmid = normalizePmid(work.pmid) ?? undefined;
  const openAlexId =
    extractOpenAlexWorkId(work.openAlexId || work.id) ?? work.openAlexId;

  return {
    ...work,
    id: preferDisplayId(work, openAlexId, pmid),
    canonicalKey: canonical,
    openAlexId: openAlexId || undefined,
    pmid,
    pmcid: normalizePmcid(work.pmcid) ?? undefined,
    doi: normalizeDoi(work.doi) ?? work.doi,
    sources,
    openAlexUrl:
      work.openAlexUrl ||
      (openAlexId ? `https://openalex.org/${openAlexId}` : undefined),
    pubmedUrl: work.pubmedUrl || (pmid ? pubmedUrlForPmid(pmid) : undefined),
    sourceRefs: work.sourceRefs ?? buildSourceRefs(sources, openAlexId, pmid),
  };
}

function mergePair(a: ScholarlyWork, b: ScholarlyWork): ScholarlyWork {
  const sources = uniqueSources([
    ...(a.sources ?? inferSources(a)),
    ...(b.sources ?? inferSources(b)),
  ]);
  const pmid = normalizePmid(a.pmid) || normalizePmid(b.pmid) || undefined;
  const pmcid = normalizePmcid(a.pmcid) || normalizePmcid(b.pmcid) || undefined;
  const doi = normalizeDoi(a.doi) || normalizeDoi(b.doi) || undefined;
  const openAlexId =
    extractOpenAlexWorkId(a.openAlexId || a.id) ||
    extractOpenAlexWorkId(b.openAlexId || b.id) ||
    undefined;

  const preferPubmedMeta = (b.sources ?? []).includes("pubmed")
    ? b
    : (a.sources ?? []).includes("pubmed")
      ? a
      : b;
  const preferOpenAlexMeta = (a.sources ?? []).includes("openalex")
    ? a
    : (b.sources ?? []).includes("openalex")
      ? b
      : a;

  const retracted =
    a.isRetracted ||
    b.isRetracted ||
    a.retractionStatus === "retracted" ||
    b.retractionStatus === "retracted";

  return {
    id: preferDisplayId(a, openAlexId, pmid),
    canonicalKey: a.canonicalKey || b.canonicalKey || computeCanonicalKey(a),
    title: a.title || b.title,
    year: a.year ?? b.year,
    publicationDate: a.publicationDate || b.publicationDate,
    doi,
    pmid,
    pmcid,
    openAlexId,
    openAlexUrl:
      preferOpenAlexMeta.openAlexUrl ||
      (openAlexId ? `https://openalex.org/${openAlexId}` : undefined),
    pubmedUrl:
      preferPubmedMeta.pubmedUrl || (pmid ? pubmedUrlForPmid(pmid) : undefined),
    citedByCount: preferOpenAlexMeta.citedByCount ?? a.citedByCount ?? b.citedByCount,
    sourceName:
      preferPubmedMeta.sourceName || preferOpenAlexMeta.sourceName || a.sourceName,
    // Prefer shorter abstract excerpt already present; keep one for matching.
    abstract: preferPubmedMeta.abstract || a.abstract || b.abstract,
    topics: uniqueStrings([...(a.topics ?? []), ...(b.topics ?? [])]),
    keywords: uniqueStrings([...(a.keywords ?? []), ...(b.keywords ?? [])]),
    meshTerms: uniqueStrings([
      ...(a.meshTerms ?? []),
      ...(b.meshTerms ?? []),
    ]),
    publicationTypes: uniqueStrings([
      ...(a.publicationTypes ?? []),
      ...(b.publicationTypes ?? []),
    ]),
    isRetracted: retracted,
    retractionStatus: retracted
      ? "retracted"
      : a.retractionStatus === "retraction-notice" ||
          b.retractionStatus === "retraction-notice"
        ? "retraction-notice"
        : a.retractionStatus === "corrected" || b.retractionStatus === "corrected"
          ? "corrected"
          : a.retractionStatus || b.retractionStatus || "none",
    sources,
    sourceRefs: mergeSourceRefs(a, b, sources, openAlexId, pmid),
    queryMatches: [...(a.queryMatches ?? []), ...(b.queryMatches ?? [])],
    authorships: preferOpenAlexMeta.authorships.length
      ? preferOpenAlexMeta.authorships
      : preferPubmedMeta.authorships,
  };
}

function preferDisplayId(
  work: ScholarlyWork,
  openAlexId?: string | null,
  pmid?: string | null,
): string {
  if (openAlexId) return openAlexId;
  if (pmid) return `pmid:${pmid}`;
  return work.id;
}

function inferSources(work: ScholarlyWork): ResearchSource[] {
  const out: ResearchSource[] = [];
  if (work.openAlexId || extractOpenAlexWorkId(work.id) || work.openAlexUrl) {
    out.push("openalex");
  }
  if (work.pmid || work.pubmedUrl) {
    out.push("pubmed");
  }
  return out.length > 0 ? out : ["openalex"];
}

function buildSourceRefs(
  sources: ResearchSource[],
  openAlexId?: string | null,
  pmid?: string | null,
) {
  const refs = [];
  if (sources.includes("openalex") && openAlexId) {
    refs.push({
      source: "openalex" as const,
      sourceId: openAlexId,
      url: `https://openalex.org/${openAlexId}`,
    });
  }
  if (sources.includes("pubmed") && pmid) {
    refs.push({
      source: "pubmed" as const,
      sourceId: pmid,
      url: pubmedUrlForPmid(pmid),
    });
  }
  return refs;
}

function mergeSourceRefs(
  a: ScholarlyWork,
  b: ScholarlyWork,
  sources: ResearchSource[],
  openAlexId?: string | null,
  pmid?: string | null,
) {
  const existing = [...(a.sourceRefs ?? []), ...(b.sourceRefs ?? [])];
  if (existing.length > 0) {
    const seen = new Set<string>();
    return existing.filter((ref) => {
      const key = `${ref.source}:${ref.sourceId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  return buildSourceRefs(sources, openAlexId, pmid);
}

function uniqueSources(values: ResearchSource[]): ResearchSource[] {
  const order: ResearchSource[] = ["openalex", "pubmed"];
  return order.filter((s) => values.includes(s));
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = v.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(v.trim());
  }
  return out;
}
