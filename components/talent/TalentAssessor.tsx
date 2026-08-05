"use client";

import { useRef, useState } from "react";
import AssessmentCards from "@/components/talent/AssessmentCards";
import { MAX_PDF_SIZE_BYTES, MAX_PDF_SIZE_LABEL } from "@/lib/constants";
import { DEMO_JOB_DESCRIPTION, DEMO_RESUME } from "@/lib/demo-data";
import type { AssessResponse, TalentAssessment } from "@/lib/types";

export default function TalentAssessor() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resume, setResume] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState<TalentAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  function validateAndSetPdf(file: File) {
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setError("Only PDF files are supported.");
      setPdfFile(null);
      return;
    }

    if (file.size > MAX_PDF_SIZE_BYTES) {
      setError(`PDF must be ${MAX_PDF_SIZE_LABEL} or smaller.`);
      setPdfFile(null);
      return;
    }

    setError(null);
    setPdfFile(file);
    setResume("");
  }

  function handlePdfChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    validateAndSetPdf(file);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (isLoading) return;

    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    validateAndSetPdf(file);
  }

  function clearPdf() {
    setPdfFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleResumePaste(value: string) {
    setResume(value);
    if (value.trim()) {
      clearPdf();
    }
  }

  function handleTryDemo() {
    clearPdf();
    setResume(DEMO_RESUME);
    setJobDescription(DEMO_JOB_DESCRIPTION);
    setError(null);
    setResult(null);
  }

  async function handleAssess(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setIsLoading(true);

    try {
      let response: Response;

      if (pdfFile) {
        const formData = new FormData();
        formData.append("resumePdf", pdfFile);
        formData.append("jobDescription", jobDescription);
        response = await fetch("/api/talent-assess", {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch("/api/talent-assess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume, jobDescription }),
        });
      }

      const data: AssessResponse = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Assessment failed. Please try again.");
        return;
      }

      if (!data.result) {
        setError("No assessment was returned. Please try again.");
        return;
      }

      setResult(data.result);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const hasResume = Boolean(pdfFile) || resume.trim().length > 0;
  const canSubmit = hasResume && jobDescription.trim().length > 0 && !isLoading;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-10 text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
          ResumeX Talent
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl dark:text-white">
          Candidate assessment
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Paste a resume and a job description. Get a hiring decision brief —
          concern level, next step, phone-screen questions, and a sendout-ready
          blurb. Nothing is invented beyond what the resume supports.
        </p>
      </header>

      <form onSubmit={handleAssess} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Candidate resume
            </span>

            <div
              onDrop={handleDrop}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              className={`rounded-2xl border border-dashed p-4 transition ${
                isDragging
                  ? "border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-400/10"
                  : "border-zinc-300 bg-zinc-50/80 dark:border-white/10 dark:bg-white/[0.03]"
              }`}
            >
              <label className="flex cursor-pointer flex-col items-center gap-2 text-center">
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Drop a PDF resume here
                </span>
                <span className="text-xs text-zinc-500">
                  or browse — max {MAX_PDF_SIZE_LABEL}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handlePdfChange}
                  disabled={isLoading}
                  className="sr-only"
                />
                <span className="mt-1 inline-flex rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-medium text-zinc-700 transition hover:border-emerald-400 hover:text-emerald-700 dark:border-white/15 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-emerald-400/40 dark:hover:text-emerald-200">
                  Choose PDF
                </span>
              </label>

              {pdfFile && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-400/30 dark:bg-emerald-400/10">
                  <span className="truncate text-emerald-900 dark:text-emerald-100">
                    {pdfFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={clearPdf}
                    disabled={isLoading}
                    className="shrink-0 text-xs font-medium text-emerald-700 hover:text-emerald-900 disabled:opacity-50 dark:text-emerald-200"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-200 dark:bg-white/10" />
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                or
              </span>
              <div className="h-px flex-1 bg-zinc-200 dark:bg-white/10" />
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Paste resume text
              </span>
              <textarea
                value={resume}
                onChange={(event) => handleResumePaste(event.target.value)}
                rows={14}
                placeholder="Paste the candidate resume…"
                className="w-full resize-y rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-zinc-100 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20 dark:disabled:bg-white/[0.02]"
                disabled={isLoading || Boolean(pdfFile)}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Job description
            </span>
            <textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              rows={22}
              placeholder="Paste the role you are hiring for…"
              className="w-full resize-y rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20"
              disabled={isLoading}
            />
          </label>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-xs text-zinc-500">
            Evidence is taken from the resume only. Gaps stay labeled as unknown.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
            <button
              type="button"
              onClick={handleTryDemo}
              disabled={isLoading}
              className="inline-flex min-w-32 items-center justify-center rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-emerald-400 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-emerald-400/40 dark:hover:text-emerald-200"
            >
              Try demo
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex min-w-40 items-center justify-center rounded-full bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:bg-emerald-500 dark:text-[#04150f] dark:hover:bg-emerald-400 dark:disabled:bg-white/10 dark:disabled:text-zinc-500"
            >
              {isLoading ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-[#04150f]/30 dark:border-t-[#04150f]" />
                  Assessing…
                </>
              ) : (
                "Assess candidate"
              )}
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-center text-sm text-rose-700 dark:text-rose-300">
            {error}
          </p>
        )}
      </form>

      {result && (
        <div className="mt-10">
          <h2 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-white">
            Assessment
          </h2>
          <AssessmentCards result={result} />
        </div>
      )}
    </div>
  );
}
