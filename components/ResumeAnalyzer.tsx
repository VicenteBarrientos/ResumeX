"use client";

import { useRef, useState } from "react";
import type { AnalysisResult, AnalyzeResponse } from "@/lib/types";
import { MAX_PDF_SIZE_BYTES, MAX_PDF_SIZE_LABEL } from "@/lib/constants";
import ResultCards from "@/components/ResultCards";

export default function ResumeAnalyzer() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resume, setResume] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  function validateAndSetPdf(file: File) {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setError("Only PDF files are supported for resume upload.");
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

  async function handleAnalyze(event: React.FormEvent<HTMLFormElement>) {
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

        response = await fetch("/api/analyze", {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume, jobDescription }),
        });
      }

      const data: AnalyzeResponse = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      if (!data.result) {
        setError("No analysis was returned. Please try again.");
        return;
      }

      setResult(data.result);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const hasResume = Boolean(pdfFile) || resume.trim().length > 0;
  const canSubmit = hasResume && jobDescription.trim().length > 0 && !isLoading;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-10 text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
          AI Resume Coach
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
          ResumeX
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
          Upload a PDF or paste your resume, then add a target job description. Get an instant
          match score, keyword gaps, and actionable suggestions — processed securely on the server.
        </p>
      </header>

      <form onSubmit={handleAnalyze} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Your resume
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
                  ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/40"
                  : "border-zinc-300 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-900/40"
              }`}
            >
              <label className="flex cursor-pointer flex-col items-center gap-2 text-center">
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Drag & drop your PDF resume
                </span>
                <span className="text-xs text-zinc-500">
                  or click to browse — PDF only, up to {MAX_PDF_SIZE_LABEL}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handlePdfChange}
                  disabled={isLoading}
                  className="sr-only"
                />
                <span className="mt-1 inline-flex rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-medium text-zinc-700 transition hover:border-indigo-400 hover:text-indigo-700 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-indigo-500 dark:hover:text-indigo-300">
                  Choose PDF file
                </span>
              </label>

              {pdfFile && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm dark:border-indigo-900 dark:bg-indigo-950/40">
                  <span className="truncate text-indigo-900 dark:text-indigo-100">
                    {pdfFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={clearPdf}
                    disabled={isLoading}
                    className="shrink-0 text-xs font-medium text-indigo-700 hover:text-indigo-900 disabled:opacity-50 dark:text-indigo-300 dark:hover:text-indigo-100"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">or</span>
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Paste resume text
              </span>
              <textarea
                value={resume}
                onChange={(event) => handleResumePaste(event.target.value)}
                rows={12}
                placeholder="Paste your resume text here..."
                className="w-full resize-y rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:disabled:bg-zinc-900"
                disabled={isLoading || Boolean(pdfFile)}
              />
              {pdfFile && (
                <p className="mt-2 text-xs text-zinc-500">
                  Remove the PDF to paste resume text instead.
                </p>
              )}
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Job description
            </span>
            <textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              rows={24}
              placeholder="Paste the job posting here..."
              className="w-full resize-y rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              disabled={isLoading}
            />
          </label>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-xs text-zinc-500">
            PDFs are parsed on the server. Your API key never reaches the browser.
          </p>
          <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:items-end">
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex min-w-40 items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
            >
              {isLoading ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Analyzing...
                </>
              ) : (
                "Analyze match"
              )}
            </button>
            {error && (
              <p
                role="alert"
                className="max-w-md text-center text-sm text-rose-700 dark:text-rose-300 sm:text-right"
              >
                {error}
              </p>
            )}
          </div>
        </div>
      </form>

      {result && (
        <div className="mt-10">
          <h2 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Analysis results
          </h2>
          <ResultCards result={result} />
        </div>
      )}
    </div>
  );
}