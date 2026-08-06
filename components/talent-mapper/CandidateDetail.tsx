"use client";

import { useEffect } from "react";
import EvidenceList from "@/components/talent-mapper/EvidenceList";
import OutreachEditor from "@/components/talent-mapper/OutreachEditor";
import ScoreBreakdownView from "@/components/talent-mapper/ScoreBreakdown";
import { Disclaimer } from "@/components/talent-mapper/Disclaimer";
import type { ResearcherCandidate } from "@/lib/talent-mapper/types";

export default function CandidateDetail({
  candidate,
  roleTitle,
  shortlisted,
  notes,
  onNotesChange,
  onToggleShortlist,
  onClose,
  focusOutreach,
}: {
  candidate: ResearcherCandidate;
  roleTitle: string;
  shortlisted: boolean;
  notes: string;
  onNotesChange: (v: string) => void;
  onToggleShortlist: () => void;
  onClose: () => void;
  focusOutreach?: boolean;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex justify-end bg-black/40 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label={`Researcher detail: ${candidate.name}`}
    >
      <button
        type="button"
        className="flex-1 cursor-default"
        aria-label="Close detail panel"
        onClick={onClose}
      />
      <aside className="flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">
              {candidate.name}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Likely institution based on public scholarly metadata:{" "}
              {candidate.likelyInstitution?.name || "Unknown"}
            </p>
            <Disclaimer className="mt-3">
              Affiliation reflects publication metadata and may not represent current
              employment. Validate role, location, and eligibility with the candidate
              before outreach or pipeline decisions.
            </Disclaimer>
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              {candidate.openAlexUrl && (
                <a
                  href={candidate.openAlexUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:underline"
                >
                  OpenAlex profile
                </a>
              )}
              {candidate.pubmedUrl && (
                <a
                  href={candidate.pubmedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:underline"
                >
                  PubMed
                </a>
              )}
              {candidate.orcid && (
                <a
                  href={candidate.orcid}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:underline"
                >
                  ORCID
                </a>
              )}
            </div>
            {candidate.possibleDuplicate && (
              <p className="mt-2 text-xs text-amber-800">
                Possible duplicate researcher — identity unresolved across sources.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-200 px-3 py-1 text-xs"
          >
            Close
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
          <ScoreBreakdownView score={candidate.score} breakdown={candidate.scoreBreakdown} />

          <p className="text-sm leading-relaxed text-zinc-700">
            {candidate.evidenceSummary}
          </p>

          <EvidenceList title="Matched required criteria" matches={candidate.matchedRequiredCriteria} />
          <EvidenceList title="Matched preferred criteria" matches={candidate.matchedPreferredCriteria} />
          <EvidenceList title="Research areas" matches={candidate.matchedResearchAreas} />
          <EvidenceList
            title="Organisms / systems"
            matches={candidate.matchedOrganismsOrSystems}
          />

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Relevant publications
            </h4>
            <ul className="mt-2 space-y-3">
              {candidate.relevantWorks.map((w) => (
                <li
                  key={w.id}
                  className="rounded-lg border border-zinc-100 p-3"
                >
                  <p className="text-sm font-medium text-zinc-900">
                    {w.title}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {[
                      w.year,
                      w.sourceName,
                      w.publicationTypes?.[0],
                      w.citedByCount != null
                        ? `${w.citedByCount} citations (context only)`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {w.sources && w.sources.length > 0 && (
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                      {w.sources.includes("openalex") &&
                      w.sources.includes("pubmed")
                        ? "PubMed + OpenAlex"
                        : w.sources.includes("pubmed")
                          ? "PubMed"
                          : "OpenAlex"}
                      {w.pmid ? ` · PMID ${w.pmid}` : ""}
                    </p>
                  )}
                  {w.meshTerms && w.meshTerms.length > 0 && (
                    <p className="mt-1 text-xs text-zinc-500">
                      MeSH: {w.meshTerms.slice(0, 5).join(", ")}
                    </p>
                  )}
                  {w.matchedCriteria.length > 0 && (
                    <p className="mt-1 text-xs text-zinc-600">
                      Matching: {w.matchedCriteria.join(", ")}
                    </p>
                  )}
                  {w.abstractSnippet && (
                    <p className="mt-1 text-xs text-zinc-500">{w.abstractSnippet}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    {w.openAlexUrl && (
                      <a
                        href={w.openAlexUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 hover:underline"
                      >
                        OpenAlex
                      </a>
                    )}
                    {w.pubmedUrl && (
                      <a
                        href={w.pubmedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 hover:underline"
                      >
                        PubMed
                      </a>
                    )}
                    {w.doi && (
                      <a
                        href={
                          w.doi.startsWith("http")
                            ? w.doi
                            : `https://doi.org/${w.doi.replace(/^https?:\/\/doi\.org\//, "")}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 hover:underline"
                      >
                        DOI
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {candidate.possibleConcerns.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Possible concerns
              </h4>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-600">
                {candidate.possibleConcerns.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Unknown — requires validation
            </h4>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-600">
              {candidate.unknowns.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </div>

          {candidate.screeningQuestions && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Suggested screening questions
              </h4>
              <ul className="mt-1 list-decimal space-y-1 pl-5 text-sm text-zinc-600">
                {candidate.screeningQuestions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Personalized outreach
            </h4>
            <OutreachEditor candidate={candidate} roleTitle={roleTitle} />
            {focusOutreach && (
              <p className="mt-2 text-xs text-zinc-500">
                Draft a message, edit it, then copy — no automated sending.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="recruiter-notes"
              className="text-xs font-semibold uppercase tracking-wide text-zinc-500"
            >
              Recruiter notes
            </label>
            <textarea
              id="recruiter-notes"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
              placeholder="Private notes for your process (saved with this search)"
            />
          </div>
        </div>

        <div className="flex gap-2 border-t border-zinc-100 px-5 py-3">
          <button
            type="button"
            onClick={onToggleShortlist}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              shortlisted
                ? "bg-brand-600 text-white"
                : "border border-zinc-200"
            }`}
          >
            {shortlisted ? "Remove from shortlist" : "Add to shortlist"}
          </button>
        </div>
      </aside>
    </div>
  );
}
