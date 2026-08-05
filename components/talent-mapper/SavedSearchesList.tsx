"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  deleteTalentSearch,
  listTalentSearches,
} from "@/lib/talent-mapper/client-searches";
import type { TalentSearchSummary } from "@/lib/talent-mapper/search-store";

export default function SavedSearchesList() {
  const [searches, setSearches] = useState<TalentSearchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await listTalentSearches();
        if (!cancelled) setSearches(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load searches.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(id: string, roleTitle: string) {
    if (!window.confirm(`Delete saved search “${roleTitle}”?`)) {
      return;
    }
    setBusyId(id);
    try {
      await deleteTalentSearch(id);
      setSearches((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            ResumeX Talent
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            Saved searches
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Searches, shortlists, and notes live on the server so you can leave and
            come back from another machine.
          </p>
        </div>
        <Link
          href="/talent/mapper"
          className="inline-flex items-center rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 dark:bg-emerald-500 dark:text-[#04150f]"
        >
          New search
        </Link>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading saved searches…</p>
      ) : searches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/70 px-6 py-12 text-center dark:border-white/15 dark:bg-white/[0.03]">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No saved searches yet. Run Talent Mapper and save a search, or import
            the browser draft when prompted.
          </p>
          <Link
            href="/talent/mapper"
            className="mt-4 inline-flex text-sm font-semibold text-emerald-700 dark:text-emerald-300"
          >
            Open Talent Mapper →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {searches.map((search) => (
            <li
              key={search.id}
              className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/[0.03]"
            >
              <div className="min-w-0">
                <Link
                  href={`/talent/mapper?searchId=${search.id}`}
                  className="text-base font-semibold text-zinc-900 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300"
                >
                  {search.roleTitle || "Untitled search"}
                </Link>
                <p className="mt-1 text-xs text-zinc-500">
                  {search.mode === "live" ? "Live OpenAlex" : "Demo"} ·{" "}
                  {search.candidateCount} candidates · {search.shortlistedCount}{" "}
                  shortlisted · updated{" "}
                  {new Date(search.updatedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/talent/mapper?searchId=${search.id}`}
                  className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-emerald-400 hover:text-emerald-700 dark:border-white/15 dark:text-zinc-200"
                >
                  Open
                </Link>
                <button
                  type="button"
                  disabled={busyId === search.id}
                  onClick={() => void handleDelete(search.id, search.roleTitle)}
                  className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-400/30 dark:text-rose-200 dark:hover:bg-rose-400/10"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
