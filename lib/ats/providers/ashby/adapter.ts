import "server-only";

import type { AtsAdapter } from "@/lib/ats/adapter";
import { getProviderCapabilities } from "@/lib/ats/capabilities";
import { AtsValidationError } from "@/lib/ats/errors";
import { buildAtsEvidenceHtml, buildAtsEvidencePlainText } from "@/lib/ats/evidence";
import { ashbyRequest } from "@/lib/ats/providers/ashby/client";
import {
  normalizeAshbyCandidateMatch,
  normalizeAshbyJob,
} from "@/lib/ats/providers/ashby/normalize";
import type {
  AshbyCredentials,
  AshbyMetadata,
  AtsCandidateDraft,
  AtsCandidateMatch,
  AtsConnectionTestResult,
  AtsJob,
} from "@/lib/ats/types";

export type AshbyAdapterConfig = {
  credentials: AshbyCredentials;
  metadata?: AshbyMetadata;
};

export function createAshbyAdapter(config: AshbyAdapterConfig): AtsAdapter {
  const { credentials, metadata = {} } = config;

  const call = <T>(path: string, body?: unknown, retrySafe = false) =>
    ashbyRequest<T>({
      apiKey: credentials.apiKey,
      path,
      body,
      actingUserId: metadata.actingUserId,
      retrySafe,
    });

  return {
    provider: "ashby",

    getCapabilities() {
      return getProviderCapabilities("ashby");
    },

    async testConnection(): Promise<AtsConnectionTestResult> {
      const warnings: string[] = [];
      const missingPermissions: string[] = [];

      await call("job.list", { status: ["Open"], limit: 1 }, true);

      try {
        await call("apiKey.info", {}, true);
      } catch {
        warnings.push("apiKey.info unavailable — key may lack API Keys read permission.");
      }

      return {
        ok: true,
        status: "connected",
        accountName: "Ashby",
        warnings,
        missingPermissions,
      };
    },

    async listJobs(input) {
      const jobs: AtsJob[] = [];
      let cursor: string | undefined = input?.cursor;
      let guard = 0;

      do {
        const page = await call<{
          results?: Record<string, unknown>[];
          nextCursor?: string;
          moreDataAvailable?: boolean;
        } | Record<string, unknown>[]>(
          "job.list",
          {
            status: ["Open"],
            cursor,
            limit: 50,
          },
          true
        );

        const batch: Record<string, unknown>[] = Array.isArray(page)
          ? page
          : Array.isArray((page as { results?: Record<string, unknown>[] }).results)
            ? ((page as { results: Record<string, unknown>[] }).results)
            : [];

        for (const job of batch) {
          jobs.push(
            normalizeAshbyJob({
              id: String(job.id),
              title: job.title as string | undefined,
              status: job.status as string | undefined,
              departmentName:
                (job.departmentName as string) ||
                ((job.department as { name?: string } | undefined)?.name),
              locationName:
                (job.locationName as string) ||
                ((job.location as { name?: string } | undefined)?.name),
              requisitionId: job.requisitionId as string | undefined,
              jobUrl: job.jobUrl as string | undefined,
              updatedAt: job.updatedAt as string | undefined,
            })
          );
        }

        const payload = page as {
          nextCursor?: string;
          moreDataAvailable?: boolean;
        };
        cursor = !Array.isArray(page) ? payload.nextCursor : undefined;
        guard += 1;
        if (Array.isArray(page) || !payload.moreDataAvailable || !cursor || guard > 10) {
          break;
        }
      } while (true);

      let filtered = jobs;
      if (input?.search?.trim()) {
        const q = input.search.trim().toLowerCase();
        filtered = filtered.filter((j) => j.title.toLowerCase().includes(q));
      }
      return { jobs: filtered, nextCursor: cursor };
    },

    async searchCandidates(input): Promise<AtsCandidateMatch[]> {
      const matches: AtsCandidateMatch[] = [];
      if (input.email) {
        const results = await call<Record<string, unknown>[] | { results?: Record<string, unknown>[] }>(
          "candidate.search",
          { email: input.email },
          true
        );
        const list = Array.isArray(results)
          ? results
          : (results as { results?: Record<string, unknown>[] }).results || [];
        for (const hit of list) {
          matches.push(
            normalizeAshbyCandidateMatch(
              hit as Parameters<typeof normalizeAshbyCandidateMatch>[0],
              { queryEmail: input.email }
            )
          );
        }
      }

      if (matches.length === 0 && input.name) {
        const results = await call<Record<string, unknown>[] | { results?: Record<string, unknown>[] }>(
          "candidate.search",
          { name: input.name },
          true
        );
        const list = Array.isArray(results)
          ? results
          : (results as { results?: Record<string, unknown>[] }).results || [];
        for (const hit of list) {
          matches.push(
            normalizeAshbyCandidateMatch(
              hit as Parameters<typeof normalizeAshbyCandidateMatch>[0],
              { queryName: input.name }
            )
          );
        }
      }

      return matches;
    },

    async createCandidate(candidate: AtsCandidateDraft) {
      const body: Record<string, unknown> = {
        name: candidate.name,
      };
      if (candidate.email) body.email = candidate.email;
      if (candidate.phone) body.phoneNumber = candidate.phone;
      if (candidate.linkedInUrl) body.linkedInUrl = candidate.linkedInUrl;
      if (candidate.githubUrl) body.githubUrl = candidate.githubUrl;
      if (candidate.websiteUrl) body.website = candidate.websiteUrl;
      if (candidate.location) {
        body.location = {
          city: candidate.location.city,
          region: candidate.location.region,
          country: candidate.location.country,
        };
      }
      if (metadata.sourceId) body.sourceId = metadata.sourceId;
      if (metadata.actingUserId) body.creditedToUserId = metadata.actingUserId;

      const created = await call<{ id: string }>("candidate.create", body, false);
      const id = (created as { id?: string }).id;
      if (!id) throw new AtsValidationError("ashby", "Ashby did not return a candidate id.");
      return { externalCandidateId: id };
    },

    async attachCandidateToJob(input) {
      // Detect existing application first when possible.
      try {
        const existing = await call<
          | { id: string; status?: string }[]
          | { results?: { id: string; status?: string }[] }
        >(
          "application.list",
          {
            candidateId: input.externalCandidateId,
            jobId: input.externalJobId,
          },
          true
        );
        const list = Array.isArray(existing)
          ? existing
          : (existing as { results?: { id: string; status?: string }[] }).results || [];
        if (list[0]?.id) {
          return {
            externalCandidateId: input.externalCandidateId,
            externalApplicationId: list[0].id,
            externalJobId: input.externalJobId,
            stage: list[0].status,
          };
        }
      } catch {
        // Continue to create.
      }

      const created = await call<{ id: string; status?: string }>(
        "application.create",
        {
          candidateId: input.externalCandidateId,
          jobId: input.externalJobId,
        },
        false
      );

      return {
        externalCandidateId: input.externalCandidateId,
        externalApplicationId: (created as { id?: string }).id,
        externalJobId: input.externalJobId,
        stage: (created as { status?: string }).status,
      };
    },

    async addEvidence(input) {
      const warnings: string[] = [];
      const html = buildAtsEvidenceHtml(input.evidence);
      const plain = buildAtsEvidencePlainText(input.evidence);

      await call(
        "candidate.createNote",
        {
          candidateId: input.externalCandidateId,
          note: html || plain,
          sendNotifications: false,
          isPrivate: false,
        },
        false
      );

      const map = metadata.customFieldMap;
      if (map && Object.keys(map).length > 0) {
        const fieldSubmits: { fieldId: string; fieldValue: unknown }[] = [];
        if (map.source) {
          fieldSubmits.push({
            fieldId: map.source,
            fieldValue: input.evidence.sourceProduct,
          });
        }
        if (map.relevance && input.evidence.relevanceScore != null) {
          fieldSubmits.push({
            fieldId: map.relevance,
            fieldValue: input.evidence.relevanceScore,
          });
        }
        if (map.candidateUrl && input.evidence.localCandidateUrl) {
          fieldSubmits.push({
            fieldId: map.candidateUrl,
            fieldValue: input.evidence.localCandidateUrl,
          });
        }
        if (fieldSubmits.length) {
          try {
            await call(
              "customField.setValues",
              {
                objectId: input.externalCandidateId,
                objectType: "Candidate",
                fieldValues: fieldSubmits,
              },
              false
            );
          } catch {
            warnings.push("Custom field update failed; evidence note was still written.");
          }
        }
      }

      return {
        writtenAs: map ? ("custom_fields" as const) : ("note" as const),
        warnings,
      };
    },

    async uploadResume(input) {
      // Multipart direct upload for small files.
      const { assertAllowedBaseUrl } = await import("@/lib/ats/http");
      assertAllowedBaseUrl("ashby", BASE);
      const form = new FormData();
      form.append("candidateId", input.externalCandidateId);
      form.append(
        "resume",
        new Blob([new Uint8Array(input.file.bytes)], { type: input.file.mimeType }),
        input.file.filename
      );

      const response = await fetch(`${BASE}/candidate.uploadResume`, {
        method: "POST",
        headers: {
          Authorization: (await import("@/lib/ats/providers/ashby/client")).ashbyBasicAuthHeader(
            credentials.apiKey
          ),
          Accept: "application/json; version=1",
        },
        body: form,
      });
      if (!response.ok) {
        const { errorFromHttpStatus } = await import("@/lib/ats/errors");
        throw errorFromHttpStatus("ashby", response.status);
      }
    },

    async listStages() {
      const stages = await call<{ id: string; name: string; type?: string }[] | { results?: { id: string; name: string; type?: string }[] }>(
        "interviewStage.list",
        {},
        true
      );
      const list = Array.isArray(stages)
        ? stages
        : (stages as { results?: { id: string; name: string; type?: string }[] }).results || [];
      return list.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.type,
      }));
    },

    async moveApplication(input) {
      await call(
        "application.changeStage",
        {
          applicationId: input.externalApplicationId,
          interviewStageId: input.externalStageId,
        },
        false
      );
    },
  };
}

const BASE = "https://api.ashbyhq.com";
