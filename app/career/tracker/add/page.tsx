"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

const STATUSES = ["Applied", "Interview", "Offer", "Rejected", "Saved"];

const inputClass =
  "w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

function AddForm() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [company, setCompany] = useState(searchParams.get("company") ?? "");
  const [role, setRole] = useState(searchParams.get("role") ?? "");
  const [jobUrl, setJobUrl] = useState("");
  const [appStatus, setAppStatus] = useState("Applied");
  const [matchScore, setMatchScore] = useState(searchParams.get("score") ?? "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!company.trim() || !role.trim()) {
      setError("Company and role are required.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/tracker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company,
        role,
        jobUrl: jobUrl || null,
        status: appStatus,
        matchScore: matchScore ? Number(matchScore) : null,
        notes: notes || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    router.push("/career/tracker");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <Link
          href="/career/tracker"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-900"
        >
          ← Back to dashboard
        </Link>
        <p className="mb-1 text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
          ResumeX Tracker
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          Add Application
        </h1>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-800">
                Company <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={inputClass}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-800">
                Role / Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-800">
              Job URL
            </label>
            <input
              type="url"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://…"
              className={inputClass}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-800">
                Status
              </label>
              <select
                value={appStatus}
                onChange={(e) => setAppStatus(e.target.value)}
                className={inputClass}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-800">
                ResumeX Match Score (0–100)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={matchScore}
                onChange={(e) => setMatchScore(e.target.value)}
                placeholder="e.g. 78"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-800">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Recruiter contact, interview prep, next steps…"
              className={`${inputClass} resize-y`}
            />
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save Application"}
            </button>
            <Link
              href="/career/tracker"
              className="rounded-full border border-zinc-200 px-6 py-2.5 text-sm font-medium text-zinc-600 transition hover:border-zinc-300"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AddPage() {
  return (
    <Suspense>
      <AddForm />
    </Suspense>
  );
}
