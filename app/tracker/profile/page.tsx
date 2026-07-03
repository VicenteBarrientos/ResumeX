"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Profile = {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  resumeText?: string;
};

type Answer = {
  id: string;
  question: string;
  answer: string;
};

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile>({});
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");
  const [addingAnswer, setAddingAnswer] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQ, setEditQ] = useState("");
  const [editA, setEditA] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchAll = useCallback(async () => {
    const [pRes, aRes] = await Promise.all([
      fetch("/api/profile"),
      fetch("/api/answers"),
    ]);
    const [p, a] = await Promise.all([pRes.json(), aRes.json()]);
    setProfile(p ?? {});
    if (p?.resumeText) setResumeUploaded(true);
    setAnswers(Array.isArray(a) ? a : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "authenticated") queueMicrotask(fetchAll);
  }, [status, fetchAll]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function uploadPdf(file: File) {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) { setPdfError("Only PDF files are supported."); return; }
    if (file.size > 5 * 1024 * 1024) { setPdfError("PDF must be 5 MB or smaller."); return; }
    setPdfError(null);
    setUploadingPdf(true);
    try {
      const form = new FormData();
      form.append("resumePdf", file);
      const res = await fetch("/api/profile/resume", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { setPdfError(data.error ?? "Upload failed."); }
      else {
        setResumeUploaded(true);
        setProfile((p) => ({
          ...p,
          ...(data.resumeText ? { resumeText: data.resumeText } : {}),
          ...(data.contact?.fullName ? { fullName: data.contact.fullName } : {}),
          ...(data.contact?.email ? { email: data.contact.email } : {}),
          ...(data.contact?.phone ? { phone: data.contact.phone } : {}),
          ...(data.contact?.location ? { location: data.contact.location } : {}),
          ...(data.contact?.linkedinUrl ? { linkedinUrl: data.contact.linkedinUrl } : {}),
        }));
      }
    } catch {
      setPdfError("Upload failed — please try again.");
    } finally {
      setUploadingPdf(false);
    }
  }

  async function deletePdf() {
    await fetch("/api/profile/resume", { method: "DELETE" });
    setResumeUploaded(false);
    setProfile((p) => ({ ...p, resumeText: undefined }));
  }

  async function addAnswer() {
    if (!newQ.trim() || !newA.trim()) return;
    setAddingAnswer(true);
    const res = await fetch("/api/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: newQ, answer: newA }),
    });
    const created = await res.json();
    setAnswers((prev) => [...prev, created]);
    setNewQ("");
    setNewA("");
    setAddingAnswer(false);
  }

  async function deleteAnswer(id: string) {
    await fetch(`/api/answers/${id}`, { method: "DELETE" });
    setAnswers((prev) => prev.filter((a) => a.id !== id));
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/answers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: editQ, answer: editA }),
    });
    const updated = await res.json();
    setAnswers((prev) => prev.map((a) => (a.id === id ? updated : a)));
    setEditingId(null);
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600 dark:border-white/10 dark:border-t-cyan-400" />
      </div>
    );
  }

  if (!session) return null;

  const inputClass =
    "w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-cyan-300">
            ResumeX Tracker
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            My Profile
          </h1>
        </div>
        <Link
          href="/tracker"
          className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700 dark:border-white/15 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-cyan-400/40 dark:hover:text-cyan-200"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Profile Form */}
      <form onSubmit={saveProfile} className="mb-10 space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Personal Info</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Full Name</span>
            <input
              type="text"
              value={profile.fullName ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
              placeholder="Vicente Barrientos"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</span>
            <input
              type="email"
              value={profile.email ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
              placeholder="you@email.com"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Phone</span>
            <input
              type="text"
              value={profile.phone ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+1 555 000 0000"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Location</span>
            <input
              type="text"
              value={profile.location ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))}
              placeholder="Santiago, Chile"
              className={inputClass}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">LinkedIn URL</span>
          <input
            type="url"
            value={profile.linkedinUrl ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, linkedinUrl: e.target.value }))}
            placeholder="https://linkedin.com/in/yourname"
            className={inputClass}
          />
        </label>

        {/* PDF upload */}
        <div>
          <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Resume PDF</span>
          {resumeUploaded ? (
            <div className="flex items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-cyan-400/30 dark:bg-cyan-400/10">
              <svg className="h-5 w-5 shrink-0 text-indigo-600 dark:text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="flex-1 text-sm font-medium text-indigo-700 dark:text-cyan-200">Resume uploaded — text extracted</span>
              <button type="button" onClick={deletePdf} className="shrink-0 text-xs text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400">Remove</button>
            </div>
          ) : (
            <div
              onClick={() => !uploadingPdf && pdfInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); if (!uploadingPdf) setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) uploadPdf(f);
              }}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center transition ${
                uploadingPdf
                  ? "cursor-default border-zinc-200 bg-zinc-50/60 dark:border-white/5"
                  : dragOver
                  ? "border-indigo-500 bg-indigo-50 dark:border-cyan-400 dark:bg-cyan-400/10"
                  : "border-zinc-300 bg-zinc-50/80 hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-cyan-400/40"
              }`}
            >
              {uploadingPdf ? (
                <>
                  <span className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600 dark:border-white/20 dark:border-t-cyan-400" />
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Uploading…</p>
                </>
              ) : (
                <>
                  <svg className="mb-2 h-6 w-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    {dragOver ? "Drop to upload" : "Click or drag your resume PDF here"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">PDF · max 5 MB · text is auto-extracted</p>
                </>
              )}
            </div>
          )}
          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPdf(f); }}
          />
          {pdfError && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{pdfError}</p>}
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Resume Text</span>
          <textarea
            value={profile.resumeText ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, resumeText: e.target.value }))}
            rows={10}
            placeholder="Paste your resume text here — used by AutoApply to fill applications automatically."
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60 dark:bg-gradient-to-r dark:from-cyan-400 dark:to-blue-500 dark:text-[#050816] dark:hover:opacity-90"
          >
            {saving ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Saving…
              </>
            ) : (
              "Save Profile"
            )}
          </button>
          {saved && (
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              ✓ Saved
            </span>
          )}
        </div>
      </form>

      {/* Answers */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-white">Saved Answers</h2>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Common application questions and your answers — AutoApply uses these to fill forms automatically.
        </p>

        <div className="space-y-4">
          {answers.map((ans) =>
            editingId === ans.id ? (
              <div key={ans.id} className="space-y-2 rounded-2xl border border-indigo-300 bg-indigo-50/50 p-4 dark:border-cyan-400/30 dark:bg-cyan-400/5">
                <input
                  value={editQ}
                  onChange={(e) => setEditQ(e.target.value)}
                  className={inputClass}
                  placeholder="Question"
                />
                <textarea
                  value={editA}
                  onChange={(e) => setEditA(e.target.value)}
                  rows={3}
                  className={`${inputClass} resize-y`}
                  placeholder="Answer"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(ans.id)}
                    className="rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 dark:bg-cyan-400 dark:text-[#050816]"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-400 dark:border-white/15 dark:text-zinc-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div key={ans.id} className="rounded-2xl border border-zinc-200 p-4 dark:border-white/10">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{ans.question}</p>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => { setEditingId(ans.id); setEditQ(ans.question); setEditA(ans.answer); }}
                      className="text-xs text-zinc-400 hover:text-indigo-600 dark:hover:text-cyan-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteAnswer(ans.id)}
                      className="text-xs text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">{ans.answer}</p>
              </div>
            )
          )}
        </div>

        {/* Add new answer */}
        <div className="mt-6 space-y-2 rounded-2xl border border-dashed border-zinc-300 p-4 dark:border-white/10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Add New Answer</p>
          <input
            value={newQ}
            onChange={(e) => setNewQ(e.target.value)}
            placeholder="Question (e.g. Why do you want this role?)"
            className={inputClass}
          />
          <textarea
            value={newA}
            onChange={(e) => setNewA(e.target.value)}
            rows={3}
            placeholder="Your answer…"
            className={`${inputClass} resize-y`}
          />
          <button
            onClick={addAnswer}
            disabled={addingAnswer || !newQ.trim() || !newA.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50 dark:bg-gradient-to-r dark:from-cyan-400 dark:to-blue-500 dark:text-[#050816]"
          >
            {addingAnswer ? "Adding…" : "+ Add Answer"}
          </button>
        </div>
      </div>
    </div>
  );
}
