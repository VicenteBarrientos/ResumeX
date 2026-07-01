"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
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

const STATUSES = ["Applied", "Interview", "Offer", "Rejected", "Saved"];

const inputClass =
  "w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20";

export default function DetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [app, setApp] = useState<Application | null>(null);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [appStatus, setAppStatus] = useState("Applied");
  const [matchScore, setMatchScore] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!id || status !== "authenticated") return;
    fetch(`/api/tracker/${id}`)
      .then((r) => {
        if (!r.ok) { router.push("/tracker"); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setApp(data);
        setCompany(data.company);
        setRole(data.role);
        setJobUrl(data.jobUrl ?? "");
        setAppStatus(data.status);
        setMatchScore(data.matchScore != null ? String(data.matchScore) : "");
        setNotes(data.notes ?? "");
      });
  }, [id, status, router]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const res = await fetch(`/api/tracker/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company, role,
        jobUrl: jobUrl || null,
        status: appStatus,
        matchScore: matchScore ? Number(matchScore) : null,
        notes: notes || null,
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Something went wrong.");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this application?")) return;
    setDeleting(true);
    await fetch(`/api/tracker/${id}`, { method: "DELETE" });
    router.push("/tracker");
  }

  if (!app) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600 dark:border-white/10 dark:border-t-cyan-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <Link
          href="/tracker"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-900 dark:hover:text-white"
        >
          ← Back to dashboard
        </Link>
        <p className="mb-1 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-cyan-300">
          ResumeX Tracker
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          {app.role}{" "}
          <span className="font-normal text-zinc-500">at</span>{" "}
          {app.company}
        </h1>
        <p className="mt-1 text-xs text-zinc-400">
          Added {new Date(app.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <form onSubmit={handleUpdate} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200">Company</label>
              <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200">Role</label>
              <input type="text" value={role} onChange={(e) => setRole(e.target.value)} className={inputClass} required />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200">Job URL</label>
            <input type="url" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} placeholder="https://…" className={inputClass} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200">Status</label>
              <select value={appStatus} onChange={(e) => setAppStatus(e.target.value)} className={inputClass}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200">Match Score (0–100)</label>
              <input type="number" min={0} max={100} value={matchScore} onChange={(e) => setMatchScore(e.target.value)} placeholder="e.g. 78" className={inputClass} />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className={`${inputClass} resize-y`} />
          </div>

          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50 dark:bg-gradient-to-r dark:from-cyan-400 dark:to-blue-500 dark:text-[#050816] dark:hover:opacity-90"
            >
              {saving ? "Saving…" : saved ? "Saved ✓" : "Update"}
            </button>
            {app.jobUrl && (
              <a
                href={app.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-zinc-200 px-6 py-2.5 text-sm font-medium text-zinc-600 transition hover:border-indigo-300 hover:text-indigo-700 dark:border-white/15 dark:text-zinc-400 dark:hover:border-cyan-400/40 dark:hover:text-cyan-300"
              >
                View Job Post ↗
              </a>
            )}
          </div>
        </form>
      </div>

      {/* Danger zone */}
      <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-500/20 dark:bg-rose-500/5">
        <p className="mb-1 text-sm font-semibold text-rose-700 dark:text-rose-400">Danger Zone</p>
        <p className="mb-4 text-xs text-rose-600/80 dark:text-rose-400/70">
          This will permanently delete this application.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-full border border-rose-300 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10"
        >
          {deleting ? "Deleting…" : "Delete Application"}
        </button>
      </div>
    </div>
  );
}
