import type { AtsCandidateMatch, AtsJob, AtsJobStatus } from "@/lib/ats/types";

type RecruiteeOffer = {
  id: number | string;
  title?: string;
  status?: string;
  department?: string;
  location?: string;
  locations?: { city?: string; country?: string }[];
  slug?: string;
  kind?: string;
  careers_url?: string;
  updated_at?: string;
  requisition_id?: string;
};

export function normalizeRecruiteeOffer(offer: RecruiteeOffer): AtsJob | null {
  if (offer.kind && offer.kind !== "job") return null;

  const statusRaw = (offer.status || "").toLowerCase();
  let status: AtsJobStatus = "unknown";
  if (["published", "internal", "closed", "archived", "draft"].includes(statusRaw)) {
    if (statusRaw === "published" || statusRaw === "internal") status = "open";
    else if (statusRaw === "closed") status = "closed";
    else if (statusRaw === "archived") status = "archived";
    else if (statusRaw === "draft") status = "draft";
  }

  const location =
    offer.location ||
    offer.locations
      ?.map((l) => [l.city, l.country].filter(Boolean).join(", "))
      .filter(Boolean)
      .join("; ") ||
    undefined;

  return {
    id: String(offer.id),
    provider: "recruitee",
    title: offer.title || "Untitled job",
    status,
    department: offer.department,
    location,
    externalUrl: offer.careers_url,
    requisitionId: offer.requisition_id,
    updatedAt: offer.updated_at,
  };
}

type RecruiteeCandidateHit = {
  id: number | string;
  name?: string;
  emails?: string[];
  phones?: string[];
  adminapp_url?: string;
  placements?: {
    offer_id?: number | string;
    id?: number | string;
    stage_id?: number | string;
  }[];
};

export function normalizeRecruiteeCandidateMatch(
  hit: RecruiteeCandidateHit,
  opts: {
    queryEmail?: string;
    queryName?: string;
  }
): AtsCandidateMatch {
  const emails = (hit.emails || []).map((e) => e.toLowerCase());
  const queryEmail = opts.queryEmail?.toLowerCase();
  let confidence: AtsCandidateMatch["confidence"] = "unknown";
  const reasons: string[] = [];

  if (queryEmail && emails.includes(queryEmail)) {
    confidence = "exact_email";
    reasons.push("Exact email match");
  } else if (opts.queryName && hit.name) {
    const a = opts.queryName.trim().toLowerCase();
    const b = hit.name.trim().toLowerCase();
    if (a === b || b.includes(a) || a.includes(b)) {
      confidence = "name_only";
      reasons.push("Name similarity only — do not auto-reuse");
    }
  }

  return {
    externalCandidateId: String(hit.id),
    name: hit.name || "Unknown",
    emails,
    phone: hit.phones?.[0],
    externalUrl: hit.adminapp_url,
    confidence,
    reasons,
    existingJobAssociations: (hit.placements || []).map((p) => ({
      externalJobId: String(p.offer_id ?? ""),
      externalApplicationId: p.id != null ? String(p.id) : undefined,
      stage: p.stage_id != null ? String(p.stage_id) : undefined,
    })),
  };
}
