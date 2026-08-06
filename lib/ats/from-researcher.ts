import type {
  AtsCandidateDraft,
  AtsEvidencePayload,
  AtsEvidenceSourceProduct,
} from "@/lib/ats/types";
import type { ResearcherCandidate } from "@/lib/talent-mapper/types";

function relevanceLabel(score: number): string {
  if (score >= 80) return "strong research overlap";
  if (score >= 60) return "moderate research overlap";
  if (score >= 40) return "partial research overlap";
  return "limited research overlap";
}

function orcidUrl(orcid?: string): string | undefined {
  if (!orcid) return undefined;
  if (orcid.startsWith("http")) return orcid;
  return `https://orcid.org/${orcid}`;
}

/**
 * Map a Talent Mapper researcher into a provider-neutral ATS draft.
 * Never invents email, employment, or work authorization.
 */
export function researcherToAtsCandidateDraft(input: {
  candidate: ResearcherCandidate;
  searchProjectId?: string;
  searchProjectTitle?: string;
  localCandidateUrl?: string;
  sourceProduct?: AtsEvidenceSourceProduct;
  includeRecruiterNotes?: boolean;
}): AtsCandidateDraft {
  const { candidate } = input;
  const sourceProduct = input.sourceProduct ?? "ResumeX Talent Mapper";

  const publicProfileUrls = [
    candidate.openAlexUrl,
    candidate.pubmedUrl,
    orcidUrl(candidate.orcid),
  ].filter((u): u is string => Boolean(u));

  const directEvidence = candidate.matchedRequiredCriteria
    .filter((m) => m.confidence === "direct" || m.matchType === "exact")
    .slice(0, 8)
    .map((m) => ({
      criterion: m.criterion,
      explanation: m.snippet.slice(0, 240),
      sourceTitle: m.workTitle,
      sourceUrl: m.pubmedUrl || m.openAlexUrl,
      sourceYear: m.year,
    }));

  const adjacentEvidence = [
    ...candidate.matchedRequiredCriteria.filter(
      (m) => m.confidence !== "direct" && m.matchType !== "exact"
    ),
    ...candidate.matchedPreferredCriteria,
    ...candidate.matchedResearchAreas,
  ]
    .slice(0, 6)
    .map((m) => ({
      criterion: m.criterion,
      explanation: m.snippet.slice(0, 240),
      sourceTitle: m.workTitle,
      sourceUrl: m.pubmedUrl || m.openAlexUrl,
    }));

  const evidence: AtsEvidencePayload = {
    generatedAt: new Date().toISOString(),
    sourceProduct,
    searchProjectId: input.searchProjectId,
    searchProjectTitle: input.searchProjectTitle,
    localCandidateUrl: input.localCandidateUrl,
    relevanceLabel: relevanceLabel(candidate.score),
    relevanceScore: candidate.score,
    directEvidence,
    adjacentEvidence,
    unknowns: candidate.unknowns.slice(0, 12),
    recruiterNotes: input.includeRecruiterNotes
      ? candidate.recruiterNotes
      : undefined,
    publicProfileUrls,
    likelyInstitution: candidate.likelyInstitution?.name,
  };

  return {
    localCandidateKey: candidate.authorId,
    name: candidate.name,
    // Talent Mapper researchers typically lack email — do not invent one.
    openAlexUrl: candidate.openAlexUrl,
    orcidUrl: orcidUrl(candidate.orcid),
    pubmedUrl: candidate.pubmedUrl,
    websiteUrl: undefined,
    location: candidate.likelyInstitution?.countryCode
      ? { country: candidate.likelyInstitution.countryCode }
      : undefined,
    sourceLabel: sourceProduct,
    evidence,
  };
}
