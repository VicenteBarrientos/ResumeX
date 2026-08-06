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
    <div className="px-4 py-5 sm:px-5 lg:px-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--talent-panel-border)] pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            Saved searches
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Searches, shortlists, and notes live on the server so you can leave and
            come back from another machine.
          </p>
        </div>
        <Link
          href="/talent/mapper"
          className="inline-flex items-center rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-500"
        >
          New search
        </Link>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading saved searches…</p>
      ) : searches.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
          <p className="text-sm text-zinc-600">
            No saved searches yet. Run Talent Mapper and save a search, or import
            the browser draft when prompted.
          </p>
          <Link
            href="/talent/mapper"
            className="mt-4 inline-flex text-sm font-semibold text-brand-700"
          >
            Open Talent Mapper →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--talent-panel-border)] bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--talent-panel-border)] bg-zinc-50 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-3 py-2.5">Role</th>
                  <th className="hidden px-3 py-2.5 sm:table-cell">Mode</th>
                  <th className="px-3 py-2.5 text-right">Candidates</th>
                  <th className="hidden px-3 py-2.5 text-right md:table-cell">
                    Shortlisted
                  </th>
                  <th className="hidden px-3 py-2.5 lg:table-cell">Updated</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {searches.map((search) => (
                  <tr
                    key={search.id}
                    className="border-b border-zinc-100 text-sm last:border-0 hover:bg-brand-50/40"
                  >
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/talent/mapper?searchId=${search.id}`}
                        className="font-semibold text-zinc-900 hover:text-brand-700"
                      >
                        {search.roleTitle || "Untitled search"}
                      </Link>
                    </td>
                    <td className="hidden px-3 py-2.5 text-xs text-zinc-500 sm:table-cell">
                      {search.mode === "live" ? "Live" : "Demo"}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-zinc-700">
                      {search.candidateCount}
                    </td>
                    <td className="hidden px-3 py-2.5 text-right tabular-nums text-zinc-700 md:table-cell">
                      {search.shortlistedCount}
                    </td>
                    <td className="hidden px-3 py-2.5 text-xs text-zinc-500 lg:table-cell">
                      {new Date(search.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/talent/mapper?searchId=${search.id}`}
                          className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:border-brand-300 hover:text-brand-700"
                        >
                          Open
                        </Link>
                        <button
                          type="button"
                          disabled={busyId === search.id}
                          onClick={() =>
                            void handleDelete(search.id, search.roleTitle)
                          }
                          className="rounded-md border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
