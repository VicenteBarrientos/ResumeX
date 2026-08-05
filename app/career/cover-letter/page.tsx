"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

export default function CoverLetterPage() {
  const { data: session } = useSession();
  const [jobDescription, setJobDescription] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [letter, setLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const letterRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const debounce = setTimeout(async () => {
      if (jobDescription.length < 100 || (company && role)) return;
      try {
        const res = await fetch("/api/extract-job", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobDescription }),
        });
        const data = await res.json();
        if (data.company && !company) setCompany(data.company);
        if (data.role && !role) setRole(data.role);
      } catch { /* ignore */ }
    }, 800);
    return () => clearTimeout(debounce);
  }, [jobDescription, company, role]);

  async function generate() {
    if (!jobDescription.trim()) return;
    setLoading(true);
    setError("");
    setLetter("");
    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, company, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setLetter(data.letter);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!letter) return;
    await navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const inputClass =
    "w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Cover Letter Generator</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {session
            ? "AI will use your saved profile to write a tailored cover letter."
            : "Paste the job description and get an AI-written cover letter."}
        </p>
        {!session && (
          <p className="mt-1 text-xs text-zinc-400">
            <a href="/login" className="text-brand-500 hover:underline">Sign in</a> to personalize with your profile and resume.
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input panel */}
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-800">
              Job Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={12}
              placeholder="Paste the full job description here…"
              className={`${inputClass} resize-none`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-800">Company</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Auto-detected…"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-800">Role</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Auto-detected…"
                className={inputClass}
              />
            </div>
          </div>
          <button
            onClick={generate}
            disabled={loading || !jobDescription.trim()}
            className="w-full rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Writing cover letter…
              </span>
            ) : "Generate cover letter"}
          </button>
          {error && (
            <p className="text-sm text-rose-600">{error}</p>
          )}
        </div>

        {/* Output panel */}
        <div className="flex flex-col">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-800">
              Your cover letter
            </label>
            {letter && (
              <button
                onClick={copy}
                className="rounded-full border border-zinc-300 bg-white px-4 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-brand-400 hover:text-brand-700"
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
            )}
          </div>
          <textarea
            ref={letterRef}
            value={letter}
            onChange={(e) => setLetter(e.target.value)}
            rows={18}
            placeholder={loading ? "Writing your cover letter…" : "Your generated cover letter will appear here. You can edit it before copying."}
            className={`${inputClass} flex-1 resize-none`}
            readOnly={loading}
          />
          {letter && (
            <p className="mt-2 text-xs text-zinc-400">
              Feel free to edit the letter above before copying.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
