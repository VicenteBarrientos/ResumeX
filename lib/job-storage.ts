import type { CandidateProfile } from "@/lib/autoapply-types";
import type { Job } from "@/lib/job-types";

export const JOBS_KEY = "resumex_jobs";
const PROFILE_KEYS = ["resumex_profile", "autoapply_profile"] as const;

export function loadJobs(): Job[] {
  try {
    const raw = localStorage.getItem(JOBS_KEY);
    return raw ? (JSON.parse(raw) as Job[]) : [];
  } catch {
    return [];
  }
}

export function saveJobs(jobs: Job[]) {
  localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
  window.dispatchEvent(new CustomEvent("resumex:jobs_updated", { detail: jobs }));
}

export function loadProfile(): CandidateProfile | null {
  for (const key of PROFILE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as CandidateProfile;
    } catch {
      // try next key
    }
  }
  return null;
}

export function mergeJobs(existing: Job[], incoming: Job[]): Job[] {
  const byId = new Map(existing.map((j) => [j.id, j]));
  for (const job of incoming) {
    const prev = byId.get(job.id);
    if (prev) {
      byId.set(job.id, {
        ...job,
        status: prev.status === "applied" ? "applied" : prev.status,
        matchScore: prev.matchScore ?? job.matchScore,
        matchGaps: prev.matchGaps?.length ? prev.matchGaps : job.matchGaps,
        matchSummary: prev.matchSummary || job.matchSummary,
        discoveredAt: prev.discoveredAt || job.discoveredAt,
      });
    } else {
      byId.set(job.id, job);
    }
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime()
  );
}

export function markJobApplied(jobs: Job[], jobUrl: string): Job[] {
  return jobs.map((j) => (j.url === jobUrl ? { ...j, status: "applied" as const } : j));
}
