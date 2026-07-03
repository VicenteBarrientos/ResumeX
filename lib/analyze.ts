import OpenAI from "openai";
import { debugLog } from "@/lib/debug-log";
import { buildTokenUsage, logTokenUsage } from "@/lib/token-usage";
import type {
  AnalysisResult,
  ConcernLevel,
  CriteriaItem,
  RecommendedNextStep,
  StrongMatch,
  Suggestion,
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

const SYSTEM_PROMPT = `You are ResumeX, an expert recruiter and resume analyst.
Compare the candidate's resume against the job description and return structured JSON only.

Critical evidence rules:
- Never invent experience, skills, or accomplishments not supported by the resume.
- For every evidence field, quote or paraphrase only what appears in the resume.
- If support is missing, unclear, or only implied, set evidence to exactly: "Not found in resume."
- If met is false for a criterion, evidence must be "Not found in resume." unless partial support exists.

Field rules:
- matchScore: integer 0-100 reflecting overall fit
- summary: 2-3 sentences on overall alignment
- concernLevel: exactly one of "Low", "Medium", "High" (risk of mis-hire or red flags)
- recommendedNextStep: exactly one of "Reject", "Screen", "Interview", "Strongly recommend"
- mustHaveCriteria: 4-8 must-have requirements from the job; each with criterion, met (boolean), evidence
- niceToHaveCriteria: 3-6 nice-to-have requirements; each with criterion, met (boolean), evidence
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

function validateAnalysisResult(parsed: unknown): parsed is AnalysisResult {
  if (!parsed || typeof parsed !== "object") {
    return false;
  }

  const result = parsed as AnalysisResult;

  return (
    typeof result.matchScore === "number" &&
    typeof result.summary === "string" &&
    CONCERN_LEVELS.includes(result.concernLevel) &&
    RECOMMENDED_NEXT_STEPS.includes(result.recommendedNextStep) &&
    Array.isArray(result.mustHaveCriteria) &&
    result.mustHaveCriteria.every(isCriteriaItem) &&
    Array.isArray(result.niceToHaveCriteria) &&
    result.niceToHaveCriteria.every(isCriteriaItem) &&
    Array.isArray(result.strongMatches) &&
    result.strongMatches.every(isStrongMatch) &&
    isStringArray(result.strengths) &&
    isStringArray(result.gaps) &&
    isStringArray(result.matchedKeywords) &&
    isStringArray(result.missingKeywords) &&
    Array.isArray(result.suggestions) &&
    result.suggestions.every(isSuggestion) &&
    isStringArray(result.phoneScreenQuestions) &&
    result.phoneScreenQuestions.length === 5 &&
    isStringArray(result.clientFacingBullets) &&
    result.clientFacingBullets.length === 3 &&
    typeof result.sendoutBlurb === "string"
  );
}

export interface AnalyzeResumeResponse {
  result: AnalysisResult;
  usage: TokenUsage;
}

export async function analyzeResume(
  resume: string,
  jobDescription: string,
  apiKey: string,
): Promise<AnalyzeResumeResponse> {
  debugLog("[ResumeX] analyzeResume input lengths:", {
    resumeLength: resume.length,
    jobDescriptionLength: jobDescription.length,
  });

  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: ANALYSIS_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: JSON.stringify({
          resume,
          jobDescription,
          responseSchema: {
            matchScore: "number",
            summary: "string",
            concernLevel: "Low | Medium | High",
            recommendedNextStep:
              "Reject | Screen | Interview | Strongly recommend",
            mustHaveCriteria: [{ criterion: "string", met: "boolean", evidence: "string" }],
            niceToHaveCriteria: [{ criterion: "string", met: "boolean", evidence: "string" }],
            strongMatches: [{ match: "string", evidence: "string" }],
            strengths: "string[]",
            gaps: "string[]",
            matchedKeywords: "string[]",
            missingKeywords: "string[]",
            suggestions: [{ title: "string", detail: "string" }],
            phoneScreenQuestions: "string[5]",
            clientFacingBullets: "string[3]",
            sendoutBlurb: "string",
          },
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

  let parsed: AnalysisResult;

  try {
    parsed = JSON.parse(content) as AnalysisResult;
  } catch (error) {
    console.error("Failed to parse OpenAI JSON response.");
    debugLog("[ResumeX] analyzeResume response length:", content.length);
    throw error;
  }

  if (!validateAnalysisResult(parsed)) {
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
      matchScore: Math.min(100, Math.max(0, Math.round(parsed.matchScore))),
    },
    usage,
  };
}
