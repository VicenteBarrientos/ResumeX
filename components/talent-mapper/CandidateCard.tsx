"use client";

import type { ResearcherCandidate } from "@/lib/talent-mapper/types";

export default function CandidateCard({
  candidate,
  shortlisted,
  selected,
  onToggleShortlist,
  onView,
  onOutreach,
}: {
  candidate: ResearcherCandidate;
  shortlisted: boolean;
  selected?: boolean;
  onToggleShortlist: () => void;
  onView: () => void;
  onOutreach: () => void;
}) {
  const tags = candidate.matchedRequiredCriteria.slice(0, 3);
  const institution = candidate.likelyInstitution?.name || "Unknown";
  const country = candidate.likelyInstitution?.countryCode
    ? ` · ${candidate.likelyInstitution.countryCode}`
    : "";

  return (
    <tr
      className={`border-b border-zinc-100 text-sm transition hover:bg-brand-50/40 ${
        selected ? "bg-brand-50/70" : "bg-white"
      }`}
    >
      <td className="px-3 py-2.5 align-top">
        <button
          type="button"
          onClick={onView}
          className="text-left font-semibold text-zinc-900 hover:text-brand-700"
        >
          {candidate.name}
        </button>
        <p className="mt-0.5 text-xs text-zinc-500">
          {candidate.relevantWorkCount} relevant works
          {candidate.mostRecentRelevantYear
            ? ` · ${candidate.mostRecentRelevantYear}`
            : ""}
          {candidate.orcid ? " · ORCID" : ""}
        </p>
      </td>
      <td className="hidden px-3 py-2.5 align-top text-xs text-zinc-600 sm:table-cell">
        {institution}
        {country}
      </td>
      <td className="px-3 py-2.5 align-top text-right">
        <span className="text-base font-bold tabular-nums text-brand-700">
          {candidate.score}
        </span>
      </td>
      <td className="hidden px-3 py-2.5 align-top md:table-cell">
        <ul className="flex flex-wrap gap-1">
          {tags.length > 0 ? (
            tags.map((t) => (
              <li
                key={t.criterion}
                className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800"
              >
                {t.criterion}
              </li>
            ))
          ) : (
            <li className="text-[11px] text-zinc-400">Limited matches</li>
          )}
        </ul>
      </td>
      <td className="px-3 py-2.5 align-top">
        <div className="flex flex-wrap justify-end gap-1">
          <button
            type="button"
            onClick={onView}
            className="rounded-md border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:border-brand-300"
          >
            View evidence
          </button>
          <button
            type="button"
            onClick={onToggleShortlist}
            className={`rounded-md px-2 py-1 text-[11px] font-medium ${
              shortlisted
                ? "bg-brand-600 text-white"
                : "border border-zinc-200 text-zinc-700"
            }`}
          >
            {shortlisted ? "Shortlisted" : "Shortlist"}
          </button>
          <button
            type="button"
            onClick={onOutreach}
            className="rounded-md border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:border-brand-300"
          >
            Draft outreach
          </button>
        </div>
      </td>
    </tr>
  );
}
