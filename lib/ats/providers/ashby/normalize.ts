import type { AtsCandidateMatch, AtsJob, AtsJobStatus } from "@/lib/ats/types";

export function normalizeAshbyJob(job: {
  id: string;
  title?: string;
  status?: string;
  departmentName?: string;
  locationName?: string;
  requisitionId?: string;
  jobUrl?: string;
  updatedAt?: string;
}): AtsJob {
  const raw = (job.status || "").toLowerCase();
  let status: AtsJobStatus = "unknown";
  if (raw === "open") status = "open";
  else if (raw === "closed") status = "closed";
  else if (raw === "archived") status = "archived";
  else if (raw === "draft") status = "draft";

  return {
    id: job.id,
    provider: "ashby",
    title: job.title || "Untitled job",
    status,
    department: job.departmentName,
    location: job.locationName,
    requisitionId: job.requisitionId,
    externalUrl: job.jobUrl,
    updatedAt: job.updatedAt,
  };
}

export function normalizeAshbyCandidateMatch(
  hit: {
    id: string;
    name?: string;
    primaryEmailAddress?: { value?: string };
    emailAddresses?: { value?: string }[];
    phoneNumbers?: { value?: string }[];
  },
  opts: { queryEmail?: string; queryName?: string }
): AtsCandidateMatch {
  const emails = [
    hit.primaryEmailAddress?.value,
    ...(hit.emailAddresses || []).map((e) => e.value),
  ]
    .filter((e): e is string => Boolean(e))
    .map((e) => e.toLowerCase());

  let confidence: AtsCandidateMatch["confidence"] = "unknown";
  const reasons: string[] = [];
  const q = opts.queryEmail?.toLowerCase();
  if (q && emails.includes(q)) {
    confidence = "exact_email";
    reasons.push("Exact email match");
  } else if (opts.queryName && hit.name) {
    confidence = "name_only";
    reasons.push("Name similarity only — do not auto-reuse");
  }

  return {
    externalCandidateId: hit.id,
    name: hit.name || "Unknown",
    emails,
    phone: hit.phoneNumbers?.[0]?.value,
    confidence,
    reasons,
    existingJobAssociations: [],
  };
}
