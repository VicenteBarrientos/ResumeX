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
    <div className="px-4 py-5 sm:px-5 lg:px-6">
      <header className="mb-5 border-b border-[var(--talent-panel-border)] pb-4">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
          Candidate assessment
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500">
          Paste a resume and a job description. Get a hiring decision brief —
          concern level, next step, phone-screen questions, and a sendout-ready
          blurb. Nothing is invented beyond what the resume supports.
        </p>
      </header>

      <form onSubmit={handleAssess} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <span className="block text-sm font-medium text-zinc-800">
              Candidate resume
            </span>

            <div
              onDrop={handleDrop}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              className={`rounded-lg border border-dashed p-4 transition ${
                isDragging
                  ? "border-brand-500 bg-brand-50"
                  : "border-zinc-300 bg-zinc-50/80"
              }`}
            >
              <label className="flex cursor-pointer flex-col items-center gap-2 text-center">
                <span className="text-sm font-medium text-zinc-800">
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
                <span className="mt-1 inline-flex rounded-md border border-zinc-300 bg-white px-4 py-2 text-xs font-medium text-zinc-700 transition hover:border-brand-300 hover:text-brand-700">
                  Choose PDF
                </span>
              </label>

              {pdfFile && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
                  <span className="truncate text-emerald-900">
                    {pdfFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={clearPdf}
                    disabled={isLoading}
                    className="shrink-0 text-xs font-medium text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-200" />
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                or
              </span>
              <div className="h-px flex-1 bg-zinc-200" />
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-800">
                Paste resume text
              </span>
              <textarea
                value={resume}
                onChange={(event) => handleResumePaste(event.target.value)}
                rows={14}
                placeholder="Paste the candidate resume…"
                className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-zinc-100"
                disabled={isLoading || Boolean(pdfFile)}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-800">
              Job description
            </span>
            <textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              rows={22}
              placeholder="Paste the role you are hiring for…"
              className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
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
              className="inline-flex min-w-32 items-center justify-center rounded-md border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Try demo
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex min-w-40 items-center justify-center rounded-md bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500"
            >
              {isLoading ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-md border-2 border-white/30 border-t-white" />
                  Assessing…
                </>
              ) : (
                "Assess candidate"
              )}
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-center text-sm text-rose-700">
            {error}
          </p>
        )}
      </form>

      {result && (
        <div className="mt-10">
          <h2 className="mb-6 text-xl font-semibold text-zinc-900">
            Assessment
          </h2>
          <AssessmentCards result={result} />
        </div>
      )}
    </div>
  );
}
