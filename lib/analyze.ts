import OpenAI from "openai";
import { debugLog } from "@/lib/debug-log";
import { buildTokenUsage, logTokenUsage } from "@/lib/token-usage";
import type {
  AnalysisResult,
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

const MISSING_EVIDENCE = "Not found in resume.";

const EVIDENCE_RULES = `Critical evidence rules:
- Never invent experience, skills, or accomplishments not supported by the resume.
- For every evidence field, quote or paraphrase only what appears in the resume.
- If support is missing, unclear, or only implied, set evidence to exactly: "Not found in resume."
- If met is false for a criterion, evidence must be "Not found in resume." unless partial support exists.`;

const SHARED_FIELD_RULES = `- matchScore: integer 0-100 reflecting overall fit
- mustHaveCriteria: 4-8 must-have requirements from the job; each with criterion, met (boolean), evidence
- niceToHaveCriteria: 3-6 nice-to-have requirements; each with criterion, met (boolean), evidence`;

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
- strongMatches: 3-5 areas of strong alignment; each with match (short label) and evidence from resume
- phoneScreenQuestions: exactly 5 targeted phone-screen questions based on gaps or validation needs
- clientFacingBullets: exactly 3 concise bullets suitable for a client submittal email
- sendoutBlurb: 1 short paragraph (2-4 sentences) for a recruiter sendout; factual, no hype

Be specific, honest, and decision-oriented.`;

/**
 * Legacy composite prompt kept until Career consumers migrate off AnalysisResult (T-2.5).
 * Prefer analyzeForCareer / assessForTalent for new call sites.
 */
const LEGACY_SYSTEM_PROMPT = `You are ResumeX, an expert recruiter and resume analyst.
Compare the candidate's resume against the job description and return structured JSON only.

${EVIDENCE_RULES}

Field rules:
${SHARED_FIELD_RULES}
- summary: 2-3 sentences on overall alignment
- concernLevel: exactly one of "Low", "Medium", "High" (risk of mis-hire or red flags)
- recommendedNextStep: exactly one of "Reject", "Screen", "Interview", "Strongly recommend"
- strongMatches: 3-5 areas of strong alignment; each with match (short label) and evidence from resume
- strengths: 3-5 resume strengths for this role
- gaps: 3-5 gaps or weaknesses relative to the job
- matchedKeywords: important job keywords/skills present in the resume
- missingKeywords: important job keywords/skills absent or weak in the resume
- suggestions: 3-5 actionable improvements with title and detail
- phoneScreenQuestions: exactly 5 targeted phone-screen questions based on gaps or validation needs
- clientFacingBullets: exactly 3 concise bullets suitable for a client submittal email
- sendoutBlurb: 1 short paragraph (2-4 sentences) for a recruiter sendout; factual, no hype

Be specific, honest, and constructive.`;

const CRITERIA_SCHEMA = [{ criterion: "string", met: "boolean", evidence: "string" }];

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
  strongMatches: [{ match: "string", evidence: "string" }],
  phoneScreenQuestions: "string[5]",
  clientFacingBullets: "string[3]",
  sendoutBlurb: "string",
};

const LEGACY_RESPONSE_SCHEMA = {
  ...CAREER_RESPONSE_SCHEMA,
  concernLevel: TALENT_RESPONSE_SCHEMA.concernLevel,
  recommendedNextStep: TALENT_RESPONSE_SCHEMA.recommendedNextStep,
  strongMatches: TALENT_RESPONSE_SCHEMA.strongMatches,
  phoneScreenQuestions: TALENT_RESPONSE_SCHEMA.phoneScreenQuestions,
  clientFacingBullets: TALENT_RESPONSE_SCHEMA.clientFacingBullets,
  sendoutBlurb: TALENT_RESPONSE_SCHEMA.sendoutBlurb,
};

function isCriteriaItem(value: unknown): value is CriteriaItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as CriteriaItem;
  return (
    typeof item.criterion === "string" &&
    typeof item.met === "boolean" &&
    typeof item.evidence === "string"
  );
}

function isStrongMatch(value: unknown): value is StrongMatch {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as StrongMatch;
  return typeof item.match === "string" && typeof item.evidence === "string";
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

interface AnalysisBaseShape {
  matchScore: number;
  summary: string;
  mustHaveCriteria: CriteriaItem[];
  niceToHaveCriteria: CriteriaItem[];
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

function validateAnalysisResult(parsed: unknown): parsed is AnalysisResult {
  return validateCareerAnalysis(parsed) && validateTalentAssessment(parsed);
}

function clampMatchScore(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)));
}

interface AnalysisRequestConfig<T> {
  label: string;
  resume: string;
  jobDescription: string;
  apiKey: string;
  systemPrompt: string;
  responseSchema: Record<string, unknown>;
  validate: (parsed: unknown) => parsed is T;
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
          missingEvidenceFallback: MISSING_EVIDENCE,
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

  return {
    result: {
      ...parsed,
      matchScore: clampMatchScore(parsed.matchScore),
    },
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

export interface AnalyzeResumeResponse {
  result: AnalysisResult;
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
  });
}

/**
 * Legacy composite analysis for `/api/analyze` until consumers migrate (T-2.5).
 * Prefer analyzeForCareer for Career surfaces.
 */
export async function analyzeResume(
  resume: string,
  jobDescription: string,
  apiKey: string,
): Promise<AnalyzeResumeResponse> {
  return runStructuredAnalysis({
    label: "analyzeResume",
    resume,
    jobDescription,
    apiKey,
    systemPrompt: LEGACY_SYSTEM_PROMPT,
    responseSchema: LEGACY_RESPONSE_SCHEMA,
    validate: validateAnalysisResult,
  });
}

/** Exported for characterization tests (T-2.4). */
export const ANALYSIS_PROMPTS = {
  career: CAREER_SYSTEM_PROMPT,
  talent: TALENT_SYSTEM_PROMPT,
  legacy: LEGACY_SYSTEM_PROMPT,
} as const;
