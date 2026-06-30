export type JobStatus = "new" | "saved" | "dismissed" | "applied";

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string | null;
  remote: boolean;
  salary: string | null;
  url: string;
  platform: string;
  description: string;
  postedAt: string | null;
  discoveredAt: string;
  status: JobStatus;
  matchScore: number | null;
  matchGaps: string[];
  matchSummary: string | null;
  applySupported: boolean;
  source: string;
}

export interface JobMatchResult {
  jobId: string;
  score: number;
  summary: string;
  gaps: string[];
  matchGaps?: string[];
  matchSummary?: string;
  recommendation: string;
}
