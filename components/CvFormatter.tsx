"use client";

import { useRef, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import ResumePreview from "@/components/ResumePreview";
import { MAX_PDF_SIZE_BYTES, MAX_PDF_SIZE_LABEL } from "@/lib/constants";
import { DEMO_RESUME } from "@/lib/demo-data";
import { generateResumeDocx } from "@/lib/generate-resume-docx";
import { generateResumePdf } from "@/lib/generate-resume-pdf";
import { formatMessage } from "@/lib/i18n/resumex";
import type { FormattedResume, FormatResponse } from "@/lib/types";

const DEV = process.env.NODE_ENV === "development";

interface ExtractionDebugInfo {
  rawExtracted: string;
  cleanedExtracted: string;
  wasCorrupted: boolean;
  charSpacingFixed: boolean;
  openAiInput: string;
}

function DebugPanel({ info }: { info: ExtractionDebugInfo }) {
  const [tab, setTab] = useState<"raw" | "cleaned" | "ai">("raw");

  const tabs: Array<{ id: "raw" | "cleaned" | "ai"; label: string; badge?: string }> = [
    {
      id: "raw",
      label: "Raw extracted",
      badge: info.wasCorrupted ? "CORRUPTED" : undefined,
    },
    {
      id: "cleaned",
      label: "Cleaned",
      badge: info.charSpacingFixed ? "FIXED" : undefined,
    },
    { id: "ai", label: "OpenAI input" },
  ];

  const content =
    tab === "raw"
      ? info.rawExtracted
      : tab === "cleaned"
        ? info.cleanedExtracted
        : info.openAiInput;

  return (
    <div className="mt-10 rounded-2xl border border-amber-300 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-400/5">
      <div className="flex items-center justify-between border-b border-amber-200 px-4 py-2 dark:border-amber-400/20">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
          Dev · Extraction Debug
        </span>
        <div className="flex gap-2 text-xs text-amber-700 dark:text-amber-300">
          <span>Raw: {info.rawExtracted.length} chars</span>
          <span>·</span>
          <span>Cleaned: {info.cleanedExtracted.length} chars</span>
          {info.charSpacingFixed && (
            <>
              <span>·</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                ⚠ character-spacing corruption detected &amp; fixed
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex gap-1 border-b border-amber-200 px-4 pt-2 dark:border-amber-400/20">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px rounded-t border-b-2 px-3 py-1 text-xs font-medium transition ${
              tab === t.id
                ? "border-amber-500 text-amber-800 dark:border-amber-300 dark:text-amber-200"
                : "border-transparent text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
            }`}
          >
            {t.label}
            {t.badge && (
              <span className="ml-1.5 rounded bg-rose-100 px-1 text-[10px] font-bold uppercase text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all px-4 py-3 text-[11px] leading-relaxed text-amber-900 dark:text-amber-100">
        {content || "(empty)"}
      </pre>
    </div>
  );
}

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".doc"];

export default function CvFormatter() {
  const { t } = useLocale();
  const f = t.formatter;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resumeText, setResumeText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [resume, setResume] = useState<FormattedResume | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [debugInfo, setDebugInfo] = useState<ExtractionDebugInfo | null>(null);

  function validateAndSetFile(selected: File) {
    const name = selected.name.toLowerCase();
    const isAccepted = ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));

    if (!isAccepted) {
      setError(f.errors.fileType);
      setFile(null);
      return;
    }

    if (selected.size > MAX_PDF_SIZE_BYTES) {
      setError(formatMessage(f.errors.fileSize, { size: MAX_PDF_SIZE_LABEL }));
      setFile(null);
      return;
    }

    setError(null);
    setFile(selected);
    setResumeText("");
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    if (!selected) return;
    validateAndSetFile(selected);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (isLoading) return;
    const dropped = event.dataTransfer.files?.[0];
    if (!dropped) return;
    validateAndSetFile(dropped);
  }

  function clearFile() {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handlePaste(value: string) {
    setResumeText(value);
    if (value.trim()) {
      clearFile();
    }
  }

  function handleTryDemo() {
    clearFile();
    setResumeText(DEMO_RESUME);
    setError(null);
  }

  async function handleFormat(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResume(null);
    setDebugInfo(null);
    setIsLoading(true);

    try {
      let response: Response;
      const debugQs = DEV ? "?debug=1" : "";

      if (file) {
        const formData = new FormData();
        formData.append("resumeFile", file);
        response = await fetch(`/api/format${debugQs}`, { method: "POST", body: formData });
      } else {
        response = await fetch(`/api/format${debugQs}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume: resumeText }),
        });
      }

      const data: FormatResponse & { debug?: ExtractionDebugInfo } = await response.json();

      if (!response.ok) {
        setError(data.error ?? t.errors.generic);
        return;
      }

      if (!data.result) {
        setError(f.errors.noResult);
        return;
      }

      setResume(data.result);
      if (DEV && data.debug) {
        setDebugInfo(data.debug);
      }
    } catch {
      setError(t.errors.network);
    } finally {
      setIsLoading(false);
    }
  }

  function handleDownloadPdf() {
    if (!resume) return;
    generateResumePdf(resume);
  }

  async function handleDownloadDocx() {
    if (!resume) return;
    setIsExporting(true);
    try {
      await generateResumeDocx(resume);
    } catch {
      setError(f.errors.exportFailed);
    } finally {
      setIsExporting(false);
    }
  }

  const hasInput = Boolean(file) || resumeText.trim().length > 0;
  const canSubmit = hasInput && !isLoading;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-10 text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-cyan-300">
          {f.eyebrow}
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          <span className="text-zinc-900 dark:bg-gradient-to-r dark:from-white dark:via-cyan-100 dark:to-blue-300 dark:bg-clip-text dark:text-transparent">
            {f.title}
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          {f.description}
        </p>
      </header>

      <form onSubmit={handleFormat} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {f.uploadLabel}
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
                  ? "border-indigo-500 bg-indigo-50 dark:border-cyan-400 dark:bg-cyan-400/10"
                  : "border-zinc-300 bg-zinc-50/80 dark:border-white/10 dark:bg-white/[0.03]"
              }`}
            >
              <label className="flex cursor-pointer flex-col items-center gap-2 text-center">
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {f.dragDrop}
                </span>
                <span className="text-xs text-zinc-500">
                  {formatMessage(f.browseHint, { size: MAX_PDF_SIZE_LABEL })}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                  onChange={handleFileChange}
                  disabled={isLoading}
                  className="sr-only"
                />
                <span className="mt-1 inline-flex rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-medium text-zinc-700 transition hover:border-indigo-400 hover:text-indigo-700 dark:border-white/15 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-cyan-400/40 dark:hover:text-cyan-200">
                  {f.chooseFile}
                </span>
              </label>

              {file && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm dark:border-cyan-400/30 dark:bg-cyan-400/10">
                  <span className="truncate text-indigo-900 dark:text-cyan-100">{file.name}</span>
                  <button
                    type="button"
                    onClick={clearFile}
                    disabled={isLoading}
                    className="shrink-0 text-xs font-medium text-indigo-700 hover:text-indigo-900 disabled:opacity-50 dark:text-cyan-200 dark:hover:text-cyan-100"
                  >
                    {t.form.remove}
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-200 dark:bg-white/10" />
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                {t.form.or}
              </span>
              <div className="h-px flex-1 bg-zinc-200 dark:bg-white/10" />
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {f.pasteLabel}
              </span>
              <textarea
                value={resumeText}
                onChange={(event) => handlePaste(event.target.value)}
                rows={14}
                placeholder={f.pastePlaceholder}
                className="w-full resize-y rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-zinc-100 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20 dark:disabled:bg-white/[0.02]"
                disabled={isLoading || Boolean(file)}
              />
              {file && <p className="mt-2 text-xs text-zinc-500">{f.removeFileHint}</p>}
            </label>
          </div>

          <div className="flex flex-col justify-between gap-6 rounded-2xl border border-zinc-200 bg-white/60 p-6 dark:border-white/10 dark:bg-white/[0.03]">
            <div>
              <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                {f.howItWorks}
              </h2>
              <ol className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                {f.steps.map((step, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-cyan-400/15 dark:text-cyan-200">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            <p className="text-xs text-zinc-500">{f.factsNote}</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-xs text-zinc-500">{f.privacyNote}</p>
          <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:items-end">
            <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 sm:text-right">
              {t.form.demoNote}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
              <button
                type="button"
                onClick={handleTryDemo}
                disabled={isLoading}
                className="inline-flex min-w-32 items-center justify-center rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-indigo-400 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-cyan-400/40 dark:hover:text-cyan-200"
              >
                {t.form.tryDemo}
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex min-w-40 items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:bg-gradient-to-r dark:from-cyan-400 dark:to-blue-500 dark:text-[#050816] dark:hover:opacity-90 dark:disabled:bg-white/10 dark:disabled:text-zinc-500"
              >
                {isLoading ? (
                  <>
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {f.formatting}
                  </>
                ) : (
                  f.formatButton
                )}
              </button>
            </div>
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

      {DEV && debugInfo && <DebugPanel info={debugInfo} />}

      {resume && (
        <div className="mt-12">
          <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-inherit">
                {f.previewTitle}
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{f.previewHint}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex items-center rounded-full border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-800 transition hover:border-indigo-400 hover:bg-indigo-100 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-100 dark:hover:border-cyan-300/50 dark:hover:bg-cyan-400/20"
              >
                {f.downloadPdf}
              </button>
              <button
                type="button"
                onClick={handleDownloadDocx}
                disabled={isExporting}
                className="inline-flex items-center rounded-full border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-800 transition hover:border-indigo-400 hover:bg-indigo-100 disabled:opacity-60 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-100 dark:hover:border-cyan-300/50 dark:hover:bg-cyan-400/20"
              >
                {isExporting ? f.exporting : f.downloadDocx}
              </button>
            </div>
          </div>
          <ResumePreview resume={resume} onChange={setResume} />
        </div>
      )}
    </div>
  );
}
