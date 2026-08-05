"use client";

import { generateReportPdf } from "@/lib/generate-report-pdf";
import { useLocale } from "@/components/LocaleProvider";
import type { CareerAnalysis } from "@/lib/types";

interface DownloadReportButtonProps {
  result: CareerAnalysis;
}

export default function DownloadReportButton({ result }: DownloadReportButtonProps) {
  const { t } = useLocale();
  function handleDownload() {
    generateReportPdf(result);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="inline-flex shrink-0 items-center rounded-md border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-800 transition hover:border-brand-400 hover:bg-brand-100"
      aria-label={t.results.downloadReport}
    >
      {t.results.downloadReport}
    </button>
  );
}
