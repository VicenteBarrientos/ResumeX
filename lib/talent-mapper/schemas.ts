import { z } from "zod";
import type {
  SearchMode,
  SearchQuery,
  SourcingCriteria,
} from "@/lib/talent-mapper/types";

export const locationCriteriaSchema = z.object({
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  remoteAllowed: z.boolean().optional(),
});

export const sourcingCriteriaSchema = z.object({
  roleTitle: z.string().min(1, "Role title is required"),
  roleSummary: z.string().default(""),
  requiredTechniques: z.array(z.string()).default([]),
  preferredTechniques: z.array(z.string()).default([]),
  researchAreas: z.array(z.string()).default([]),
  organismsOrSystems: z.array(z.string()).default([]),
  adjacentTerms: z.array(z.string()).default([]),
  senioritySignals: z.array(z.string()).default([]),
  location: locationCriteriaSchema.default({}),
  publicationYearFrom: z.number().int().optional(),
  exclusions: z.array(z.string()).default([]),
  recruiterNotes: z.array(z.string()).default([]),
});

export const searchQuerySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  group: z.enum(["core", "adjacent"]),
  query: z.string().min(1),
  enabled: z.boolean(),
});

export const searchModeSchema = z.enum(["live", "demo"]);

export const extractCriteriaRequestSchema = z.object({
  jobDescription: z.string().min(1, "Job description is required"),
  roleTitle: z.string().optional(),
});

export const extractCriteriaResponseSchema = z.object({
  criteria: sourcingCriteriaSchema,
  warnings: z.array(z.string()).default([]),
});

export const searchRequestSchema = z.object({
  criteria: sourcingCriteriaSchema,
  queries: z.array(searchQuerySchema).min(1, "At least one query is required"),
  mode: searchModeSchema.default("live"),
  perPage: z.number().int().min(1).max(100).optional(),
});

export const scoreBreakdownSchema = z.object({
  requiredTechniques: z.number(),
  researchArea: z.number(),
  recency: z.number(),
  repeatedEvidence: z.number(),
  geography: z.number(),
  seniority: z.number(),
  total: z.number(),
});

export const evidenceMatchSchema = z.object({
  criterion: z.string(),
  matchType: z.enum(["exact", "adjacent", "inferred"]),
  workTitle: z.string(),
  year: z.number().optional(),
  snippet: z.string(),
  doi: z.string().optional(),
  openAlexUrl: z.string().optional(),
  confidence: z.enum(["direct", "strong_adjacent", "possible"]),
  workId: z.string(),
});

export const relevantWorkSchema = z.object({
  id: z.string(),
  title: z.string(),
  year: z.number().optional(),
  doi: z.string().optional(),
  openAlexUrl: z.string().optional(),
  citedByCount: z.number().optional(),
  sourceName: z.string().optional(),
  abstractSnippet: z.string().optional(),
  isRetracted: z.boolean().optional(),
  matchedCriteria: z.array(z.string()),
});

export const likelyInstitutionSchema = z.object({
  name: z.string(),
  id: z.string().optional(),
  countryCode: z.string().optional(),
  type: z.string().optional(),
});

export const researcherCandidateSchema = z.object({
  authorId: z.string(),
  name: z.string(),
  orcid: z.string().optional(),
  openAlexUrl: z.string(),
  likelyInstitution: likelyInstitutionSchema.optional(),
  relevantWorks: z.array(relevantWorkSchema),
  matchedRequiredCriteria: z.array(evidenceMatchSchema),
  matchedPreferredCriteria: z.array(evidenceMatchSchema),
  matchedResearchAreas: z.array(evidenceMatchSchema),
  matchedOrganismsOrSystems: z.array(evidenceMatchSchema),
  publicationYears: z.array(z.number()),
  mostRecentRelevantYear: z.number().optional(),
  relevantWorkCount: z.number(),
  totalCitationCountForRelevantWorks: z.number(),
  score: z.number(),
  scoreBreakdown: scoreBreakdownSchema,
  evidenceSummary: z.string(),
  outreachAngle: z.string(),
  possibleConcerns: z.array(z.string()),
  unknowns: z.array(z.string()),
  screeningQuestions: z.array(z.string()).optional(),
});

export const searchResultSchema = z.object({
  candidates: z.array(researcherCandidateSchema),
  worksReviewed: z.number(),
  queriesUsed: z.array(searchQuerySchema),
  searchedAt: z.string(),
  mode: searchModeSchema,
  roleTitle: z.string(),
  warnings: z.array(z.string()),
});

export const outreachToneSchema = z.enum(["concise", "conversational"]);

export const outreachRequestSchema = z.object({
  candidate: researcherCandidateSchema.partial().extend({
    name: z.string(),
    authorId: z.string(),
  }),
  criteria: sourcingCriteriaSchema.optional(),
  roleTitle: z.string().default(""),
  tone: outreachToneSchema.default("concise"),
  organizationContext: z.string().optional(),
});

export const outreachResponseSchema = z.object({
  subject: z.string().optional(),
  body: z.string().min(1),
  tone: outreachToneSchema,
  referencedWorks: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});

export type ExtractCriteriaRequest = z.infer<typeof extractCriteriaRequestSchema>;
export type ExtractCriteriaResponse = z.infer<typeof extractCriteriaResponseSchema>;
export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type OutreachRequest = z.infer<typeof outreachRequestSchema>;
export type OutreachResponse = z.infer<typeof outreachResponseSchema>;

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "input";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

export function parseSourcingCriteria(input: unknown): SourcingCriteria {
  const result = sourcingCriteriaSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid sourcing criteria: ${formatZodError(result.error)}`);
  }
  return result.data;
}

export function safeParseSourcingCriteria(input: unknown) {
  return sourcingCriteriaSchema.safeParse(input);
}

export function parseSearchQueries(input: unknown): SearchQuery[] {
  const result = z.array(searchQuerySchema).safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid search queries: ${formatZodError(result.error)}`);
  }
  return result.data;
}

export function parseExtractCriteriaRequest(input: unknown): ExtractCriteriaRequest {
  const result = extractCriteriaRequestSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid extract request: ${formatZodError(result.error)}`);
  }
  return result.data;
}

export function parseExtractCriteriaResponse(input: unknown): ExtractCriteriaResponse {
  const result = extractCriteriaResponseSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid extract response: ${formatZodError(result.error)}`);
  }
  return result.data;
}

export function parseSearchRequest(input: unknown): SearchRequest {
  const result = searchRequestSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid search request: ${formatZodError(result.error)}`);
  }
  return result.data;
}

export function parseSearchResult(input: unknown) {
  const result = searchResultSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid search result: ${formatZodError(result.error)}`);
  }
  return result.data;
}

export function parseOutreachRequest(input: unknown): OutreachRequest {
  const result = outreachRequestSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid outreach request: ${formatZodError(result.error)}`);
  }
  return result.data;
}

export function parseOutreachResponse(input: unknown): OutreachResponse {
  const result = outreachResponseSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid outreach response: ${formatZodError(result.error)}`);
  }
  return result.data;
}

export function parseSearchMode(input: unknown): SearchMode {
  const result = searchModeSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid search mode: ${formatZodError(result.error)}`);
  }
  return result.data;
}
