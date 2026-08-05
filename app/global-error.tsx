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
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-50 font-sans text-zinc-900 antialiased dark:bg-[#050816] dark:text-white">
        <div className="flex min-h-screen items-center justify-center px-4 py-16">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-cyan-300">
              ResumeX
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">
              Application error
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              A critical error prevented ResumeX from loading. Please refresh the
              page or try again later.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 dark:bg-gradient-to-r dark:from-cyan-400 dark:to-blue-500 dark:text-[#050816]"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
