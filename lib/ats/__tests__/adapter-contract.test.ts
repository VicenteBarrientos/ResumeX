/**
 * Shared adapter contract checks.
 * Each fixture adapter must pass supported operations.
 */
import { describe, expect, it } from "vitest";
import type { AtsAdapter } from "../adapter";
import { createDemoAshbyAdapter } from "../providers/ashby/demo-adapter";
import type { AtsCapability, AtsCandidateDraft, AtsEvidencePayload } from "../types";

const evidence: AtsEvidencePayload = {
  generatedAt: "2026-08-05T12:00:00.000Z",
  sourceProduct: "ResumeX Talent Mapper",
  relevanceLabel: "moderate research overlap",
  relevanceScore: 70,
  directEvidence: [
    {
      criterion: "NGS",
      explanation: "Direct abstract evidence in one publication.",
      sourceTitle: "NGS pipeline",
      sourceYear: 2024,
    },
  ],
  adjacentEvidence: [],
  unknowns: ["Current employment"],
  publicProfileUrls: ["https://openalex.org/A999"],
};

const draft: AtsCandidateDraft = {
  localCandidateKey: "https://openalex.org/A999",
  name: "Dr. Maya Testwell",
  email: "maya.contract@example.invalid",
  sourceLabel: "ResumeX Talent Mapper",
  evidence,
};

function adapterContract(opts: {
  name: string;
  adapter: AtsAdapter;
  expectedCapabilities: AtsCapability[];
}) {
  describe(`adapterContract:${opts.name}`, () => {
    const { adapter } = opts;

    it("reports expected capabilities", () => {
      const caps = adapter.getCapabilities();
      for (const c of opts.expectedCapabilities) {
        expect(caps).toContain(c);
      }
    });

    it("listJobs returns normalized jobs", async () => {
      const { jobs } = await adapter.listJobs();
      expect(jobs.length).toBeGreaterThan(0);
      expect(jobs[0].provider).toBe(adapter.provider);
      expect(jobs[0].id).toBeTruthy();
      expect(jobs[0].title).toBeTruthy();
    });

    it("searchCandidates returns normalized matches", async () => {
      const matches = await adapter.searchCandidates({
        name: draft.name,
        email: "maya.testwell@example.invalid",
      });
      expect(Array.isArray(matches)).toBe(true);
      if (matches[0]) {
        expect(matches[0].externalCandidateId).toBeTruthy();
        expect(matches[0].confidence).toBeTruthy();
      }
    });

    it("createCandidate returns external id", async () => {
      const created = await adapter.createCandidate(draft);
      expect(created.externalCandidateId).toBeTruthy();
    });

    it("attachCandidateToJob returns normalized result", async () => {
      const created = await adapter.createCandidate({
        ...draft,
        email: `attach.${Date.now()}@example.invalid`,
      });
      const jobs = await adapter.listJobs();
      const app = await adapter.attachCandidateToJob({
        externalCandidateId: created.externalCandidateId,
        externalJobId: jobs.jobs[0].id,
      });
      expect(app.externalCandidateId).toBe(created.externalCandidateId);
      expect(app.externalJobId).toBe(jobs.jobs[0].id);
    });

    it("addEvidence reports storage method", async () => {
      const created = await adapter.createCandidate({
        ...draft,
        email: `ev.${Date.now()}@example.invalid`,
      });
      const result = await adapter.addEvidence({
        externalCandidateId: created.externalCandidateId,
        evidence,
      });
      expect([
        "note",
        "custom_fields",
        "candidate_profile_fields",
        "unsupported",
      ]).toContain(result.writtenAs);
    });
  });
}

adapterContract({
  name: "DemoAshby",
  adapter: createDemoAshbyAdapter(),
  expectedCapabilities: [
    "list_jobs",
    "search_candidates",
    "create_candidate",
    "create_application",
    "add_note",
  ],
});
