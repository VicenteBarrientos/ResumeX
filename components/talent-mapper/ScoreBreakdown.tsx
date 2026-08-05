"use client";

import type { ScoreBreakdown } from "@/lib/talent-mapper/types";

const ROWS: { key: keyof Omit<ScoreBreakdown, "total">; label: string; max: number }[] = [
  { key: "requiredTechniques", label: "Required techniques", max: 40 },
  { key: "researchArea", label: "Research area", max: 20 },
  { key: "recency", label: "Recency", max: 15 },
  { key: "repeatedEvidence", label: "Repeated evidence", max: 10 },
  { key: "geography", label: "Geography signal", max: 10 },
  { key: "seniority", label: "Seniority signal", max: 5 },
];

export default function ScoreBreakdownView({
  score,
  breakdown,
}: {
  score: number;
  breakdown: ScoreBreakdown;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold text-zinc-900">
          Research relevance
        </p>
        <p className="text-2xl font-bold tabular-nums text-brand-700">
          {score}
        </p>
      </div>
      <p className="text-xs text-zinc-500">
        Measures fit to search criteria from public works — not hireability,
        availability, or current employment.
      </p>
      <ul className="space-y-1.5">
        {ROWS.map((row) => (
          <li key={row.key} className="flex items-center gap-2 text-xs text-zinc-600">
            <span className="w-36 shrink-0">{row.label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-brand-500"
                style={{ width: `${Math.min(100, (breakdown[row.key] / row.max) * 100)}%` }}
              />
            </div>
            <span className="w-12 text-right tabular-nums">
              {breakdown[row.key]}/{row.max}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
