import OpenAI from "openai";
import {
  normalizeCareerEvidence,
  normalizeTalentEvidence,
  isCriterionStatus,
} from "@/lib/criteria-evidence";
import { debugLog } from "@/lib/debug-log";
import { buildTokenUsage, logTokenUsage } from "@/lib/token-usage";
import type {
  CareerAnalysis,
  ConcernLevel,
  CriteriaItem,
  RecommendedNextStep,
  StrongMatch,
  Suggestion,
  TalentAssessment,
  TokenUsage,
} from "@/lib/types";

export const ANALYSIS_MODEL = "gpt-4o-mini";

const CONCERN_LEVELS: ConcernLevel[] = ["Low", "Medium", "High"];
const RECOMMENDED_NEXT_STEPS: RecommendedNextStep[] = [
  "Reject",
  "Screen",
  "Interview",
  "Strongly recommend",
];

const EVIDENCE_RULES = `Critical evidence rules (provenance required):
- Never invent experience, skills, or accomplishments not supported by the resume.
- For every criterion, set status to exactly one of: "met", "not_met", "insufficient".
  - "met": the resume clearly supports the criterion.
  - "not_met": the resume contradicts the criterion or falls short (e.g. years below the requirement).
  - "insufficient": the resume does not address the criterion at all.
- quote must be a verbatim substring copied from the resume. Never paraphrase inside quote.
- When status is "insufficient", quote must be exactly "".
- When status is "met" or "not_met", quote should be the best supporting or contradicting verbatim excerpt; if you cannot find one, use status "insufficient" and quote "".
- aiInferred: true only when the verdict is implied rather than stated explicitly; the quote must still be verbatim when non-empty.
- Do not use the phrase "Not found in resume." — use status "insufficient" with an empty quote instead.
- Strong matches (Talent only): each needs a short label and a verbatim quote from the resume.`;

const SHARED_FIELD_RULES = `- matchScore: integer 0-100 reflecting overall fit
- mustHaveCriteria: 4-8 must-have requirements from the job; each with criterion, status, quote, aiInferred
- niceToHaveCriteria: 3-6 nice-to-have requirements; each with criterion, status, quote, aiInferred`;

const CAREER_SYSTEM_PROMPT = `You are ResumeX Career, an expert resume coach helping a job seeker improve their fit for a role.
Compare the candidate's resume against the job description and return structured JSON only.

${EVIDENCE_RULES}

Audience: the candidate. Write for someone who can still improve before applying.

Field rules:
${SHARED_FIELD_RULES}
- summary: 2-3 sentences for the candidate — what is already strong, what is missing, and what to fix first. Do not recommend Reject/Screen/Interview decisions about the person.
- strengths: 3-5 resume strengths for this role
- gaps: 3-5 gaps or weaknesses relative to the job
- matchedKeywords: important job keywords/skills present in the resume
- missingKeywords: important job keywords/skills absent or weak in the resume
- suggestions: 3-5 actionable improvements with title and detail

Be specific, honest, and constructive.`;

const TALENT_SYSTEM_PROMPT = `You are ResumeX Talent, an expert recruiter assessing whether to advance a candidate.
Compare the candidate's resume against the job description and return structured JSON only.

${EVIDENCE_RULES}

Audience: a recruiter or hiring manager who must decide next steps. Write for decision risk, not personal coaching.

Field rules:
${SHARED_FIELD_RULES}
- summary: 2-3 sentences for the recruiter — what risk they assume by advancing, and what to validate next to reduce that risk. Do not write coaching advice for the candidate.
- concernLevel: exactly one of "Low", "Medium", "High" (risk of mis-hire or red flags)
- recommendedNextStep: exactly one of "Reject", "Screen", "Interview", "Strongly recommend"
- strongMatches: 3-5 areas of strong alignment; each with match (short label), quote (verbatim from resume), aiInferred
- phoneScreenQuestions: exactly 5 targeted phone-screen questions based on gaps or validation needs
- clientFacingBullets: exactly 3 concise bullets suitable for a client submittal email
- sendoutBlurb: 1 short paragraph (2-4 sentences) for a recruiter sendout; factual, no hype

Be specific, honest, and decision-oriented.`;

const CRITERIA_SCHEMA = [
  {
    criterion: "string",
    status: "met | not_met | insufficient",
    quote: "string (verbatim resume excerpt, or empty)",
    aiInferred: "boolean",
  },
];

const CAREER_RESPONSE_SCHEMA = {
  matchScore: "number",
  summary: "string",
  mustHaveCriteria: CRITERIA_SCHEMA,
  niceToHaveCriteria: CRITERIA_SCHEMA,
  strengths: "string[]",
  gaps: "string[]",
  matchedKeywords: "string[]",
  missingKeywords: "string[]",
  suggestions: [{ title: "string", detail: "string" }],
};

const TALENT_RESPONSE_SCHEMA = {
  matchScore: "number",
  summary: "string",
  concernLevel: "Low | Medium | High",
  recommendedNextStep: "Reject | Screen | Interview | Strongly recommend",
  mustHaveCriteria: CRITERIA_SCHEMA,
  niceToHaveCriteria: CRITERIA_SCHEMA,
  strongMatches: [
    { match: "string", quote: "string", aiInferred: "boolean" },
  ],
  phoneScreenQuestions: "string[5]",
  clientFacingBullets: "string[3]",
  sendoutBlurb: "string",
};

function isCriteriaItem(value: unknown): value is CriteriaItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as CriteriaItem;
  return (
    typeof item.criterion === "string" &&
    isCriterionStatus(item.status) &&
    typeof item.quote === "string" &&
    typeof item.aiInferred === "boolean"
  );
}

