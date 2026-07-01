"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  salary?: string;
  source: string;
  postedAt?: string;
}

export default function JobsPage() {
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const res = await fetch(`/api/jobs?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setJobs(data.results ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Search failed");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  async function saveToTracker(job: Job) {
    if (!session) {
      alert("Please sign in to save jobs to your tracker.");
      return;
    }
    setSaving(job.id);
    try {
      const res = await fetch("/api/tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: job.company,
          role: job.title,
          jobUrl: job.url,
          status: "Applied",
        }),
      });
      if (res.ok) setSaved((s) => new Set([...s, job.id]));
    } finally {
      setSaving(null);
    }
  }

  const inputClass =
    "flex-1 rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10 sm:px-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white sm:text-2xl">Job Search</h1>
        <p className="mt-1 text-sm text-zinc-500">Search live job postings and save them to your tracker with one click.</p>
      </div>

      <form onSubmit={search} className="mb-6 flex gap-2 sm:gap-3 sm:mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Product Manager, React Developer…"
          className={inputClass}
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="shrink-0 rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:bg-gradient-to-r dark:from-cyan-400 dark:to-blue-500 dark:text-[#050816] dark:disabled:bg-white/10 dark:disabled:text-zinc-500 sm:px-6"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span className="hidden sm:inline">Searching…</span>
            </span>
          ) : "Search"}
        </button>
      </form>

      {error && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
          {error === "Job search not configured." ? (
            <>Job search API not configured yet. Add <code className="rounded bg-zinc-100 px-1 dark:bg-white/10">ADZUNA_APP_ID</code> and <code className="rounded bg-zinc-100 px-1 dark:bg-white/10">ADZUNA_APP_KEY</code> to your Vercel environment variables.</>
          ) : error}
        </div>
      )}

      {!loading && searched && jobs.length === 0 && !error && (
        <p className="py-12 text-center text-sm text-zinc-400">No results found for &ldquo;{query}&rdquo;. Try a different keyword.</p>
      )}

      <div className="space-y-4">
        {jobs.map((job) => {
          const isSaved = saved.has(job.id);
          const isSaving = saving === job.id;
          return (
            <div
              key={job.id}
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03] sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-zinc-900 hover:text-indigo-600 dark:text-white dark:hover:text-cyan-300 sm:text-base line-clamp-1"
                    >
                      {job.title}
                    </a>
                    <span className="shrink-0 rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-400 dark:border-white/10">
                      {job.source}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
                    {job.company} · {job.location}
                  </p>
                  {job.salary && (
                    <p className="mt-0.5 text-xs font-medium text-indigo-600 dark:text-cyan-400">{job.salary}</p>
                  )}
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 line-clamp-2">
                    {job.description.slice(0, 200)}…
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-indigo-400 hover:text-indigo-700 dark:border-white/15 dark:bg-white/5 dark:text-zinc-300 sm:px-4"
                  >
                    View
                  </a>
                  <button
                    onClick={() => saveToTracker(job)}
                    disabled={isSaved || isSaving}
                    className="rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-default disabled:bg-zinc-200 disabled:text-zinc-400 dark:bg-gradient-to-r dark:from-cyan-400 dark:to-blue-500 dark:text-[#050816] dark:disabled:bg-white/10 dark:disabled:text-zinc-500 sm:px-4"
                  >
                    {isSaved ? "Saved ✓" : isSaving ? "…" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!searched && !loading && (
        <div className="mt-16 text-center text-zinc-400 dark:text-zinc-600">
          <p className="mb-3 text-4xl">⊕</p>
          <p className="text-sm">Search for jobs above to see live listings.</p>
          {!session && (
            <p className="mt-2 text-xs">
              <a href="/login" className="text-indigo-500 hover:underline dark:text-cyan-400">Sign in</a> to save jobs directly to your tracker.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
