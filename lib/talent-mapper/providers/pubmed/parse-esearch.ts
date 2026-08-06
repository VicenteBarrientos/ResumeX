export type EsearchParsed = {
  count: number;
  pmids: string[];
  queryTranslation?: string;
  warnings: string[];
  error?: string;
};

/**
 * Parse NCBI ESearch JSON (retmode=json).
 */
export function parseEsearchResponse(payload: unknown): EsearchParsed {
  if (!payload || typeof payload !== "object") {
    return {
      count: 0,
      pmids: [],
      warnings: [],
      error: "Invalid ESearch response",
    };
  }

  const root = payload as Record<string, unknown>;
  const result = (root.esearchresult || root.eSearchResult || root) as Record<
    string,
    unknown
  >;

  const errorList = result.ERROR || result.error;
  if (typeof errorList === "string" && errorList.trim()) {
    return {
      count: 0,
      pmids: [],
      warnings: [],
      error: errorList,
    };
  }

  const count = Number(result.count ?? 0);
  const idlist = result.idlist ?? result.IdList;
  const pmids = asStringArray(idlist);

  const warnings: string[] = [];
  const warningList = result.warninglist ?? result.WarningList;
  if (warningList && typeof warningList === "object") {
    const wl = warningList as Record<string, unknown>;
    for (const value of Object.values(wl)) {
      for (const item of asStringArray(value)) {
        warnings.push(item);
      }
    }
  }

  const queryTranslation =
    typeof result.querytranslation === "string"
      ? result.querytranslation
      : typeof result.QueryTranslation === "string"
        ? result.QueryTranslation
        : undefined;

  return {
    count: Number.isFinite(count) ? count : pmids.length,
    pmids,
    queryTranslation,
    warnings,
  };
}

export type PmidQueryHit = {
  pmid: string;
  queryId: string;
  rank: number; // 1-based
};

/**
 * Reciprocal-rank fusion across PubMed ESearch result lists.
 * score = sum(1 / (60 + rank))
 */
export function prioritizePmidsByRrf(
  hits: PmidQueryHit[],
  totalLimit: number,
): Array<{ pmid: string; score: number; queryMatches: PmidQueryHit[] }> {
  const byPmid = new Map<string, PmidQueryHit[]>();
  for (const hit of hits) {
    if (!hit.pmid) continue;
    if (!byPmid.has(hit.pmid)) byPmid.set(hit.pmid, []);
    byPmid.get(hit.pmid)!.push(hit);
  }

  const scored = [...byPmid.entries()].map(([pmid, matches]) => {
    const score = matches.reduce((sum, m) => sum + 1 / (60 + m.rank), 0);
    return { pmid, score, queryMatches: matches };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.pmid.localeCompare(b.pmid);
  });

  return scored.slice(0, Math.max(0, totalLimit));
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.id)) {
      return obj.id.map(String).map((s) => s.trim()).filter(Boolean);
    }
    if (typeof obj.id === "string") {
      return [obj.id.trim()];
    }
  }
  return [];
}
