import "server-only";

import type { AtsAdapter } from "@/lib/ats/adapter";
import { getProviderCapabilities } from "@/lib/ats/capabilities";
import {
  AtsConflictError,
  AtsValidationError,
} from "@/lib/ats/errors";
import { buildAtsEvidencePlainText } from "@/lib/ats/evidence";
import {
  ATS_METADATA_CACHE_TTL_MS,
  atsCacheGet,
  atsCacheSet,
} from "@/lib/ats/cache";
import { escapeZohoCriteriaValue, zohoRequest } from "@/lib/ats/providers/zoho/client";
import {
  normalizeZohoCandidateMatch,
  normalizeZohoJob,
  splitCandidateName,
} from "@/lib/ats/providers/zoho/normalize";
import type {
  AtsCandidateDraft,
  AtsCandidateMatch,
  AtsConnectionTestResult,
  AtsJob,
  ZohoMetadata,
} from "@/lib/ats/types";

export type ZohoAdapterConfig = {
  connectionId: string;
  metadata: ZohoMetadata;
};

export function createZohoAdapter(config: ZohoAdapterConfig): AtsAdapter {
  const { connectionId, metadata } = config;
  const apiDomain = metadata.apiDomain;

  const req = <T>(args: Omit<Parameters<typeof zohoRequest<T>>[0], "connectionId" | "apiDomain">) =>
    zohoRequest<T>({
      ...args,
      connectionId,
      apiDomain,
    });

  return {
    provider: "zoho-recruit",

    getCapabilities() {
      return getProviderCapabilities("zoho-recruit");
    },

    async testConnection(): Promise<AtsConnectionTestResult> {
      const warnings: string[] = [];
      const missingPermissions: string[] = [];

      await req({
        path: "/recruit/v2/settings/modules",
        retrySafe: true,
      });

      try {
        await req({
          path: "/recruit/v2/Job_Openings",
          query: { per_page: 1 },
          retrySafe: true,
        });
      } catch {
        missingPermissions.push("Job Openings read");
      }

      return {
        ok: true,
        status: "connected",
        accountName: `Zoho Recruit (${metadata.dataCenter || "us"})`,
        warnings,
        missingPermissions,
      };
    },

    async listJobs(input) {
      const jobs: AtsJob[] = [];
      let page = 1;
      let more = true;

      while (more && page <= 5) {
        const data = await req<{
          data?: Record<string, unknown>[];
          info?: { more_records?: boolean };
        }>({
          path: "/recruit/v2/Job_Openings",
          query: {
            page,
            per_page: 50,
            fields:
              "id,Posting_Title,Job_Opening_Name,Job_Opening_Status,Status,Department_Name,City,State,Country,Remote_Job,Date_Opened,Target_Date,Job_Opening_ID",
          },
          retrySafe: true,
        });

        for (const record of data.data || []) {
          jobs.push(
            normalizeZohoJob(record as Parameters<typeof normalizeZohoJob>[0])
          );
        }
        more = Boolean(data.info?.more_records);
        page += 1;
      }

      let filtered = jobs.filter((j) => j.status === "open" || j.status === "unknown");
      if (input?.search?.trim()) {
        const q = input.search.trim().toLowerCase();
        filtered = filtered.filter((j) => j.title.toLowerCase().includes(q));
      }
      return { jobs: filtered };
    },

    async searchCandidates(input): Promise<AtsCandidateMatch[]> {
      const matches: AtsCandidateMatch[] = [];
      const emails = [input.email, ...(input.alternateEmails || [])].filter(
        (e): e is string => Boolean(e)
      );

      for (const email of emails.slice(0, 3)) {
        const criteria = `(Email:equals:${escapeZohoCriteriaValue(email)})`;
        const data = await req<{ data?: Record<string, unknown>[] }>({
          path: "/recruit/v2/Candidates/search",
          query: { criteria },
          retrySafe: true,
        });
        for (const record of data.data || []) {
          matches.push(
            normalizeZohoCandidateMatch(
              record as Parameters<typeof normalizeZohoCandidateMatch>[0],
              { queryEmail: email }
            )
          );
        }
        if (matches.some((m) => m.confidence === "exact_email")) break;
      }

      if (matches.length === 0 && input.name) {
        const criteria = `(Full_Name:starts_with:${escapeZohoCriteriaValue(input.name)})`;
        const data = await req<{ data?: Record<string, unknown>[] }>({
          path: "/recruit/v2/Candidates/search",
          query: { criteria },
          retrySafe: true,
        });
        for (const record of data.data || []) {
          matches.push(
            normalizeZohoCandidateMatch(
              record as Parameters<typeof normalizeZohoCandidateMatch>[0],
              { queryName: input.name }
            )
          );
        }
      }

      return matches;
    },

    async createCandidate(candidate: AtsCandidateDraft) {
      const cacheKey = `zoho:fields:${connectionId}`;
      let mandatory = atsCacheGet<string[]>(cacheKey);
      if (!mandatory) {
        try {
          const meta = await req<{
            fields?: { api_name?: string; system_mandatory?: boolean }[];
          }>({
            path: "/recruit/v2/settings/fields",
            query: { module: "Candidates" },
            retrySafe: true,
          });
          mandatory = (meta.fields || [])
            .filter((f) => f.system_mandatory && f.api_name)
            .map((f) => f.api_name!);
          atsCacheSet(cacheKey, mandatory, ATS_METADATA_CACHE_TTL_MS);
        } catch {
          mandatory = ["Last_Name"];
        }
      }

      const { firstName, lastName } = splitCandidateName(candidate.name);
      const record: Record<string, unknown> = {
        First_Name: firstName,
        Last_Name: lastName,
      };
      if (candidate.email) record.Email = candidate.email;
      if (candidate.phone) record.Phone = candidate.phone;
      if (candidate.sourceLabel) record.Candidate_Source = candidate.sourceLabel;

      if (mandatory.includes("Last_Name") && !record.Last_Name) {
        throw new AtsValidationError(
          "zoho-recruit",
          "Zoho requires Last_Name for candidates."
        );
      }

      const data = await req<{
        data?: { details?: { id?: string }; code?: string }[];
      }>({
        path: "/recruit/v2/Candidates",
        method: "POST",
        body: { data: [record] },
        retrySafe: false,
      });

      const id = data.data?.[0]?.details?.id;
      if (!id) {
        throw new AtsValidationError(
          "zoho-recruit",
          "Zoho did not return a candidate id."
        );
      }
      return { externalCandidateId: id };
    },

    async attachCandidateToJob(input) {
      const data = await req<{
        data?: { code?: string; message?: string; status?: string }[];
      }>({
        path: "/recruit/v2/Candidates/actions/associate",
        method: "PUT",
        body: {
          data: [
            {
              jobids: [input.externalJobId],
              ids: [input.externalCandidateId],
              comments: "Associated via ResumeX Talent",
            },
          ],
        },
        retrySafe: false,
      });

      const code = data.data?.[0]?.code;
      if (code === "ALREADY_ASSOCIATED") {
        return {
          externalCandidateId: input.externalCandidateId,
          externalJobId: input.externalJobId,
        };
      }
      if (code && code !== "SUCCESS") {
        throw new AtsConflictError(
          "zoho-recruit",
          data.data?.[0]?.message || `Association failed (${code}).`
        );
      }

      return {
        externalCandidateId: input.externalCandidateId,
        externalJobId: input.externalJobId,
      };
    },

    async addEvidence(input) {
      const note = buildAtsEvidencePlainText(input.evidence);
      await req({
        path: "/recruit/v2/Notes",
        method: "POST",
        body: {
          data: [
            {
              Note_Title: "ResumeX Talent Mapper Evidence",
              Note_Content: note,
              Parent_Id: input.externalCandidateId,
              se_module: "Candidates",
            },
          ],
        },
        retrySafe: false,
      });
      return { writtenAs: "note" as const, warnings: [] };
    },

    async uploadResume(input) {
      // Capability-detect: attempt attachment upload; callers treat failure as non-fatal.
      const form = new FormData();
      form.append(
        "file",
        new Blob([new Uint8Array(input.file.bytes)], { type: input.file.mimeType }),
        input.file.filename
      );

      const { assertAllowedBaseUrl } = await import("@/lib/ats/http");
      assertAllowedBaseUrl("zoho-recruit", apiDomain);
      const token = await (
        await import("@/lib/ats/providers/zoho/oauth")
      ).getValidZohoAccessToken(connectionId);

      const response = await fetch(
        `${apiDomain}/recruit/v2/Candidates/${encodeURIComponent(input.externalCandidateId)}/Attachments?attachments_category=Resume`,
        {
          method: "POST",
          headers: {
            Authorization: `Zoho-oauthtoken ${token}`,
          },
          body: form,
        }
      );

      if (!response.ok) {
        const { errorFromHttpStatus } = await import("@/lib/ats/errors");
        throw errorFromHttpStatus("zoho-recruit", response.status);
      }
    },
  };
}
