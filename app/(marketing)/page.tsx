import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import Link from "next/link";
import type { Metadata } from "next";
import TrackedLink from "@/components/TrackedLink";
import { CAREER, TALENT } from "@/lib/products";

export const metadata: Metadata = {
  title: "ResumeX — personal job-search tools",
  description:
    "Private workspace: format a CV, check job fit, draft cover letters, and track applications. For personal use for now.",
};

const FEATURES = [
  {
    icon: "✦",
    title: "CV Formatter",
    description: "Reorganize resume text into a clean structure and export PDF or DOCX.",
    href: "/career/cv",
    cta: "Open formatter",
  },
  {
    icon: "◎",
    title: "Match Analyzer",
    description: "Compare a resume to a job description: match score, criteria, and quotes from the text.",
    href: "/career/analyzer",
    cta: "Open analyzer",
  },
  {
    icon: "⚡",
    title: "AutoApply",
    description: "Chrome extension that fills application forms from your saved profile.",
    href: "/career/autoapply",
    cta: "Open AutoApply",
  },
  {
    icon: "◈",
    title: "Application Tracker",
    description: "Keep applications in one list with status, notes, and CSV export.",
    href: "/career/tracker",
    cta: "Open tracker",
  },
  {
    icon: "✉",
    title: "Cover Letter",
    description: "Draft a letter from your profile and a job description; edit before you copy it.",
    href: "/career/cover-letter",
    cta: "Open cover letter",
  },
  {
    icon: "⊕",
    title: "Job Search",
    description: "Browse live postings and save roles into the tracker.",
    href: "/career/jobs",
    cta: "Open job search",
  },
];

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect(CAREER.home);
  return (
    <div className="relative min-h-full overflow-hidden text-zinc-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-20 h-[500px] w-[500px] rounded-full bg-brand-100/60 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-blue-100/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-brand-50/80 blur-3xl" />
      </div>

      <div className="relative z-10">
        <section className="mx-auto max-w-5xl px-4 pb-16 pt-24 text-center sm:px-6 lg:px-8">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-brand-600">
            {CAREER.name}
          </p>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            <span className="text-zinc-900">ResumeX</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600">
            Personal tools for formatting a CV, checking fit against a job description,
            drafting a cover letter, and tracking applications.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-500">
            Private use for now — not a public product launch.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login?callbackUrl=%2Fcareer%2Fanalyzer"
              className="inline-flex items-center rounded-full bg-brand-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-brand-500"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-8 py-4 text-base font-semibold text-zinc-700 shadow-sm transition hover:border-brand-400 hover:text-brand-700"
            >
              Create an account
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Tools
            </h2>
            <p className="mt-3 text-base text-zinc-500">
              Sign in to open any of these.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Link
                key={f.href}
                href={`/login?callbackUrl=${encodeURIComponent(f.href)}`}
                className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-brand-300 hover:shadow-md"
              >
                <span className="mb-3 text-2xl text-brand-600">{f.icon}</span>
                <h3 className="mb-2 text-base font-semibold text-zinc-900">{f.title}</h3>
                <p className="flex-1 text-sm leading-relaxed text-zinc-500">{f.description}</p>
                <span className="mt-4 text-sm font-medium text-brand-600 transition group-hover:underline">
                  {f.cta} →
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Also in this codebase
              </p>
              <h2 className="mb-2 text-xl font-bold text-zinc-900">
                {TALENT.name}
              </h2>
              <p className="text-sm leading-relaxed text-zinc-600">
                Source scientific candidates from public research with paper-level evidence
                and an explainable relevance score.
              </p>
            </div>
            <TrackedLink
              event="home_talent_cta_click"
              href={TALENT.basePath}
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
            >
              Open {TALENT.name} →
            </TrackedLink>
          </div>
        </section>
      </div>
    </div>
  );
}
