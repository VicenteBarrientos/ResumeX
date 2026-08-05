"use client";

import type { EvidenceMatch } from "@/lib/talent-mapper/types";

const confidenceLabel: Record<EvidenceMatch["confidence"], string> = {
  direct: "Direct evidence",
  strong_adjacent: "Strong adjacent evidence",
  possible: "Possible evidence",
};

const confidenceClass: Record<EvidenceMatch["confidence"], string> = {
  direct:
    "bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300",
  strong_adjacent:
    "bg-sky-50 text-sky-800 dark:bg-sky-400/10 dark:text-sky-300",
  possible: "bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-300",
};

export default function EvidenceList({
  title,
  matches,
}: {
  title: string;
  matches: EvidenceMatch[];
}) {
  if (matches.length === 0) {
    return (
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {title}
        </h4>
        <p className="mt-1 text-sm text-zinc-500">No matches in retrieved works.</p>
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h4>
      <ul className="mt-2 space-y-3">
        {matches.map((m) => (
          <li
            key={`${m.criterion}-${m.workId}`}
            className="rounded-lg border border-zinc-100 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-zinc-900 dark:text-white">
                {m.criterion}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${confidenceClass[m.confidence]}`}
              >
                {confidenceLabel[m.confidence]}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
              “{m.workTitle}”
              {m.year ? ` · ${m.year}` : ""}
            </p>
            {m.snippet && (
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">{m.snippet}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              {m.openAlexUrl && (
                <a
                  href={m.openAlexUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline dark:text-cyan-400"
                >
                  OpenAlex
                </a>
              )}
              {m.doi && (
                <a
                  href={m.doi.startsWith("http") ? m.doi : `https://doi.org/${m.doi.replace(/^https?:\/\/doi\.org\//, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline dark:text-cyan-400"
                >
                  DOI
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
