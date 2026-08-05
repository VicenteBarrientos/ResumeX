import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import Link from "next/link";
import type { Metadata } from "next";
import { CAREER, TALENT } from "@/lib/products";

export const metadata: Metadata = {
  title: "ResumeX — Your AI-Powered Job Search Platform",
  description:
    "Format your CV, analyze job fit, generate cover letters, auto-apply, and track every application — all in one place. Free to start.",
};

const FEATURES = [
  {
    icon: "✦",
    title: "CV Formatter",
    description: "Turn any messy resume into a polished, professional CV in one click. Export to PDF or DOCX.",
    href: "/career/cv",
    cta: "Format my CV",
  },
  {
    icon: "◎",
    title: "Resume Analyzer",
    description: "Paste a job description and get an instant AI match score, gaps analysis, and interview prep questions.",
    href: "/career/analyzer",
    cta: "Analyze my resume",
  },
  {
    icon: "⚡",
    title: "AutoApply",
    description: "Chrome extension that auto-fills job applications using your saved profile. Apply 10× faster.",
    href: "/career/autoapply",
    cta: "Set up AutoApply",
  },
  {
    icon: "◈",
    title: "Application Tracker",
    description: "Track every application in one dashboard. Pipeline view, CSV export, and status updates.",
    href: "/career/tracker",
    cta: "Open tracker",
  },
  {
    icon: "✉",
    title: "Cover Letter Generator",
    description: "AI writes a tailored cover letter using your profile and the job description. Edit and copy instantly.",
    href: "/career/cover-letter",
    cta: "Generate cover letter",
  },
  {
    icon: "⊕",
    title: "Job Search",
    description: "Search thousands of live job postings and save them directly to your tracker with one click.",
    href: "/career/jobs",
    cta: "Search jobs",
  },
];

const STEPS = [
  { n: "1", title: "Create your account", body: "Register free. Upload your resume once and we extract your profile automatically." },
  { n: "2", title: "Analyze your fit", body: "Paste any job description. Get a match score, gaps, and tailored suggestions in seconds." },
  { n: "3", title: "Apply faster", body: "Use AutoApply to fill forms automatically, or one-click save jobs to your tracker." },
  { n: "4", title: "Track everything", body: "See your full pipeline — Applied, Interview, Offer — and export to CSV anytime." },
];

