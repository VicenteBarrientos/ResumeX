"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ResumeX] Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f1f3f6] font-sans text-zinc-900 antialiased">
        <div className="flex min-h-screen items-center justify-center px-4 py-16">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
              ResumeX
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">
              Application error
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
              A critical error prevented ResumeX from loading. Please refresh the
              page or try again later.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
