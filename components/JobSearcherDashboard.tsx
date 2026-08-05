"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CandidateProfile } from "@/lib/autoapply-types";
import {
  getBackendSecret,
  getBackendUrl,
  matchJob,
  matchJobsBatch,
  normalizeJob,
  saveBackendSettings,
  searchJobs,
} from "@/lib/job-api";
import { loadJobs, loadProfile, mergeJobs, saveJobs } from "@/lib/job-storage";
import type { Job } from "@/lib/job-types";

const TABS = [
  { id: "discover", label: "🔍 Discover" },
  { id: "queue", label: "📋 Queue" },
  { id: "saved", label: "⭐ Saved" },
] as const;

type TabId = (typeof TABS)[number]["id"];
type FilterId = "open" | "all" | "auto" | "applied";

function parseList(str: string): string[] {
  return str.split(",").map((s) => s.trim()).filter(Boolean);
}

function scoreColor(score: number | null): string {
  if (score == null) return "text-zinc-500";
  if (score >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function JobCard({
  job,
  onMatch,
  onApply,
  onSave,
  onDismiss,
  busy,
}: {
  job: Job;
  onMatch: () => void;
  onApply: () => void;
  onSave: () => void;
  onDismiss: () => void;
  busy: boolean;
}) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-zinc-900 dark:text-white">{job.title}</h3>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            {job.company}
            {job.location ? ` · ${job.location}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
              {job.platform}
            </span>
            {job.remote && (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-700 dark:bg-sky-400/15 dark:text-sky-300">
                Remote
              </span>
            )}
            {job.applySupported && (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700 dark:bg-cyan-400/15 dark:text-cyan-300">
                ⚡ AutoApply
              </span>
            )}
            {job.status === "applied" && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">
                Applied
              </span>
            )}
            {job.matchScore != null && (
              <span className={`rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium dark:bg-white/10 ${scoreColor(job.matchScore)}`}>
                {job.matchScore}% match
              </span>
            )}
          </div>
        </div>
      </div>

      {job.matchSummary && (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{job.matchSummary}</p>
      )}
      {job.matchGaps?.length > 0 && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Gaps: {job.matchGaps.join(", ")}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {job.matchScore == null && job.status !== "applied" && (
          <button
            type="button"
            disabled={busy}
            onClick={onMatch}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
          >
            Analyze match
          </button>
        )}
        {job.url && (
          <button
            type="button"
            onClick={onApply}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 dark:bg-cyan-500 dark:hover:bg-cyan-400"
          >
            Open & apply
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={onSave}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-zinc-200"
        >
          {job.status === "saved" ? "Saved ✓" : "Save"}
        </button>
        {job.status !== "applied" && (
          <button
            type="button"
            disabled={busy}
            onClick={onDismiss}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Dismiss
          </button>
        )}
      </div>
    </article>
  );
}

export default function JobSearcherDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("discover");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<FilterId>("open");
  const [greenhouseBoards, setGreenhouseBoards] = useState("");
  const [leverBoards, setLeverBoards] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [backendUrl, setBackendUrl] = useState("");
  const [backendSecret, setBackendSecret] = useState("");

  const refresh = useCallback(() => {
    setJobs(loadJobs());
    const p = loadProfile();
    setProfile(p);
    if (p?.target?.greenhouseBoards?.length && !greenhouseBoards) {
      setGreenhouseBoards(p.target.greenhouseBoards.join(", "));
    }
    if (p?.target?.leverBoards?.length && !leverBoards) {
      setLeverBoards(p.target.leverBoards.join(", "));
    }
  }, [greenhouseBoards, leverBoards]);

  useEffect(() => {
    queueMicrotask(() => {
      refresh();
      setBackendUrl(getBackendUrl());
      setBackendSecret(getBackendSecret());
    });

    const onJobsUpdated = (e: Event) => {
      setJobs((e as CustomEvent<Job[]>).detail ?? loadJobs());
    };
    const onProfileUpdated = (e: Event) => {
      setProfile((e as CustomEvent<CandidateProfile>).detail);
    };

    window.addEventListener("resumex:jobs_updated", onJobsUpdated);
    window.addEventListener("resumex:profile_updated", onProfileUpdated);
    window.addEventListener("autoapply:profile_updated", onProfileUpdated);
    return () => {
      window.removeEventListener("resumex:jobs_updated", onJobsUpdated);
      window.removeEventListener("resumex:profile_updated", onProfileUpdated);
      window.removeEventListener("autoapply:profile_updated", onProfileUpdated);
    };
  }, [refresh]);

  const persistJobs = (updated: Job[]) => {
    setJobs(updated);
    saveJobs(updated);
  };

  const persistWatchlists = (p: CandidateProfile): CandidateProfile => {
    const updated = {
      ...p,
      target: {
        ...p.target,
        greenhouseBoards: parseList(greenhouseBoards),
        leverBoards: parseList(leverBoards),
      },
    };
    localStorage.setItem("autoapply_profile", JSON.stringify(updated));
    localStorage.setItem("resumex_profile", JSON.stringify(updated));
    setProfile(updated);
    return updated;
  };

  const showStatus = (text: string, isError = false) => {
    setStatus(isError ? `⚠ ${text}` : text);
    if (text) setTimeout(() => setStatus(""), 5000);
  };

  const stats = useMemo(() => {
    const open = jobs.filter((j) => j.status !== "applied" && j.status !== "dismissed").length;
    const analyzed = jobs.filter((j) => j.matchScore != null).length;
    const autoReady = jobs.filter((j) => j.applySupported && j.status !== "applied").length;
    const applied = jobs.filter((j) => j.status === "applied").length;
    return { open, analyzed, autoReady, applied };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    let list = jobs.filter((j) => j.status !== "dismissed" || filter === "all");
    if (activeTab === "saved") {
      list = list.filter((j) => j.status === "saved");
    } else if (filter === "open") {
      list = list.filter((j) => j.status !== "applied" && j.status !== "dismissed");
    } else if (filter === "auto") {
      list = list.filter((j) => j.applySupported && j.status !== "applied");
    } else if (filter === "applied") {
      list = list.filter((j) => j.status === "applied");
    }
    return [...list].sort(
      (a, b) => new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime()
    );
  }, [jobs, filter, activeTab]);

  const handleSearch = async () => {
    if (!profile) {
      showStatus("No profile — set one up in AutoApply → My Profile first.", true);
      return;
    }
    setBusy(true);
    try {
      const p = persistWatchlists(profile);
      showStatus("Searching job boards…");
      const gh = parseList(greenhouseBoards);
      const lv = parseList(leverBoards);
      const res = await searchJobs(p, { greenhouseBoards: gh, leverBoards: lv, limit: 40 });
      const merged = mergeJobs(jobs, res.jobs || []);
      persistJobs(merged);
      const sources = res.meta?.sources?.join(", ") || "providers";
      showStatus(`Found ${res.jobs?.length ?? 0} jobs (${sources}).`);
      setActiveTab("queue");
    } catch (e) {
      showStatus(e instanceof Error ? e.message : "Search failed", true);
    } finally {
      setBusy(false);
    }
  };

  const handleBatchMatch = async () => {
    if (!profile) {
      showStatus("No profile — set one up in AutoApply first.", true);
      return;
    }
    const unscored = jobs.filter(
      (j) => j.matchScore == null && j.status !== "applied" && j.status !== "dismissed"
    );
    if (!unscored.length) {
      showStatus("No jobs pending analysis.");
      return;
    }
    setBusy(true);
    try {
      showStatus(`Analyzing top ${Math.min(5, unscored.length)} jobs…`);
      const { results } = await matchJobsBatch(profile, unscored, 5);
      const byId = new Map(results.map((r) => [r.jobId, r]));
      const updated = jobs.map((j) => {
        const r = byId.get(j.id);
        if (!r) return j;
        return {
          ...j,
          matchScore: r.score,
          matchGaps: r.matchGaps || r.gaps || [],
          matchSummary: r.matchSummary || r.summary || null,
        };
      });
      persistJobs(updated);
      showStatus(`Analyzed ${results.length} jobs.`);
    } catch (e) {
      showStatus(e instanceof Error ? e.message : "Batch match failed", true);
    } finally {
      setBusy(false);
    }
  };

  const handleAddUrl = async () => {
    const url = addUrl.trim();
    if (!url) return;
    setBusy(true);
    try {
      showStatus("Adding job from URL…");
      const job = await normalizeJob({ url });
      persistJobs(mergeJobs(jobs, [job]));
      setAddUrl("");
      showStatus(`Added: ${job.title}`);
      setActiveTab("queue");
    } catch (e) {
      showStatus(e instanceof Error ? e.message : "Could not add job", true);
    } finally {
      setBusy(false);
    }
  };

  const handleMatch = async (jobId: string) => {
    if (!profile) return;
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    setBusy(true);
    try {
      const res = await matchJob(profile, job);
      persistJobs(
        jobs.map((j) =>
          j.id === jobId
            ? {
                ...j,
                matchScore: res.score,
                matchGaps: res.matchGaps || res.gaps || [],
                matchSummary: res.matchSummary || res.summary || null,
              }
            : j
        )
      );
      showStatus(`Match: ${res.score}%`);
    } catch (e) {
      showStatus(e instanceof Error ? e.message : "Match failed", true);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveBackend = () => {
    saveBackendSettings(backendUrl, backendSecret);
    showStatus("Backend settings saved.");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-cyan-400">
          Job Search Hub
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
          Job Searcher
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Discover roles, analyze fit against your profile, and queue jobs for AutoApply.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "In queue", value: stats.open },
          { label: "Analyzed", value: stats.analyzed },
          { label: "AutoApply-ready", value: stats.autoReady },
          { label: "Applied", value: stats.applied },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/5"
          >
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-zinc-800 dark:text-zinc-100">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 flex gap-2 border-b border-zinc-200 dark:border-white/10">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-indigo-500 text-indigo-600 dark:border-cyan-400 dark:text-cyan-300"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {status && (
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">{status}</p>
      )}

      {activeTab === "discover" && (
        <div className="space-y-6">
          {!profile && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
              No candidate profile found. Open{" "}
              <a href="/career/autoapply" className="font-medium underline">
                AutoApply → My Profile
              </a>{" "}
              to set one up first.
            </div>
          )}

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Board watchlists</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Comma-separated Greenhouse and Lever board slugs (e.g. stripe, figma).
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Greenhouse boards
                <input
                  type="text"
                  value={greenhouseBoards}
                  onChange={(e) => setGreenhouseBoards(e.target.value)}
                  placeholder="stripe, figma, notion"
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-white/5 dark:text-white"
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Lever boards
                <input
                  type="text"
                  value={leverBoards}
                  onChange={(e) => setLeverBoards(e.target.value)}
                  placeholder="netflix, spotify"
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-white/5 dark:text-white"
                />
              </label>
            </div>
            <button
              type="button"
              disabled={busy || !profile}
              onClick={handleSearch}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-cyan-500 dark:hover:bg-cyan-400"
            >
              {busy ? "Searching…" : "Search jobs"}
            </button>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Add by URL</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                type="url"
                value={addUrl}
                onChange={(e) => setAddUrl(e.target.value)}
                placeholder="https://boards.greenhouse.io/…"
                className="min-w-[16rem] flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-white/5 dark:text-white"
              />
              <button
                type="button"
                disabled={busy || !addUrl.trim()}
                onClick={handleAddUrl}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-white"
              >
                Add job
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Backend API</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Used for search and match analysis. Same secret as the AutoApply extension.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Backend URL
                <input
                  type="url"
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-white/5 dark:text-white"
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                API secret
                <input
                  type="password"
                  value={backendSecret}
                  onChange={(e) => setBackendSecret(e.target.value)}
                  placeholder="AUTOAPPLY_SECRET"
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-white/5 dark:text-white"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={handleSaveBackend}
              className="mt-4 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-white/15 dark:bg-white/5 dark:text-white"
            >
              Save settings
            </button>
          </section>
        </div>
      )}

      {(activeTab === "queue" || activeTab === "saved") && (
        <div>
          {activeTab === "queue" && (
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterId)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm dark:border-white/15 dark:bg-white/5 dark:text-white"
              >
                <option value="open">Open</option>
                <option value="auto">AutoApply-ready</option>
                <option value="applied">Applied</option>
                <option value="all">All (incl. dismissed)</option>
              </select>
              <button
                type="button"
                disabled={busy || !profile}
                onClick={handleBatchMatch}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-cyan-500 dark:hover:bg-cyan-400"
              >
                Analyze top 5
              </button>
            </div>
          )}

          {filteredJobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 p-10 text-center text-sm text-zinc-500 dark:border-white/15 dark:text-zinc-400">
              {activeTab === "saved"
                ? "No saved jobs yet. Save jobs from the queue to review them here."
                : "No jobs in queue. Use Discover to search or add a job URL."}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  busy={busy}
                  onMatch={() => handleMatch(job.id)}
                  onApply={() => window.open(job.url, "_blank", "noopener,noreferrer")}
                  onSave={() =>
                    persistJobs(jobs.map((j) => (j.id === job.id ? { ...j, status: "saved" } : j)))
                  }
                  onDismiss={() =>
                    persistJobs(jobs.map((j) => (j.id === job.id ? { ...j, status: "dismissed" } : j)))
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
