import type { AtsCandidateMatch, AtsJob, AtsJobStatus } from "@/lib/ats/types";

export function normalizeZohoJob(record: {
  id: string;
  Posting_Title?: string;
  Job_Opening_Name?: string;
  Job_Opening_Status?: string;
  Status?: string;
  Department_Name?: string | { name?: string };
  City?: string;
  State?: string;
  Country?: string;
  Remote_Job?: boolean | string;
  Date_Opened?: string;
  Target_Date?: string;
  Job_Opening_ID?: string;
}): AtsJob {
  const statusRaw = (
    record.Job_Opening_Status ||
    record.Status ||
    ""
  ).toLowerCase();
  let status: AtsJobStatus = "unknown";
  if (["in-progress", "open", "active", "published"].some((s) => statusRaw.includes(s))) {
    status = "open";
  } else if (statusRaw.includes("closed") || statusRaw.includes("filled")) {
    status = "closed";
  } else if (statusRaw.includes("draft")) {
    status = "draft";
  } else if (statusRaw.includes("archiv")) {
    status = "archived";
  }

  const department =
    typeof record.Department_Name === "string"
      ? record.Department_Name
      : record.Department_Name?.name;

  const location = [record.City, record.State, record.Country]
    .filter(Boolean)
    .join(", ");

  return {
    id: record.id,
    provider: "zoho-recruit",
    title: record.Posting_Title || record.Job_Opening_Name || "Untitled job",
    status,
    department,
    location: location || undefined,
    remoteStatus:
      record.Remote_Job === true || record.Remote_Job === "true" ? "remote" : undefined,
    requisitionId: record.Job_Opening_ID,
    updatedAt: record.Date_Opened,
  };
}

export function normalizeZohoCandidateMatch(
  record: {
    id: string;
    Full_Name?: string;
    First_Name?: string;
    Last_Name?: string;
    Email?: string;
    Secondary_Email?: string;
    Phone?: string;
    Mobile?: string;
  },
  opts: { queryEmail?: string; queryName?: string }
): AtsCandidateMatch {
  const emails = [record.Email, record.Secondary_Email]
    .filter((e): e is string => Boolean(e))
    .map((e) => e.toLowerCase());
  const name =
    record.Full_Name ||
    [record.First_Name, record.Last_Name].filter(Boolean).join(" ") ||
    "Unknown";

  let confidence: AtsCandidateMatch["confidence"] = "unknown";
  const reasons: string[] = [];
  const q = opts.queryEmail?.toLowerCase();
  if (q && emails.includes(q)) {
    confidence = "exact_email";
    reasons.push("Exact email match");
  } else if (opts.queryName) {
    confidence = "name_only";
    reasons.push("Name similarity only — do not auto-reuse");
  }

  return {
    externalCandidateId: record.id,
    name,
    emails,
    phone: record.Phone || record.Mobile,
    confidence,
    reasons,
    existingJobAssociations: [],
  };
}

export function splitCandidateName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "Unknown" };
  }
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1] || "Unknown",
  };
}
