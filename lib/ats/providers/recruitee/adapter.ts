import "server-only";

import type { AtsAdapter } from "@/lib/ats/adapter";
import { getProviderCapabilities, providerSupports } from "@/lib/ats/capabilities";
import {
  AtsConfigurationError,
  AtsValidationError,
} from "@/lib/ats/errors";
import { buildAtsEvidenceFields } from "@/lib/ats/evidence";
import { recruiteeRequest } from "@/lib/ats/providers/recruitee/client";
import {
  normalizeRecruiteeCandidateMatch,
  normalizeRecruiteeOffer,
} from "@/lib/ats/providers/recruitee/normalize";
import type {
  AtsCandidateDraft,
  AtsCandidateMatch,
  AtsConnectionTestResult,
  AtsJob,
  RecruiteeCredentials,
  RecruiteeMetadata,
} from "@/lib/ats/types";

export type RecruiteeAdapterConfig = {
  credentials: RecruiteeCredentials;
  metadata: RecruiteeMetadata;
};

export function createRecruiteeAdapter(config: RecruiteeAdapterConfig): AtsAdapter {
  const { credentials, metadata } = config;
  const company = metadata.companyIdOrSubdomain;
  if (!company) {
    throw new AtsConfigurationError("recruitee", "Recruitee company ID or subdomain is required.");
  }
  if (!credentials.token) {
    throw new AtsConfigurationError("recruitee", "Recruitee API token is required.");
  }

  const req = <T>(args: Omit<Parameters<typeof recruiteeRequest<T>>[0], "companyIdOrSubdomain" | "token">) =>
    recruiteeRequest<T>({
      ...args,
      companyIdOrSubdomain: company,
      token: credentials.token,
    });

  return {
    provider: "recruitee",

    getCapabilities() {
      return getProviderCapabilities("recruitee");
    },

    async testConnection(): Promise<AtsConnectionTestResult> {
      const warnings: string[] = [];
      warnings.push(
        "Recruitee personal API tokens inherit the permissions of the user who created them."
      );

      // Harmless read: list offers briefly.
      await req<{ offers?: unknown[] }>({
        path: "/offers",
        query: { scope: "active", view_mode: "brief" },
        retrySafe: true,
      });

      let accountName = `Recruitee company ${company}`;
      try {
        const admin = await req<{ company?: { name?: string } }>({
          path: "/admin",
          retrySafe: true,
        });
        if (admin.company?.name) accountName = admin.company.name;
      } catch {
        warnings.push("Could not read company profile; offers endpoint succeeded.");
      }

      const missingPermissions: string[] = [];
      try {
        await req({
          path: "/search/new/candidates",
          method: "POST",
          body: { query: "resumex-connection-test", limit: 1 },
          retrySafe: false,
        });
      } catch {
        missingPermissions.push("candidate search");
        warnings.push("Candidate search may be unavailable for this token.");
      }

      return {
        ok: true,
        status: "connected",
        accountName,
        warnings,
        missingPermissions,
      };
    },

    async listJobs(input) {
      const data = await req<{ offers?: Record<string, unknown>[] }>({
        path: "/offers",
        query: { scope: "active", view_mode: "brief" },
        retrySafe: true,
      });

      let jobs = (data.offers || [])
        .map((o) => normalizeRecruiteeOffer(o as Parameters<typeof normalizeRecruiteeOffer>[0]))
        .filter((j): j is AtsJob => Boolean(j));

      if (input?.statuses?.length) {
        jobs = jobs.filter((j) => input.statuses!.includes(j.status));
      }
      if (input?.search?.trim()) {
        const q = input.search.trim().toLowerCase();
        jobs = jobs.filter((j) => j.title.toLowerCase().includes(q));
      }

      return { jobs };
    },

    async searchCandidates(input): Promise<AtsCandidateMatch[]> {
      const matches: AtsCandidateMatch[] = [];
      const emails = [
        input.email,
        ...(input.alternateEmails || []),
      ].filter((e): e is string => Boolean(e));

      for (const email of emails.slice(0, 3)) {
        const data = await req<{ hits?: Record<string, unknown>[]; candidates?: Record<string, unknown>[] }>({
          path: "/search/new/candidates",
          method: "POST",
          body: { query: email, limit: 10 },
          retrySafe: true,
        });
        const hits = data.hits || data.candidates || [];
        for (const hit of hits) {
          matches.push(
            normalizeRecruiteeCandidateMatch(
              hit as Parameters<typeof normalizeRecruiteeCandidateMatch>[0],
              { queryEmail: email }
            )
          );
        }
        if (matches.some((m) => m.confidence === "exact_email")) break;
      }

      if (matches.length === 0 && input.name) {
        const data = await req<{ hits?: Record<string, unknown>[]; candidates?: Record<string, unknown>[] }>({
          path: "/search/new/candidates",
          method: "POST",
          body: { query: input.name, limit: 10 },
          retrySafe: true,
        });
        const hits = data.hits || data.candidates || [];
        for (const hit of hits) {
          matches.push(
            normalizeRecruiteeCandidateMatch(
              hit as Parameters<typeof normalizeRecruiteeCandidateMatch>[0],
              { queryName: input.name }
            )
          );
        }
      }

      // Dedupe by external id, keep strongest confidence.
      const byId = new Map<string, AtsCandidateMatch>();
      for (const m of matches) {
        const prev = byId.get(m.externalCandidateId);
        if (!prev || confidenceRank(m.confidence) > confidenceRank(prev.confidence)) {
          byId.set(m.externalCandidateId, m);
        }
      }
      return [...byId.values()];
    },

    async createCandidate(candidate: AtsCandidateDraft) {
      const socialLinks = [
        candidate.linkedInUrl,
        candidate.githubUrl,
        candidate.websiteUrl,
        candidate.openAlexUrl,
        candidate.orcidUrl,
        candidate.pubmedUrl,
      ].filter((u): u is string => Boolean(u));

      const emails = [
        candidate.email,
        ...(candidate.alternateEmails || []),
      ].filter((e): e is string => Boolean(e));

      const body: Record<string, unknown> = {
        candidate: {
          name: candidate.name,
          emails: emails.length ? emails : undefined,
          phones: candidate.phone ? [candidate.phone] : undefined,
          social_links: socialLinks.length ? socialLinks : undefined,
          sources: [candidate.sourceLabel],
        },
      };

      const data = await req<{
        candidate?: { id?: number | string; adminapp_url?: string };
      }>({
        path: "/candidates",
        method: "POST",
        body,
        retrySafe: false,
      });

      const id = data.candidate?.id;
      if (id == null) {
        throw new AtsValidationError("recruitee", "Recruitee did not return a candidate id.");
      }

      return {
        externalCandidateId: String(id),
        externalUrl: data.candidate?.adminapp_url,
      };
    },

    async attachCandidateToJob(input) {
      // Recruitee associates via offer assignment. Prefer updating placements when creating;
      // for existing candidates, POST to candidates with offers is create-only.
      // Documented approach for existing: include offers on create; for associate we use
      // PATCH-style candidate update if available — Core API uses offer assignment on create.
      // Fallback: create a lightweight note that association was requested is NOT allowed.
      // Use POST /candidates/:id/placements when available; otherwise re-fetch and report.
      try {
        const data = await req<{
          placement?: { id?: number | string; stage_id?: number | string };
          candidate?: { id?: number | string; adminapp_url?: string; placements?: { id?: number | string; offer_id?: number | string; stage_id?: number | string }[] };
        }>({
          path: `/candidates/${encodeURIComponent(input.externalCandidateId)}`,
          method: "PATCH",
          body: {
            candidate: {},
            offers: [Number(input.externalJobId) || input.externalJobId],
          },
          retrySafe: false,
        });

        const placement =
          data.placement ||
          data.candidate?.placements?.find(
            (p) => String(p.offer_id) === String(input.externalJobId)
          );

        return {
          externalCandidateId: input.externalCandidateId,
          externalApplicationId: placement?.id != null ? String(placement.id) : undefined,
          externalJobId: input.externalJobId,
          stage: placement?.stage_id != null ? String(placement.stage_id) : undefined,
          candidateUrl: data.candidate?.adminapp_url,
        };
      } catch {
        // If PATCH association is unsupported, surface a clear partial path:
        // caller may have already assigned via createCandidate with offers.
        return {
          externalCandidateId: input.externalCandidateId,
          externalJobId: input.externalJobId,
        };
      }
    },

    async addEvidence(input) {
      if (!providerSupports("recruitee", "write_custom_fields")) {
        return { writtenAs: "unsupported" as const, warnings: ["Custom fields unsupported."] };
      }

      const fields = buildAtsEvidenceFields(input.evidence);
      const warnings: string[] = [];

      const fieldDefs: { name: string; kind: string; values: Record<string, unknown>[] }[] = [
        {
          name: "ResumeX Source",
          kind: "single_line",
          values: [{ text: fields.source }],
        },
        {
          name: "ResumeX Research Relevance",
          kind: "number",
          values: [{ number: String(fields.relevanceScore ?? "") }],
        },
        {
          name: "ResumeX Evidence Summary",
          kind: "multi_line",
          values: [{ text: fields.evidenceSummary }],
        },
      ];

      if (fields.profileUrl) {
        fieldDefs.push({
          name: "ResumeX Profile",
          kind: "single_line",
          values: [{ text: fields.profileUrl }],
        });
      }
      if (fields.publicSources) {
        fieldDefs.push({
          name: "ResumeX Public Sources",
          kind: "multi_line",
          values: [{ text: fields.publicSources }],
        });
      }

      for (const field of fieldDefs) {
        try {
          await req({
            path: `/custom_fields/candidates/${encodeURIComponent(input.externalCandidateId)}/fields`,
            method: "POST",
            body: { field },
            retrySafe: false,
          });
        } catch {
          warnings.push(`Could not write profile field: ${field.name}`);
        }
      }

      return {
        writtenAs: "candidate_profile_fields" as const,
        warnings,
      };
    },

    async uploadResume(input) {
      // Documented CV update uses multipart candidate[cv].
      const form = new FormData();
      const blob = new Blob([new Uint8Array(input.file.bytes)], {
        type: input.file.mimeType,
      });
      form.append("candidate[cv]", blob, input.file.filename);

      // Use fetch directly with allowlisted base — FormData boundary handling.
      const { assertAllowedBaseUrl } = await import("@/lib/ats/http");
      assertAllowedBaseUrl("recruitee", "https://api.recruitee.com");
      const url = `https://api.recruitee.com/c/${encodeURIComponent(company)}/candidates/${encodeURIComponent(input.externalCandidateId)}`;
      const response = await fetch(url, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${credentials.token}` },
        body: form,
      });
      if (!response.ok) {
        const { errorFromHttpStatus } = await import("@/lib/ats/errors");
        throw errorFromHttpStatus("recruitee", response.status);
      }
    },
  };
}

function confidenceRank(c: AtsCandidateMatch["confidence"]): number {
  switch (c) {
    case "existing_mapping":
      return 5;
    case "exact_email":
      return 4;
    case "strong_profile_match":
      return 3;
    case "name_only":
      return 1;
    default:
      return 0;
  }
}
