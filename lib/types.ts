export interface Suggestion {
  title: string;
  detail: string;
}

export type ConcernLevel = "Low" | "Medium" | "High";

export type RecommendedNextStep =
  | "Reject"
  | "Screen"
  | "Interview"
  | "Strongly recommend";

export interface CriteriaItem {
  criterion: string;
  met: boolean;
  evidence: string;
}

export interface StrongMatch {
  match: string;
  evidence: string;
}

export interface AnalysisResult {
  matchScore: number;
  summary: string;
  concernLevel: ConcernLevel;
  recommendedNextStep: RecommendedNextStep;
  mustHaveCriteria: CriteriaItem[];
  niceToHaveCriteria: CriteriaItem[];
  strongMatches: StrongMatch[];
  strengths: string[];
  gaps: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: Suggestion[];
  phoneScreenQuestions: string[];
  clientFacingBullets: string[];
  sendoutBlurb: string;
}

export interface AnalyzeRequest {
  resume: string;
  jobDescription: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface AnalyzeResponse {
  result?: AnalysisResult;
  usage?: TokenUsage;
  error?: string;
}
