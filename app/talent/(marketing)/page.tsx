import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import TrackedLink from "@/components/TrackedLink";
import { authOptions } from "@/lib/auth-options";
import { CAREER, TALENT } from "@/lib/products";

export const metadata: Metadata = {
  title: {
    absolute: `${TALENT.name} — evidence-based candidate discovery`,
  },
  description:
    "Source hard-to-fill scientific roles from public scholarly data. Every candidate comes with paper-level evidence and an explainable relevance score.",
};

const STEPS = [
  {
    n: "1",
    title: "Describe the role",
    body: "Paste a job description. Talent Mapper extracts sourcing criteria — techniques, systems, seniority, geography — and every one of them stays editable.",
  },
  {
    n: "2",
    title: "See the query before it runs",
    body: "The OpenAlex search is built in front of you and shown as plain text. Turn queries off, rewrite them, or run only the ones you trust.",
  },
  {
    n: "3",
    title: "Read the evidence, not a summary",
    body: "Each researcher is assembled from their public works. Every important match points at the paper it came from, with the real excerpt and its source.",
  },
  {
    n: "4",
    title: "Reach out on your terms",
    body: "Draft outreach that cites the specific work, edit it, shortlist who is worth a conversation, and export the shortlist to CSV. Nothing is ever sent for you.",
  },
];

const SCORE = [
  { label: "Required-technique evidence", max: 40 },
  { label: "Research area / systems", max: 20 },
  { label: "Recency of relevant work", max: 15 },
  { label: "Repeated evidence across works", max: 10 },
  { label: "Geography / institution signal", max: 10 },
  { label: "Seniority / ownership signal", max: 5 },
];

const LIMITS = [
  "Publication affiliation is not proof of current employment.",
  "The score measures relevance to your criteria — not hiring quality, availability, or work eligibility.",
  "OpenAlex metadata can be incomplete or stale, and author identities are sometimes merged or split.",
  "No LinkedIn scraping, no Google Scholar scraping, no private contact data.",
];

export default async function TalentLandingPage() {
  const session = await getServerSession(authOptions);
  const primaryHref = session
    ? TALENT.home
    : `/login?callbackUrl=${encodeURIComponent(TALENT.home)}`;

  return (
    <div className="relative min-h-full text-zinc-900">
      <div className="relative z-10">
        <section className="mx-auto max-w-5xl px-4 pb-14 pt-20 sm:px-6 lg:px-8">
          <p className="mb-3 text-sm font-semibold text-brand-700">
            {TALENT.name} — for {TALENT.audience.toLowerCase()}
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Find researchers by their evidence,{" "}
            <span className="text-brand-600">not by their job title</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-zinc-600">
            Source candidates from public research publications, with paper-level evidence
            and an explainable relevance score.
          </p>
          <p className="mt-2 max-w-xl text-sm text-zinc-500">
            Private use for now — not a public product launch.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <TrackedLink
              event="talent_landing_mapper_cta"
              href={primaryHref}
              className="inline-flex items-center rounded-lg bg-brand-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-brand-500"
            >
              Open Talent Mapper
            </TrackedLink>
            <TrackedLink
              event="talent_landing_mapper_cta"
              href={session ? TALENT.home : "/register"}
              className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-6 py-3 text-base font-semibold text-zinc-700 transition hover:border-brand-300 hover:text-brand-700"
            >
              {session ? "Run demo search →" : "Create account →"}
            </TrackedLink>
          </div>
          <p className="mt-3 text-sm text-zinc-500">
            Demo snapshot works without an OpenAlex key.
          </p>
        </section>

        <section className="border-y border-zinc-200 bg-white py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-10 text-2xl font-bold tracking-tight sm:text-3xl">
              How it works
            </h2>
            <div className="grid gap-8 sm:grid-cols-2">
              {STEPS.map((s) => (
                <div key={s.n} className="flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white">
                    {s.n}
                  </div>
                  <div>
                    <h3 className="mb-1 text-base font-semibold">{s.title}</h3>
                    <p className="text-sm leading-relaxed text-zinc-500">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              An explainable score, not a black box
            </h2>
            <p className="mt-2 text-base text-zinc-500">
              Research relevance out of 100. Every point is attributable, and you can see
              which paper earned it.
            </p>
          </div>
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            {SCORE.map((row) => (
              <div
                key={row.label}
                className="flex items-center gap-4 border-b border-zinc-100 px-5 py-3 last:border-0"
              >
                <span className="flex-1 text-sm text-zinc-700">{row.label}</span>
                <div className="hidden h-1.5 w-40 overflow-hidden rounded-full bg-zinc-100 sm:block">
                  <div
                    className="h-full rounded-full bg-brand-600"
                    style={{ width: `${row.max}%` }}
                  />
                </div>
                <span className="w-10 text-right text-sm font-semibold tabular-nums text-zinc-900">
                  {row.max}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-zinc-200 bg-zinc-50 py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-3 text-2xl font-bold tracking-tight">
              What this does not tell you
            </h2>
            <p className="mb-8 text-base text-zinc-500">
              A sourcing tool that hides its uncertainty costs you credibility the first time
              a domain expert reads a bad match. So these are on the label:
            </p>
            <ul className="space-y-3">
              {LIMITS.map((limit) => (
                <li
                  key={limit}
                  className="flex gap-3 text-sm leading-relaxed text-zinc-600"
                >
                  <span className="mt-0.5 shrink-0 text-zinc-400">—</span>
                  {limit}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Map a role you cannot fill
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <TrackedLink
              event="talent_landing_mapper_cta"
              href={primaryHref}
              className="inline-flex items-center rounded-lg bg-brand-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-brand-500"
            >
              Open Talent Mapper
            </TrackedLink>
            <TrackedLink
              event="talent_landing_assess_cta"
              href={
                session
                  ? "/talent/assess"
                  : `/login?callbackUrl=${encodeURIComponent("/talent/assess")}`
              }
              className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-6 py-3 text-base font-semibold text-zinc-700 transition hover:border-brand-300 hover:text-brand-700"
            >
              Assess a resume →
            </TrackedLink>
          </div>
          <p className="mt-10 text-sm text-zinc-500">
            Looking for a job instead?{" "}
            <Link href="/" className="font-medium underline hover:text-zinc-700">
              {CAREER.name}
            </Link>{" "}
            is the candidate side of ResumeX.
          </p>
        </section>
      </div>
    </div>
  );
}
