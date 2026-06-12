"use client";

import { generateReportPdf } from "@/lib/generate-report-pdf";
import type { AnalysisResult } from "@/lib/types";

interface DownloadReportButtonProps {
  result: AnalysisResult;
}

export default function DownloadReportButton({ result }: DownloadReportButtonProps) {
  function handleDownload() {
    generateReportPdf(result);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="inline-flex shrink-0 items-center rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-800 transition hover:border-indigo-400 hover:bg-indigo-100 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-100 dark:hover:border-cyan-300/50 dark:hover:bg-cyan-400/20"
      aria-label="Download report as PDF"
    >
      Download Report
    </button>
  );
}
