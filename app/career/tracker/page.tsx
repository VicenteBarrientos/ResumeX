"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Application = {
  id: string;
  company: string;
  role: string;
  jobUrl: string | null;
  status: string;
  matchScore: number | null;
  notes: string | null;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  Applied: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
  Interview: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  Offer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  Rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  Saved: "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-400",
};

const SCORE_COLOR = (s: number) =>
  s >= 70 ? "bg-emerald-500" : s >= 40 ? "bg-amber-400" : "bg-rose-500";

export default function TrackerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [apps, setApps] = useState<Application[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/tracker")
      .then((r) => r.json())
      .then((data) => setApps(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [status]);

  function exportCSV() {
    const header = ["Company", "Role", "Status", "Match Score", "Job URL", "Notes", "Date Added"];
    const rows = apps.map((a) => [
      a.company, a.role, a.status,
      a.matchScore ?? "",
      a.jobUrl ?? "",
      (a.notes ?? "").replace(/\n/g, " "),
      new Date(a.createdAt).toLocaleDateString(),
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resumex-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600 dark:border-white/10 dark:border-t-cyan-400" />
      </div>
    );
  }

  if (!session) return null;

  const filtered = apps.filter((a) => {
    const q = filter.toLowerCase();
    return (
      a.company.toLowerCase().includes(q) ||
      a.role.toLowerCase().includes(q) ||
      a.status.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: apps.length,
    applied: apps.filter((a) => a.status === "Applied").length,
    interview: apps.filter((a) => a.status === "Interview").length,
    offer: apps.filter((a) => a.status === "Offer").length,
    rejected: apps.filter((a) => a.status === "Rejected").length,
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-cyan-300">
            ResumeX Tracker
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            My Applications
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-zinc-500 sm:block">
            {session.user?.name}
          </span>
          <Link
            href="/career/tracker/profile"
            className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700 dark:border-white/15 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-cyan-400/40 dark:hover:text-cyan-200"
          >
            My Profile
          </Link>
          {apps.length > 0 && (
            <button
              onClick={exportCSV}
              className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700 dark:border-white/15 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-cyan-400/40 dark:hover:text-cyan-200"
            >
              Export CSV
            </button>
          )}
          <Link
            href="/career/tracker/add"
            className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 dark:bg-gradient-to-r dark:from-cyan-400 dark:to-blue-500 dark:text-[#050816] dark:hover:opacity-90"
          >
            + Add Job
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 shadow-sm transition hover:border-rose-300 hover:text-rose-600 dark:border-white/15 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-rose-400/40 dark:hover:text-rose-400"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Stats + Funnel */}
      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 lg:col-span-2 sm:grid-cols-4 lg:grid-cols-4">
          {[
            { label: "Total", value: stats.total, color: "text-zinc-900 dark:text-white" },
            { label: "Applied", value: stats.applied, color: "text-indigo-600 dark:text-indigo-400" },
            { label: "Interview", value: stats.interview, color: "text-amber-600 dark:text-amber-400" },
            { label: "Offer", value: stats.offer, color: "text-emerald-600 dark:text-emerald-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Funnel chart */}
        {stats.total > 0 && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Pipeline</p>
            <div className="space-y-2">
              {[
                { label: "Applied", value: stats.applied, bar: "bg-indigo-500 dark:bg-indigo-400" },
                { label: "Interview", value: stats.interview, bar: "bg-amber-400" },
                { label: "Offer", value: stats.offer, bar: "bg-emerald-500" },
                { label: "Rejected", value: stats.rejected, bar: "bg-rose-400" },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-xs text-zinc-500">{row.label}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10" style={{ height: 8 }}>
                    <div
                      className={`h-full rounded-full transition-all ${row.bar}`}
                      style={{ width: stats.total ? `${Math.round((row.value / stats.total) * 100)}%` : "0%" }}
                    />
                  </div>
                  <span className="w-5 shrink-0 text-right text-xs font-medium text-zinc-600 dark:text-zinc-400">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {apps.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 py-20 dark:border-white/10">
          <p className="mb-4 text-lg text-zinc-500">No applications yet.</p>
          <Link
            href="/career/tracker/add"
            className="rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 dark:bg-gradient-to-r dark:from-cyan-400 dark:to-blue-500 dark:text-[#050816]"
          >
            Add your first job
          </Link>
        </div>
      ) : (
        <>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by company, role, or status…"
            className="mb-4 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20"
          />

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-white/10 dark:bg-white/[0.02]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-white/[0.03]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Match</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                {filtered.map((app) => (
                  <tr key={app.id} className="transition hover:bg-zinc-50 dark:hover:bg-white/[0.03]">
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">
                      {app.company}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{app.role}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[app.status] ?? STATUS_COLORS.Saved}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {app.matchScore != null ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
                            <div
                              className={`h-full rounded-full ${SCORE_COLOR(app.matchScore)}`}
                              style={{ width: `${app.matchScore}%` }}
                            />
                          </div>
                          <span className="text-xs text-zinc-500">{app.matchScore}%</span>
                        </div>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/career/tracker/${app.id}`}
                        className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 transition hover:border-indigo-300 hover:text-indigo-700 dark:border-white/15 dark:text-zinc-400 dark:hover:border-cyan-400/40 dark:hover:text-cyan-300"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="py-10 text-center text-sm text-zinc-400">No results for &quot;{filter}&quot;</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
