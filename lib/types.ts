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

interface AnalysisBase {
  matchScore: number;
  summary: string;
  mustHaveCriteria: CriteriaItem[];
  niceToHaveCriteria: CriteriaItem[];
}

export interface CareerAnalysis extends AnalysisBase {
  strengths: string[];
  gaps: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: Suggestion[];
}

export interface TalentAssessment extends AnalysisBase {
  concernLevel: ConcernLevel;
  recommendedNextStep: RecommendedNextStep;
  strongMatches: StrongMatch[];
  phoneScreenQuestions: string[];
  clientFacingBullets: string[];
  sendoutBlurb: string;
}

/**
 * Legacy composite response returned while Career and Talent consumers migrate
 * to their audience-specific output.
 *
 * @deprecated Use CareerAnalysis or TalentAssessment.
 */
export type AnalysisResult = CareerAnalysis & TalentAssessment;

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

export interface ResumeContact {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  website: string;
}

export interface ExperienceEntry {
  company: string;
  role: string;
  location: string;
  dates: string;
  bullets: string[];
}

export interface EducationEntry {
  institution: string;
  degree: string;
  location: string;
  dates: string;
  details: string[];
}

export interface ProjectEntry {
  name: string;
  description: string;
  bullets: string[];
}

export interface CertificationEntry {
  name: string;
  issuer: string;
  date: string;
}

export interface FormattedResume {
  contact: ResumeContact;
  summary: string;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: string[];
  projects: ProjectEntry[];
  certifications: CertificationEntry[];
  languages: string[];
}

export interface FormatRequest {
  resume: string;
}

export interface FormatResponse {
  result?: FormattedResume;
  usage?: TokenUsage;
  error?: string;
}
