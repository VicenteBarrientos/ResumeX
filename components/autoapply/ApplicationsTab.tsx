"use client";

import type { Application, ApplicationStatus } from "@/lib/autoapply-types";

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "applied", label: "Applied" },
  { value: "reviewing", label: "In Review" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  applied: "bg-zinc-100 text-zinc-600",
  reviewing: "bg-amber-50 text-amber-700",
  interview: "bg-brand-50 text-brand-700",
  offer: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-rose-600",
};

interface Props {
  applications: Application[];
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onDelete: (id: string) => void;
  onViewAnswers: (id: string) => void;
}

export default function ApplicationsTab({ applications, onStatusChange, onDelete, onViewAnswers }: Props) {
  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white/50 py-20 text-center">
        <p className="text-4xl">📭</p>
        <p className="mt-3 text-sm font-medium text-zinc-700">No applications yet</p>
        <p className="mt-1 text-xs text-zinc-400">
          Use the Chrome extension to apply to jobs — they&apos;ll appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {applications
        .slice()
        .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
        .map((app) => (
          <div
            key={app.id}
            className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-zinc-400 capitalize">
                    {app.platform}
                  </span>
                  <span className="text-zinc-300">·</span>
                  <span className="text-xs text-zinc-400">
                    {new Date(app.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <p className="mt-0.5 font-semibold text-zinc-900">{app.role}</p>
                <p className="text-sm text-zinc-500">{app.company}</p>
              </div>

              {/* Status badge / selector */}
              <select
                value={app.status}
                onChange={(e) => onStatusChange(app.id, e.target.value as ApplicationStatus)}
                className={`rounded-full border-0 px-3 py-1 text-xs font-semibold ring-1 ring-inset focus:outline-none ${STATUS_STYLES[app.status]} ring-transparent`}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {app.jobUrl && (
                <a
                  href={app.jobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm hover:border-brand-300 hover:text-brand-600"
                >
                  View job ↗
                </a>
              )}
              <button
                onClick={() => onViewAnswers(app.id)}
                className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm hover:border-brand-300 hover:text-brand-600"
              >
                View answers
              </button>
              <button
                onClick={() => onDelete(app.id)}
                className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-medium text-rose-500 shadow-sm hover:bg-rose-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
