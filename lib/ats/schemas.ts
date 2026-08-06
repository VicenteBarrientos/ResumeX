import { z } from "zod";

export const atsProviderSchema = z.enum(["recruitee", "zoho-recruit", "ashby"]);

export const recruiteeConnectSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  companyIdOrSubdomain: z.string().trim().min(1).max(120),
  token: z.string().trim().min(8).max(500),
  webhookSecret: z.string().trim().max(500).optional(),
});

export const ashbyConnectSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  apiKey: z.string().trim().min(8).max(500),
  sourceId: z.string().trim().max(120).optional(),
  actingUserId: z.string().trim().max(120).optional(),
  mode: z.enum(["live", "sandbox"]).default("live"),
});

export const ashbyDemoConnectSchema = z.object({
  displayName: z.string().trim().min(1).max(120).default("Ashby Demo Mode"),
});

export const candidateDraftSchema = z.object({
  localCandidateKey: z.string().min(1).max(500),
  name: z.string().trim().min(1).max(300),
  email: z.string().email().optional(),
  alternateEmails: z.array(z.string().email()).max(10).optional(),
  phone: z.string().max(80).optional(),
  location: z
    .object({
      city: z.string().max(120).optional(),
      region: z.string().max(120).optional(),
      country: z.string().max(120).optional(),
    })
    .optional(),
  linkedInUrl: z.string().url().optional(),
  githubUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  openAlexUrl: z.string().url().optional(),
  orcidUrl: z.string().url().optional(),
  pubmedUrl: z.string().url().optional(),
  sourceLabel: z.string().min(1).max(200),
  evidence: z.object({
    generatedAt: z.string(),
    sourceProduct: z.enum([
      "ResumeX Talent Mapper",
      "ResumeX Sourcing Copilot",
      "ResumeX Candidate Analyzer",
    ]),
    searchProjectId: z.string().optional(),
    searchProjectTitle: z.string().optional(),
    localCandidateUrl: z.string().url().optional(),
    relevanceLabel: z.string(),
    relevanceScore: z.number().min(0).max(100).optional(),
    directEvidence: z.array(
      z.object({
        criterion: z.string(),
        explanation: z.string(),
        sourceTitle: z.string().optional(),
        sourceUrl: z.string().optional(),
        sourceYear: z.number().optional(),
      })
    ),
    adjacentEvidence: z.array(
      z.object({
        criterion: z.string(),
        explanation: z.string(),
        sourceTitle: z.string().optional(),
        sourceUrl: z.string().optional(),
      })
    ),
    unknowns: z.array(z.string()),
    recruiterNotes: z.string().max(4000).optional(),
    publicProfileUrls: z.array(z.string()),
    likelyInstitution: z.string().optional(),
  }),
});

export const transferPreviewSchema = z.object({
  candidate: candidateDraftSchema,
  externalJobId: z.string().min(1).max(200),
  searchProjectId: z.string().optional(),
});

export const transferExecuteSchema = z.object({
  candidate: candidateDraftSchema,
  externalJobId: z.string().min(1).max(200),
  searchProjectId: z.string().optional(),
  reuseExternalCandidateId: z.string().optional(),
  createDespiteNameOnly: z.boolean().optional(),
  uploadResume: z.boolean().optional(),
  includeRecruiterNotes: z.boolean().optional(),
  confirmed: z.literal(true),
  confirmProcessingBasis: z.literal(true),
});

export const candidateSearchSchema = z.object({
  name: z.string().min(1).max(300),
  email: z.string().email().optional(),
  alternateEmails: z.array(z.string().email()).max(10).optional(),
  linkedInUrl: z.string().url().optional(),
  githubUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  orcidUrl: z.string().url().optional(),
});

export const stageChangeSchema = z.object({
  externalStageId: z.string().min(1).max(200),
  confirmed: z.literal(true),
});
