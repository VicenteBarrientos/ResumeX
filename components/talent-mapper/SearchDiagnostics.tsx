"use client";

import type { SearchDiagnostics } from "@/lib/talent-mapper/types";

export default function SearchDiagnosticsView({
  diagnostics,
}: {
  diagnostics?: SearchDiagnostics;
}) {
  if (!diagnostics) return null;

  const openalex = diagnostics.sources?.openalex;
  const pubmed = diagnostics.sources?.pubmed;
  const dedupe = diagnostics.deduplication;

  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-4 py-3 text-xs text-zinc-600">
      <p className="font-semibold text-zinc-800">Source diagnostics</p>
      <ul className="mt-2 space-y-1">
        {openalex && (
          <li>
            OpenAlex: {openalex.status}
            {openalex.rawRecordCount != null
              ? ` · ${openalex.rawRecordCount} records`
              : ""}
            {openalex.durationMs != null ? ` · ${openalex.durationMs} ms` : ""}
          </li>
        )}
        {pubmed && (
          <li>
            PubMed: {pubmed.status}
            {pubmed.uniquePmidCount != null
              ? ` · ${pubmed.uniquePmidCount} unique PMIDs`
              : ""}
            {pubmed.fetchedRecordCount != null
              ? ` · ${pubmed.fetchedRecordCount} fetched`
              : ""}
            {pubmed.durationMs != null ? ` · ${pubmed.durationMs} ms` : ""}
          </li>
        )}
        {dedupe && (
          <li>
            Deduplication: {dedupe.canonicalWorkCount} unique publications from{" "}
            {dedupe.sourceRecordCount} source records
            {dedupe.mergedDuplicateCount > 0
              ? ` (${dedupe.mergedDuplicateCount} merged)`
              : ""}
          </li>
        )}
      </ul>
    </div>
  );
}
