"use client";

import type { ResearcherCandidate } from "@/lib/talent-mapper/types";

export default function CandidateCard({
  candidate,
  shortlisted,
  onToggleShortlist,
  onView,
  onOutreach,
}: {
  candidate: ResearcherCandidate;
  shortlisted: boolean;
  onToggleShortlist: () => void;
  onView: () => void;
  onOutreach: () => void;
}) {
  const tags = candidate.matchedRequiredCriteria.slice(0, 3);

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-brand-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">
            {candidate.name}
          </h3>
          <p className="mt-1 text-sm text-zinc-600">
            Most recent institution in publication data:{" "}
            {candidate.likelyInstitution?.name || "Unknown"}
            {candidate.likelyInstitution?.countryCode
              ? ` · ${candidate.likelyInstitution.countryCode}`
              : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Research relevance
          </p>
          <p className="text-2xl font-bold tabular-nums text-brand-700">
            {candidate.score}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        {candidate.relevantWorkCount} relevant works
        {candidate.mostRecentRelevantYear
          ? ` · Most recent: ${candidate.mostRecentRelevantYear}`
          : ""}
        {candidate.orcid ? " · Has ORCID" : ""}
      </p>

      <div className="mt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
          Direct evidence
        </p>
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {tags.length > 0 ? (
            tags.map((t) => (
              <li
                key={t.criterion}
                className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800"
              >
                {t.criterion}
              </li>
            ))
          ) : (
            <li className="text-xs text-zinc-500">Limited direct technique matches</li>
          )}
        </ul>
      </div>

      <div className="mt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Unknown
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {candidate.unknowns.slice(0, 3).join(" · ")}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onView}
          className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-brand-300"
        >
          View evidence
        </button>
        <button
          type="button"
          onClick={onToggleShortlist}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
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
          className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-brand-300"
        >
          Draft outreach
        </button>
        <a
          href={candidate.openAlexUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-brand-300"
        >
          Open public profile
        </a>
      </div>
    </article>
  );
}
