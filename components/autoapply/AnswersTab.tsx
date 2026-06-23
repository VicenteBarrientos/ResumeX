"use client";

import type { Application } from "@/lib/autoapply-types";

interface Props {
  applications: Application[];
  selectedApp: Application | null;
  onSelect: (id: string) => void;
}

export default function AnswersTab({ applications, selectedApp, onSelect }: Props) {
  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white/50 py-20 text-center dark:border-white/10 dark:bg-white/5">
        <p className="text-4xl">🤖</p>
        <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">No answers yet</p>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          AI-generated answers from your applications will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      {/* Sidebar — application list */}
      <div className="w-56 shrink-0 space-y-1">
        {applications
          .slice()
          .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
          .map((app) => (
            <button
              key={app.id}
              onClick={() => onSelect(app.id)}
              className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                selectedApp?.id === app.id
                  ? "bg-indigo-50 text-indigo-700 dark:bg-cyan-400/10 dark:text-cyan-300"
                  : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-white/5"
              }`}
            >
              <p className="truncate text-xs font-semibold">{app.company}</p>
              <p className="truncate text-xs opacity-70">{app.role}</p>
              <p className="mt-0.5 text-[10px] opacity-50">
                {new Date(app.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </button>
          ))}
      </div>

      {/* Main panel — answers */}
      <div className="flex-1">
        {!selectedApp ? (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-zinc-200 dark:border-white/10">
            <p className="text-sm text-zinc-400">Select an application to see answers</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
            <h2 className="mb-1 font-semibold text-zinc-900 dark:text-white">{selectedApp.role}</h2>
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">{selectedApp.company}</p>

            {Object.keys(selectedApp.answers).length === 0 ? (
              <p className="text-sm text-zinc-400">No answers recorded for this application.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(selectedApp.answers).map(([question, answer]) => (
                  <div key={question} className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-white/5 dark:bg-white/5">
                    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{question}</p>
                    <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">{String(answer)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
