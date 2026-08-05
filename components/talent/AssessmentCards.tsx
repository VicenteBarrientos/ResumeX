"use client";

import CopyButton from "@/components/CopyButton";
import SectionHeader from "@/components/SectionHeader";
import {
  formatClientFacingBullets,
  formatPhoneScreenQuestions,
  formatSendoutBlurb,
  formatTalentAssessmentSummary,
} from "@/lib/format-analysis";
import type {
  ConcernLevel,
  CriteriaItem,
  RecommendedNextStep,
  StrongMatch,
  TalentAssessment,
} from "@/lib/types";

interface AssessmentCardsProps {
  result: TalentAssessment;
}

const API_MISSING_EVIDENCE = "Not found in resume.";

const CONCERN_LABELS: Record<ConcernLevel, string> = {
  Low: "Low",
  Medium: "Medium",
  High: "High",
};

const NEXT_STEP_LABELS: Record<RecommendedNextStep, string> = {
  Reject: "Reject",
  Screen: "Screen",
  Interview: "Interview",
  "Strongly recommend": "Strongly recommend",
};

function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 75 ? "stroke-emerald-500" : score >= 50 ? "stroke-amber-500" : "stroke-rose-500";

  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg className="-rotate-90" width="144" height="144" viewBox="0 0 144 144">
        <circle
          cx="72"
          cy="72"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-zinc-200 dark:text-white/10"
        />
        <circle
          cx="72"
          cy="72"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={color}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-white">
          {score}
        </p>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Match</p>
      </div>
    </div>
  );
}

function concernStyles(level: ConcernLevel) {
  switch (level) {
    case "Low":
      return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200";
    case "Medium":
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200";
    case "High":
      return "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200";
  }
}

function nextStepStyles(step: RecommendedNextStep) {
  switch (step) {
    case "Strongly recommend":
      return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200";
    case "Interview":
      return "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-200";
    case "Screen":
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200";
    case "Reject":
      return "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200";
  }
}

function CriteriaChecklist({
  title,
  items,
}: {
  title: string;
  items: CriteriaItem[];
}) {
  return (
    <article className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-5 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-400/10">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-200">
        {title}
      </h3>
      {items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.criterion}
              className="rounded-xl border border-zinc-200/80 bg-white/80 p-3 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    item.met
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-200"
                  }`}
                  aria-hidden="true"
                >
                  {item.met ? "✓" : "✕"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">
                    {item.criterion}
                  </p>
                  <p
                    className={`mt-1 text-xs leading-relaxed ${
                      item.evidence === API_MISSING_EVIDENCE
                        ? "italic text-zinc-500"
                        : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {item.evidence === API_MISSING_EVIDENCE
                      ? "Not found in resume."
                      : item.evidence}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">No criteria identified.</p>
      )}
    </article>
  );
}

function StrongMatchesList({ matches }: { matches: StrongMatch[] }) {
  return (
    <article className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-400/10">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-200">
        Strong matches
      </h3>
      {matches.length > 0 ? (
        <ul className="space-y-3">
          {matches.map((item) => (
            <li
              key={item.match}
              className="rounded-xl border border-emerald-200/80 bg-white/80 p-4 dark:border-emerald-400/20 dark:bg-white/[0.03]"
            >
              <h4 className="font-medium text-zinc-900 dark:text-white">{item.match}</h4>
              <p
                className={`mt-1 text-sm leading-relaxed ${
                  item.evidence === API_MISSING_EVIDENCE
                    ? "italic text-zinc-500"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {item.evidence === API_MISSING_EVIDENCE
                  ? "Not found in resume."
                  : item.evidence}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">No strong matches identified.</p>
      )}
    </article>
  );
}

export default function AssessmentCards({ result }: AssessmentCardsProps) {
  const fullSummaryText = formatTalentAssessmentSummary(result);

  return (
    <section className="space-y-6" aria-live="polite">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <ScoreRing score={result.matchScore} />
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  Decision summary
                </h2>
                <CopyButton
                  text={fullSummaryText}
                  label="Copy assessment"
                  copiedLabel="Copied"
                />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {result.summary}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium ${concernStyles(result.concernLevel)}`}
              >
                <span className="text-xs uppercase tracking-wide opacity-80">Concern</span>
                <span>{CONCERN_LABELS[result.concernLevel]}</span>
              </div>
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium ${nextStepStyles(result.recommendedNextStep)}`}
              >
                <span className="text-xs uppercase tracking-wide opacity-80">Next step</span>
                <span>{NEXT_STEP_LABELS[result.recommendedNextStep]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CriteriaChecklist title="Must-have criteria" items={result.mustHaveCriteria} />
        <CriteriaChecklist title="Nice-to-have criteria" items={result.niceToHaveCriteria} />
      </div>

      <StrongMatchesList matches={result.strongMatches} />

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-sky-200 bg-sky-50/60 p-5 shadow-sm dark:border-sky-400/20 dark:bg-sky-400/10">
          <SectionHeader
            title="Phone-screen questions"
            copyText={formatPhoneScreenQuestions(result.phoneScreenQuestions)}
            copyLabel="Copy"
            copiedLabel="Copied"
          />
          <ol className="space-y-3">
            {result.phoneScreenQuestions.map((question, index) => (
              <li
                key={question}
                className="flex gap-3 rounded-xl border border-sky-200/80 bg-white/80 p-3 text-sm leading-relaxed text-zinc-700 dark:border-sky-400/20 dark:bg-white/[0.03] dark:text-zinc-300"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-800 dark:bg-sky-400/20 dark:text-sky-200">
                  {index + 1}
                </span>
                <span>{question}</span>
              </li>
            ))}
          </ol>
        </article>

        <article className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-400/10">
          <SectionHeader
            title="Client-facing bullets"
            copyText={formatClientFacingBullets(result.clientFacingBullets)}
            copyLabel="Copy"
            copiedLabel="Copied"
          />
          <ul className="space-y-3">
            {result.clientFacingBullets.map((bullet) => (
              <li
                key={bullet}
                className="flex gap-2 rounded-xl border border-emerald-200/80 bg-white/80 p-3 text-sm leading-relaxed text-zinc-700 dark:border-emerald-400/20 dark:bg-white/[0.03] dark:text-zinc-300"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <SectionHeader
          title="Sendout blurb"
          copyText={formatSendoutBlurb(result.sendoutBlurb)}
          copyLabel="Copy"
          copiedLabel="Copied"
        />
        <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {result.sendoutBlurb}
        </p>
      </article>
    </section>
  );
}
