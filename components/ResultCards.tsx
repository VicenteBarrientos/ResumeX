import CopyButton from "@/components/CopyButton";
import DownloadReportButton from "@/components/DownloadReportButton";
import SectionHeader from "@/components/SectionHeader";
import {
  formatClientFacingBullets,
  formatFullAnalysisSummary,
  formatPhoneScreenQuestions,
} from "@/lib/format-analysis";
import type {
  AnalysisResult,
  ConcernLevel,
  CriteriaItem,
  RecommendedNextStep,
  StrongMatch,
} from "@/lib/types";

interface ResultCardsProps {
  result: AnalysisResult;
}

const MISSING_EVIDENCE = "Not found in resume.";

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
          className="text-zinc-200 dark:text-zinc-800"
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
        <p className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
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
      return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200";
    case "Medium":
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200";
    case "High":
      return "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200";
  }
}

function nextStepStyles(step: RecommendedNextStep) {
  switch (step) {
    case "Strongly recommend":
      return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200";
    case "Interview":
      return "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-200";
    case "Screen":
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200";
    case "Reject":
      return "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200";
  }
}

function CriteriaChecklist({
  title,
  items,
  accent,
}: {
  title: string;
  items: CriteriaItem[];
  accent: "indigo" | "zinc";
}) {
  const borderClass =
    accent === "indigo"
      ? "border-indigo-200 bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/20"
      : "border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/40";

  return (
    <article className={`rounded-2xl border p-5 shadow-sm ${borderClass}`}>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-200">
        {title}
      </h3>
      {items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.criterion}
              className="rounded-xl border border-zinc-200/80 bg-white/80 p-3 dark:border-zinc-700 dark:bg-zinc-950/60"
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
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {item.criterion}
                  </p>
                  <p
                    className={`mt-1 text-xs leading-relaxed ${
                      item.evidence === MISSING_EVIDENCE
                        ? "italic text-zinc-500"
                        : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {item.evidence}
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
    <article className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/20">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-200">
        Strong matches with evidence
      </h3>
      {matches.length > 0 ? (
        <ul className="space-y-3">
          {matches.map((item) => (
            <li
              key={item.match}
              className="rounded-xl border border-emerald-200/80 bg-white/80 p-4 dark:border-emerald-800 dark:bg-zinc-950/60"
            >
              <h4 className="font-medium text-zinc-900 dark:text-zinc-100">{item.match}</h4>
              <p
                className={`mt-1 text-sm leading-relaxed ${
                  item.evidence === MISSING_EVIDENCE
                    ? "italic text-zinc-500"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {item.evidence}
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

function ListCard({
  title,
  items,
  emptyMessage,
  accent,
}: {
  title: string;
  items: string[];
  emptyMessage: string;
  accent: "emerald" | "amber" | "sky" | "violet";
}) {
  const accentClasses = {
    emerald: "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30",
    amber: "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30",
    sky: "border-sky-200 bg-sky-50/60 dark:border-sky-900 dark:bg-sky-950/30",
    violet: "border-violet-200 bg-violet-50/60 dark:border-violet-900 dark:bg-violet-950/30",
  };

  return (
    <article className={`rounded-2xl border p-5 shadow-sm ${accentClasses[accent]}`}>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-200">
        {title}
      </h3>
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item}
              className="flex gap-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
      )}
    </article>
  );
}

function KeywordPills({ keywords, variant }: { keywords: string[]; variant: "matched" | "missing" }) {
  const pillClass =
    variant === "matched"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
      : "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200";

  if (keywords.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        {variant === "matched" ? "No clear keyword overlap found." : "No major gaps detected."}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {keywords.map((keyword) => (
        <span
          key={keyword}
          className={`rounded-full px-3 py-1 text-xs font-medium ${pillClass}`}
        >
          {keyword}
        </span>
      ))}
    </div>
  );
}

export default function ResultCards({ result }: ResultCardsProps) {
  const fullSummaryText = formatFullAnalysisSummary(result);

  return (
    <section className="space-y-6" aria-live="polite">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <ScoreRing score={result.matchScore} />
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Overall fit
                </h2>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <CopyButton text={fullSummaryText} label="Copy full summary" />
                  <DownloadReportButton result={result} />
                </div>
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
                <span>{result.concernLevel}</span>
              </div>
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium ${nextStepStyles(result.recommendedNextStep)}`}
              >
                <span className="text-xs uppercase tracking-wide opacity-80">Recommendation</span>
                <span>{result.recommendedNextStep}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CriteriaChecklist
          title="Must-have criteria"
          items={result.mustHaveCriteria}
          accent="indigo"
        />
        <CriteriaChecklist
          title="Nice-to-have criteria"
          items={result.niceToHaveCriteria}
          accent="zinc"
        />
      </div>

      <StrongMatchesList matches={result.strongMatches} />

      <div className="grid gap-4 md:grid-cols-2">
        <ListCard
          title="Strengths"
          items={result.strengths}
          emptyMessage="No standout strengths identified."
          accent="emerald"
        />
        <ListCard
          title="Gaps"
          items={result.gaps}
          emptyMessage="No major gaps identified."
          accent="amber"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-sky-200 bg-sky-50/60 p-5 shadow-sm dark:border-sky-900 dark:bg-sky-950/30">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-200">
            Matched keywords
          </h3>
          <KeywordPills keywords={result.matchedKeywords} variant="matched" />
        </article>
        <article className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5 shadow-sm dark:border-rose-900 dark:bg-rose-950/30">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-200">
            Missing keywords
          </h3>
          <KeywordPills keywords={result.missingKeywords} variant="missing" />
        </article>
      </div>

      <article className="rounded-2xl border border-violet-200 bg-violet-50/60 p-5 shadow-sm dark:border-violet-900 dark:bg-violet-950/30">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-200">
          Suggestions
        </h3>
        {result.suggestions.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {result.suggestions.map((suggestion) => (
              <div
                key={suggestion.title}
                className="rounded-xl border border-violet-200/80 bg-white/80 p-4 dark:border-violet-800 dark:bg-zinc-950/60"
              >
                <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
                  {suggestion.title}
                </h4>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {suggestion.detail}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No suggestions available.</p>
        )}
      </article>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-sky-200 bg-sky-50/60 p-5 shadow-sm dark:border-sky-900 dark:bg-sky-950/30">
          <SectionHeader
            title="Suggested Interview Questions"
            copyText={formatPhoneScreenQuestions(result.phoneScreenQuestions)}
          />
          <ol className="space-y-3">
            {result.phoneScreenQuestions.map((question, index) => (
              <li
                key={question}
                className="flex gap-3 rounded-xl border border-sky-200/80 bg-white/80 p-3 text-sm leading-relaxed text-zinc-700 dark:border-sky-800 dark:bg-zinc-950/60 dark:text-zinc-300"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-800 dark:bg-sky-900/60 dark:text-sky-200">
                  {index + 1}
                </span>
                <span>{question}</span>
              </li>
            ))}
          </ol>
        </article>

        <article className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 shadow-sm dark:border-indigo-900 dark:bg-indigo-950/30">
          <SectionHeader
            title="AI Assessment Highlights"
            copyText={formatClientFacingBullets(result.clientFacingBullets)}
          />
          <ul className="space-y-3">
            {result.clientFacingBullets.map((bullet) => (
              <li
                key={bullet}
                className="flex gap-2 rounded-xl border border-indigo-200/80 bg-white/80 p-3 text-sm leading-relaxed text-zinc-700 dark:border-indigo-800 dark:bg-zinc-950/60 dark:text-zinc-300"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>

      
    </section>
  );
}
