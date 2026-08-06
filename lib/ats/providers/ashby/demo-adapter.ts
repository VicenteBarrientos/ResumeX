import type { AtsAdapter } from "@/lib/ats/adapter";
import { getProviderCapabilities } from "@/lib/ats/capabilities";
import { buildAtsEvidencePlainText } from "@/lib/ats/evidence";
import type {
  AtsCandidateDraft,
  AtsCandidateMatch,
  AtsConnectionTestResult,
  AtsJob,
} from "@/lib/ats/types";

const DEMO_JOBS: AtsJob[] = [
  {
    id: "demo-job-virology",
    provider: "ashby",
    title: "[Demo] Senior Research Scientist — Viral Vectors",
    status: "open",
    department: "R&D",
    location: "Cambridge, MA",
  },
  {
    id: "demo-job-ngs",
    provider: "ashby",
    title: "[Demo] Computational Biologist — NGS",
    status: "open",
    department: "Computational Biology",
    location: "Remote (US)",
  },
  {
    id: "demo-job-cell",
    provider: "ashby",
    title: "[Demo] Scientist — Mammalian Cell Culture",
    status: "open",
    department: "Process Development",
    location: "Boston, MA",
  },
];

/**
 * Fully functional Ashby Demo Mode — never calls the network.
 * Uses the same adapter contract as live Ashby.
 */
export function createDemoAshbyAdapter(): AtsAdapter {
  const created = new Map<string, { name: string; email?: string }>();
  const applications = new Map<string, { candidateId: string; jobId: string }>();

  return {
    provider: "ashby",

    getCapabilities() {
      return getProviderCapabilities("ashby").filter(
        (c) => c !== "receive_webhooks" && c !== "incremental_sync"
      );
    },

    async testConnection(): Promise<AtsConnectionTestResult> {
      return {
        ok: true,
        status: "connected",
        accountName: "Ashby Demo Mode",
        warnings: ["Ashby Demo Mode — No external ATS data was modified."],
        missingPermissions: [],
      };
    },

    async listJobs(input) {
      let jobs = DEMO_JOBS;
      if (input?.search?.trim()) {
        const q = input.search.trim().toLowerCase();
        jobs = jobs.filter((j) => j.title.toLowerCase().includes(q));
      }
      return { jobs };
    },

    async searchCandidates(input): Promise<AtsCandidateMatch[]> {
      const matches: AtsCandidateMatch[] = [];

      if (input.email?.toLowerCase() === "maya.testwell@example.invalid") {
        matches.push({
          externalCandidateId: "demo-cand-maya-existing",
          name: "Dr. Maya Testwell",
          emails: ["maya.testwell@example.invalid"],
          confidence: "exact_email",
          reasons: ["Exact email match (demo fixture)"],
          existingJobAssociations: [
            {
              externalJobId: "demo-job-virology",
              jobTitle: DEMO_JOBS[0].title,
              externalApplicationId: "demo-app-maya-viro",
              stage: "Lead",
            },
          ],
        });
      }

      if (
        matches.length === 0 &&
        input.name &&
        /maya|testwell/i.test(input.name)
      ) {
        matches.push({
          externalCandidateId: "demo-cand-maya-name",
          name: "Maya Testwell",
          emails: [],
          confidence: "name_only",
          reasons: ["Name-only possible match (demo) — do not auto-reuse"],
          existingJobAssociations: [],
        });
      }

      for (const [id, cand] of created) {
        if (
          (input.email && cand.email?.toLowerCase() === input.email.toLowerCase()) ||
          (input.name && cand.name.toLowerCase().includes(input.name.toLowerCase()))
        ) {
          matches.push({
            externalCandidateId: id,
            name: cand.name,
            emails: cand.email ? [cand.email] : [],
            confidence: input.email && cand.email ? "exact_email" : "name_only",
            reasons: ["Match against demo-created candidate"],
            existingJobAssociations: [],
          });
        }
      }

      return matches;
    },

    async createCandidate(candidate: AtsCandidateDraft) {
      const id = `demo-cand-${Date.now()}`;
      created.set(id, { name: candidate.name, email: candidate.email });
      return {
        externalCandidateId: id,
        externalUrl: `https://demo.ashbyhq.invalid/candidates/${id}`,
      };
    },

    async attachCandidateToJob(input) {
      const appId = `demo-app-${Date.now()}`;
      applications.set(appId, {
        candidateId: input.externalCandidateId,
        jobId: input.externalJobId,
      });
      return {
        externalCandidateId: input.externalCandidateId,
        externalApplicationId: appId,
        externalJobId: input.externalJobId,
        stage: "Lead",
        candidateUrl: `https://demo.ashbyhq.invalid/candidates/${input.externalCandidateId}`,
        applicationUrl: `https://demo.ashbyhq.invalid/applications/${appId}`,
      };
    },

    async addEvidence(input) {
      // Build evidence to prove formatting works — no network.
      void buildAtsEvidencePlainText(input.evidence);
      return { writtenAs: "note" as const, warnings: [] };
    },

    async uploadResume() {
      // Simulated success.
    },

    async listStages() {
      return [
        { id: "demo-stage-lead", name: "Lead", category: "Lead" },
        { id: "demo-stage-screen", name: "Phone Screen", category: "Active" },
      ];
    },

    async moveApplication() {
      // Simulated.
    },
  };
}
