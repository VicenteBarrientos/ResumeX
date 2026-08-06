"use client";

import type { ResearchSource } from "@/lib/talent-mapper/types";

export type SourceConfigStatus =
  | "connected"
  | "available_without_key"
  | "not_configured"
  | "disabled"
  | "demo";

const STATUS_LABEL: Record<SourceConfigStatus, string> = {
  connected: "Connected",
  available_without_key: "Available without API key (reduced rate)",
  not_configured: "Not configured",
  disabled: "Disabled",
  demo: "Demo snapshot",
};

export default function SourceSelector({
  sources,
  onChange,
  openAlexStatus,
  pubmedStatus,
  mode,
}: {
  sources: ResearchSource[];
  onChange: (next: ResearchSource[]) => void;
  openAlexStatus: SourceConfigStatus;
  pubmedStatus: SourceConfigStatus;
  mode: "live" | "demo";
}) {
  function toggle(source: ResearchSource) {
    const has = sources.includes(source);
    if (has && sources.length === 1) return;
    onChange(
      has ? sources.filter((s) => s !== source) : [...sources, source],
    );
  }

  const effectiveOpenAlex = mode === "demo" ? "demo" : openAlexStatus;
  const effectivePubmed = mode === "demo" ? "demo" : pubmedStatus;

  return (
    <fieldset className="space-y-3 rounded-xl border border-zinc-100 p-4">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Research sources
      </legend>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-1"
          checked={sources.includes("openalex")}
          onChange={() => toggle("openalex")}
        />
        <span>
          <span className="block text-sm font-medium text-zinc-900">OpenAlex</span>
          <span className="block text-xs text-zinc-500">
            Broad scholarly discovery, authors, institutions and research graph
          </span>
          <span className="mt-1 inline-block text-[11px] text-zinc-400">
            {STATUS_LABEL[effectiveOpenAlex]}
          </span>
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-1"
          checked={sources.includes("pubmed")}
          onChange={() => toggle("pubmed")}
        />
        <span>
          <span className="block text-sm font-medium text-zinc-900">PubMed</span>
          <span className="block text-xs text-zinc-500">
            Biomedical literature, abstracts, MeSH terms and publication affiliations
          </span>
          <span className="mt-1 inline-block text-[11px] text-zinc-400">
            {STATUS_LABEL[effectivePubmed]}
          </span>
        </span>
      </label>
      {pubmedStatus === "not_configured" && mode === "live" && (
        <p className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
          PubMed live search is not configured. Add NCBI_EMAIL and optionally NCBI_API_KEY
          to enable current PubMed results.
        </p>
      )}
    </fieldset>
  );
}
