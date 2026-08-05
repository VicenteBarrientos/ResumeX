"use client";

import CopyButton from "@/components/CopyButton";
import DownloadReportButton from "@/components/DownloadReportButton";
import { useLocale } from "@/components/LocaleProvider";
import { formatCareerAnalysisSummary } from "@/lib/format-analysis";
import type { CareerAnalysis, CriteriaItem } from "@/lib/types";

interface ResultCardsProps {
  result: CareerAnalysis;
}

function ScoreRing({ score, matchLabel }: { score: number; matchLabel: string }) {
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
          className="text-zinc-200"
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
        <p className="text-3xl font-bold tabular-nums text-zinc-900">
          {score}
        </p>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{matchLabel}</p>
      </div>
    </div>
  );
}

function CriteriaChecklist({
  title,
  items,
  accent,
  insufficientLabel,
  inferredLabel,
  emptyMessage,
}: {
  title: string;
  items: CriteriaItem[];
  accent: "brand" | "zinc";
  insufficientLabel: string;
  inferredLabel: string;
  emptyMessage: string;
}) {
  const borderClass =
    accent === "brand"
      ? "border-brand-200 bg-brand-50/50"
      : "border-zinc-200 bg-zinc-50/80";

  return (
    <article className={`rounded-2xl border p-5 shadow-sm ${borderClass}`}>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-700">
        {title}
      </h3>
      {items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((item) => {
            const icon =
              item.status === "met" ? "✓" : item.status === "not_met" ? "✕" : "?";
            const iconClass =
              item.status === "met"
                ? "bg-emerald-100 text-emerald-700"
                : item.status === "not_met"
                  ? "bg-rose-100 text-rose-700"
                  : "bg-amber-100 text-amber-800";

            return (
              <li
                key={item.criterion}
                className="rounded-xl border border-zinc-200/80 bg-white/80 p-3"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${iconClass}`}
                    aria-hidden="true"
                  >
                    {icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900">
                      {item.criterion}
                    </p>
                    {item.quote ? (
                      <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                        <span className="text-zinc-500">“</span>
                        {item.quote}
                        <span className="text-zinc-500">”</span>
                        {item.aiInferred ? (
                          <span className="ml-2 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">
                            {inferredLabel}
                          </span>
                        ) : null}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs italic leading-relaxed text-zinc-500">
                        {insufficientLabel}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
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
    emerald: "border-emerald-200 bg-emerald-50/60",
    amber: "border-amber-200 bg-amber-50/60",
    sky: "border-sky-200 bg-sky-50/60",
    violet: "border-violet-200 bg-violet-50/60",
  };

  return (
    <article className={`rounded-2xl border p-5 shadow-sm ${accentClasses[accent]}`}>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-700">
        {title}
      </h3>
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item}
              className="flex gap-2 text-sm leading-relaxed text-zinc-700"
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

function KeywordPills({
  keywords,
  variant,
  emptyMatched,
  emptyMissing,
}: {
  keywords: string[];
  variant: "matched" | "missing";
  emptyMatched: string;
  emptyMissing: string;
}) {
  const pillClass =
    variant === "matched"
      ? "bg-emerald-100 text-emerald-800"
      : "bg-rose-100 text-rose-800";

  if (keywords.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        {variant === "matched" ? emptyMatched : emptyMissing}
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
  const { t } = useLocale();
  const fullSummaryText = formatCareerAnalysisSummary(result);

  return (
    <section className="space-y-6" aria-live="polite">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <ScoreRing score={result.matchScore} matchLabel={t.results.match} />
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-zinc-900">
                  {t.results.overallFit}
                </h2>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <CopyButton
                    text={fullSummaryText}
                    label={t.results.copyFullSummary}
                    copiedLabel={t.results.copied}
                  />
                  <DownloadReportButton result={result} />
                </div>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                {result.summary}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CriteriaChecklist
          title={t.results.mustHave}
          items={result.mustHaveCriteria}
          accent="brand"
          insufficientLabel={t.results.insufficientEvidence}
          inferredLabel={t.results.inferredBadge}
          emptyMessage={t.results.noCriteria}
        />
        <CriteriaChecklist
          title={t.results.niceToHave}
          items={result.niceToHaveCriteria}
          accent="zinc"
          insufficientLabel={t.results.insufficientEvidence}
          inferredLabel={t.results.inferredBadge}
          emptyMessage={t.results.noCriteria}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ListCard
          title={t.results.strengths}
          items={result.strengths}
          emptyMessage={t.results.noStrengths}
          accent="emerald"
        />
        <ListCard
          title={t.results.gaps}
          items={result.gaps}
          emptyMessage={t.results.noGaps}
          accent="amber"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-sky-200 bg-sky-50/60 p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-700">
            {t.results.matchedKeywords}
          </h3>
          <KeywordPills
            keywords={result.matchedKeywords}
            variant="matched"
            emptyMatched={t.results.noMatchedKeywords}
            emptyMissing={t.results.noMissingKeywords}
          />
        </article>
        <article className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-700">
            {t.results.missingKeywords}
          </h3>
          <KeywordPills
            keywords={result.missingKeywords}
            variant="missing"
            emptyMatched={t.results.noMatchedKeywords}
            emptyMissing={t.results.noMissingKeywords}
          />
        </article>
      </div>

      <article className="rounded-2xl border border-violet-200 bg-violet-50/60 p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-700">
          {t.results.suggestions}
        </h3>
        {result.suggestions.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {result.suggestions.map((suggestion) => (
              <div
                key={suggestion.title}
                className="rounded-xl border border-violet-200/80 bg-white/80 p-4"
              >
                <h4 className="font-medium text-zinc-900">
                  {suggestion.title}
                </h4>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                  {suggestion.detail}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">{t.results.noSuggestions}</p>
        )}
      </article>
    </section>
  );
}