const FREE_FEATURES = [
  "CV Formatter",
  "Job Search",
  "Application Tracker (up to 10)",
  "1 Cover Letter/day",
  "Resume Analyzer (1/week)",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Unlimited Cover Letters",
  "Unlimited Resume Analysis",
  "AutoApply Chrome Extension",
  "PDF Resume Storage",
  "Weekly Job Digest Emails",
  "Priority Support",
];

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect(CAREER.home);
  return (
    <div className="relative min-h-full overflow-hidden bg-white text-zinc-900 dark:bg-[#050816] dark:text-white">
      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-20 h-[500px] w-[500px] rounded-full bg-indigo-100/60 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-blue-100/40 blur-3xl dark:bg-blue-600/10" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-indigo-50/80 blur-3xl dark:bg-sky-400/5" />
      </div>

      <div className="relative z-10">
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-4 pb-20 pt-24 text-center sm:px-6 lg:px-8">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-indigo-600 dark:text-cyan-300">
            AI-Powered Job Search Platform
          </p>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            <span className="text-zinc-900 dark:bg-gradient-to-r dark:from-white dark:via-cyan-100 dark:to-blue-300 dark:bg-clip-text dark:text-transparent">
              Land your next job
            </span>
            <br />
            <span className="text-indigo-600 dark:text-cyan-400">10× faster</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-300">
            Format your CV, analyze job fit, generate cover letters, auto-apply, and track every application — all in one place. Free to start.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center rounded-full bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-indigo-500 dark:bg-gradient-to-r dark:from-cyan-400 dark:to-blue-500 dark:text-[#050816] dark:hover:opacity-90"
            >
              Get started free
            </Link>
            <Link
              href="/login?callbackUrl=%2Fcareer%2Fanalyzer"
              className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-8 py-4 text-base font-semibold text-zinc-700 shadow-sm transition hover:border-indigo-400 hover:text-indigo-700 dark:border-white/15 dark:bg-white/5 dark:text-zinc-200 dark:hover:border-cyan-400/50"
            >
              Sign in to tools →
            </Link>
          </div>
        </section>

        {/* Features grid */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
              Everything you need to get hired
            </h2>
            <p className="mt-3 text-base text-zinc-500 dark:text-zinc-400">
              Six tools that work together, powered by AI.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Link
                key={f.href}
                href={`/login?callbackUrl=${encodeURIComponent(f.href)}`}
                className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-cyan-400/30"
              >
                <span className="mb-3 text-2xl text-indigo-600 dark:text-cyan-400">{f.icon}</span>
                <h3 className="mb-2 text-base font-semibold text-zinc-900 dark:text-white">{f.title}</h3>
                <p className="flex-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{f.description}</p>
                <span className="mt-4 text-sm font-medium text-indigo-600 transition group-hover:underline dark:text-cyan-300">
                  {f.cta} →
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Cross-product band: the recruiter side of ResumeX (R-003) */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-8 sm:flex-row sm:items-center sm:justify-between dark:border-emerald-400/20 dark:bg-emerald-400/[0.06]">
            <div className="max-w-xl">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                Hiring instead?
              </p>
              <h2 className="mb-2 text-xl font-bold text-zinc-900 dark:text-white">
                {TALENT.name}
              </h2>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                Source hard-to-fill scientific roles from public research: every candidate
                comes with paper-level evidence and an explainable relevance score, so you can
                tell a real match from a keyword match.
              </p>
            </div>
            <Link
              href={TALENT.basePath}
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 dark:bg-emerald-500 dark:text-[#04150f] dark:hover:bg-emerald-400"
            >
              See {TALENT.name} →
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-zinc-50 py-20 dark:bg-white/[0.02]">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                How it works
              </h2>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s) => (
                <div key={s.n} className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white dark:bg-gradient-to-br dark:from-cyan-400 dark:to-blue-500 dark:text-[#050816]">
                    {s.n}
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-zinc-900 dark:text-white">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="bg-zinc-50 py-20 dark:bg-white/[0.02]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                Simple pricing
              </h2>
              <p className="mt-3 text-base text-zinc-500 dark:text-zinc-400">
                Start free. Upgrade when you&apos;re ready.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Free */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-zinc-400">Free</p>
                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-zinc-900 dark:text-white">$0</span>
                  <span className="text-zinc-400">/month</span>
                </div>
                <ul className="mb-8 space-y-3">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                      <span className="text-indigo-600 dark:text-cyan-400">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className="block w-full rounded-full border border-zinc-300 py-3 text-center text-sm font-semibold text-zinc-700 transition hover:border-indigo-400 hover:text-indigo-700 dark:border-white/15 dark:text-zinc-300"
                >
                  Get started free
                </Link>
              </div>

              {/* Pro */}
              <div className="relative rounded-2xl border-2 border-indigo-600 bg-white p-8 shadow-md dark:border-cyan-400/50 dark:bg-white/[0.05]">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-1 text-xs font-semibold text-white dark:bg-cyan-400 dark:text-[#050816]">
                  Most popular
                </div>
                <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-cyan-400">Pro</p>
                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-zinc-900 dark:text-white">$5</span>
                  <span className="text-zinc-400">/month</span>
                </div>
                <ul className="mb-8 space-y-3">
                  {PRO_FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                      <span className="text-indigo-600 dark:text-cyan-400">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className="block w-full rounded-full bg-indigo-600 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-500 dark:bg-gradient-to-r dark:from-cyan-400 dark:to-blue-500 dark:text-[#050816]"
                >
                  Start free, upgrade anytime
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            Ready to find your next role?
          </h2>
          <p className="mt-4 text-base text-zinc-500 dark:text-zinc-400">
            Join ResumeX for free. No credit card required.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center rounded-full bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-indigo-500 dark:bg-gradient-to-r dark:from-cyan-400 dark:to-blue-500 dark:text-[#050816] dark:hover:opacity-90"
            >
              Create free account
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Already have an account? Sign in →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