function isStrongMatch(value: unknown): value is StrongMatch {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as StrongMatch;
  return (
    typeof item.match === "string" &&
    typeof item.quote === "string" &&
    typeof item.aiInferred === "boolean"
  );
}

function isSuggestion(value: unknown): value is Suggestion {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Suggestion;
  return typeof item.title === "string" && typeof item.detail === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

interface AnalysisBaseShape {
  matchScore: number;
  summary: string;
  mustHaveCriteria: CriteriaItem[];
  niceToHaveCriteria: CriteriaItem[];
}

function hasAnalysisBase(value: object): boolean {
  const result = value as AnalysisBaseShape;

  return (
    typeof result.matchScore === "number" &&
    typeof result.summary === "string" &&
    Array.isArray(result.mustHaveCriteria) &&
    result.mustHaveCriteria.every(isCriteriaItem) &&
    Array.isArray(result.niceToHaveCriteria) &&
    result.niceToHaveCriteria.every(isCriteriaItem)
  );
}

export function validateCareerAnalysis(parsed: unknown): parsed is CareerAnalysis {
  if (!parsed || typeof parsed !== "object" || !hasAnalysisBase(parsed)) {
    return false;
  }

  const result = parsed as CareerAnalysis;

  return (
    isStringArray(result.strengths) &&
    isStringArray(result.gaps) &&
    isStringArray(result.matchedKeywords) &&
    isStringArray(result.missingKeywords) &&
    Array.isArray(result.suggestions) &&
    result.suggestions.every(isSuggestion)
  );
}

export function validateTalentAssessment(parsed: unknown): parsed is TalentAssessment {
  if (!parsed || typeof parsed !== "object" || !hasAnalysisBase(parsed)) {
    return false;
  }

  const result = parsed as TalentAssessment;

  return (
    CONCERN_LEVELS.includes(result.concernLevel) &&
    RECOMMENDED_NEXT_STEPS.includes(result.recommendedNextStep) &&
    Array.isArray(result.strongMatches) &&
    result.strongMatches.every(isStrongMatch) &&
    isStringArray(result.phoneScreenQuestions) &&
    result.phoneScreenQuestions.length === 5 &&
    isStringArray(result.clientFacingBullets) &&
    result.clientFacingBullets.length === 3 &&
    typeof result.sendoutBlurb === "string"
  );
}

function clampMatchScore(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)));
}

interface AnalysisRequestConfig<T extends { matchScore: number }> {
  label: string;
  resume: string;
  jobDescription: string;
  apiKey: string;
  systemPrompt: string;
  responseSchema: Record<string, unknown>;
  validate: (parsed: unknown) => parsed is T;
  normalize: (result: T, resume: string) => T;
}

async function runStructuredAnalysis<T extends { matchScore: number }>(
  config: AnalysisRequestConfig<T>,
): Promise<{ result: T; usage: TokenUsage }> {
  debugLog(`[ResumeX] ${config.label} input lengths:`, {
    resumeLength: config.resume.length,
    jobDescriptionLength: config.jobDescription.length,
  });

  const openai = new OpenAI({ apiKey: config.apiKey });

  const completion = await openai.chat.completions.create({
    model: ANALYSIS_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: config.systemPrompt },
      {
        role: "user",
        content: JSON.stringify({
          resume: config.resume,
          jobDescription: config.jobDescription,
          responseSchema: config.responseSchema,
        }),
      },
    ],
    temperature: 0.3,
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("NO_ANALYSIS");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    console.error("Failed to parse OpenAI JSON response.");
    debugLog(`[ResumeX] ${config.label} response length:`, content.length);
    throw error;
  }

  if (!config.validate(parsed)) {
    throw new Error("MALFORMED_ANALYSIS");
  }

  const usage = buildTokenUsage(
    ANALYSIS_MODEL,
    completion.usage?.prompt_tokens ?? 0,
    completion.usage?.completion_tokens ?? 0,
  );

  logTokenUsage(ANALYSIS_MODEL, usage);

  const withScore = {
    ...parsed,
    matchScore: clampMatchScore(parsed.matchScore),
  };

  return {
    result: config.normalize(withScore, config.resume),
    usage,
  };
}

export interface AnalyzeForCareerResponse {
  result: CareerAnalysis;
  usage: TokenUsage;
}

export interface AssessForTalentResponse {
  result: TalentAssessment;
  usage: TokenUsage;
}

export async function analyzeForCareer(
  resume: string,
  jobDescription: string,
  apiKey: string,
): Promise<AnalyzeForCareerResponse> {
  return runStructuredAnalysis({
    label: "analyzeForCareer",
    resume,
    jobDescription,
    apiKey,
    systemPrompt: CAREER_SYSTEM_PROMPT,
    responseSchema: CAREER_RESPONSE_SCHEMA,
    validate: validateCareerAnalysis,
    normalize: normalizeCareerEvidence,
  });
}

export async function assessForTalent(
  resume: string,
  jobDescription: string,
  apiKey: string,
): Promise<AssessForTalentResponse> {
  return runStructuredAnalysis({
    label: "assessForTalent",
    resume,
    jobDescription,
    apiKey,
    systemPrompt: TALENT_SYSTEM_PROMPT,
    responseSchema: TALENT_RESPONSE_SCHEMA,
    validate: validateTalentAssessment,
    normalize: normalizeTalentEvidence,
  });
}

/** Exported for characterization tests (T-2.4). */
export const ANALYSIS_PROMPTS = {
  career: CAREER_SYSTEM_PROMPT,
  talent: TALENT_SYSTEM_PROMPT,
} as const;
