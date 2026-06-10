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
      className="inline-flex shrink-0 items-center rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-800 transition hover:border-indigo-400 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200 dark:hover:border-indigo-600 dark:hover:bg-indigo-950"
      aria-label="Download report as PDF"
    >
      Download Report
    </button>
  );
}
