import OpenAI from "openai";
import type { CandidateProfile } from "@/lib/autoapply-types";
import { EMPTY_PROFILE } from "@/lib/merge-profile";
import { buildTokenUsage, logTokenUsage } from "@/lib/token-usage";
import type { TokenUsage } from "@/lib/types";

export const PARSE_PROFILE_MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `You are ResumeX, an expert resume parser for job applications.
Extract structured candidate profile data from the resume text. Return JSON only.

Rules:
- Only include information explicitly present or clearly inferable from the resume (e.g. current role from most recent job).
- Never invent employers, degrees, emails, or skills not supported by the resume.
- For missing fields use empty strings, 0, false, or empty arrays as appropriate.
- skills: flat list of technical and professional skills mentioned in the resume.
- target.roles: infer 1-3 suitable job titles from experience (e.g. "Software Engineer").
- experience.summary: 2-4 sentence professional summary based on the resume.
- experience.totalYears: estimate total years of professional experience as an integer.
- coverLetterTemplate: if enough context exists, write a brief 2-3 sentence template using {role}, {company}, {years}, {skills} placeholders; otherwise empty string.
- workAuthorization: only fill if visa/sponsorship/citizenship is mentioned; otherwise leave empty and requiresSponsorship false.
- target.remote and willingToRelocate: true only if resume suggests openness; default false if unknown.
- target.salaryMin/Max: only if salary expectations appear; otherwise 0.`;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function normalizeProfile(raw: Record<string, unknown>): CandidateProfile {
  const personal = (raw.personal ?? {}) as Record<string, unknown>;
  const target = (raw.target ?? {}) as Record<string, unknown>;
  const experience = (raw.experience ?? {}) as Record<string, unknown>;
  const workAuthorization = (raw.workAuthorization ?? {}) as Record<string, unknown>;

  return {
    personal: {
      firstName: String(personal.firstName ?? ""),
      lastName: String(personal.lastName ?? ""),
      email: String(personal.email ?? ""),
      phone: String(personal.phone ?? ""),
      location: String(personal.location ?? ""),
      linkedinUrl: String(personal.linkedinUrl ?? ""),
      githubUrl: String(personal.githubUrl ?? ""),
    },
    target: {
      roles: isStringArray(target.roles) ? target.roles : [],
      salaryMin: Number(target.salaryMin) || 0,
      salaryMax: Number(target.salaryMax) || 0,
      currency: String(target.currency ?? "USD"),
      remote: Boolean(target.remote),
      willingToRelocate: Boolean(target.willingToRelocate),
      startAvailability: String(target.startAvailability ?? "2 weeks"),
    },
    experience: {
      totalYears: Math.max(0, Math.round(Number(experience.totalYears) || 0)),
      currentTitle: String(experience.currentTitle ?? ""),
      currentCompany: String(experience.currentCompany ?? ""),
      summary: String(experience.summary ?? ""),
    },
    skills: isStringArray(raw.skills) ? raw.skills : [],
    workAuthorization: {
      country: String(workAuthorization.country ?? ""),
      status: String(workAuthorization.status ?? ""),
      requiresSponsorship: Boolean(workAuthorization.requiresSponsorship),
    },
    coverLetterTemplate: String(raw.coverLetterTemplate ?? ""),
  };
}

function validateProfile(profile: CandidateProfile): boolean {
  return (
    typeof profile.personal === "object" &&
    typeof profile.target === "object" &&
    typeof profile.experience === "object" &&
    Array.isArray(profile.skills) &&
    typeof profile.workAuthorization === "object"
  );
}

export interface ParseProfileResponse {
  profile: CandidateProfile;
  usage: TokenUsage;
}

export async function parseProfileFromResume(
  resume: string,
  apiKey: string
): Promise<ParseProfileResponse> {
  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: PARSE_PROFILE_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: JSON.stringify({
          resume,
          responseSchema: {
            personal: {
              firstName: "string",
              lastName: "string",
              email: "string",
              phone: "string",
              location: "string",
              linkedinUrl: "string",
              githubUrl: "string",
            },
            target: {
              roles: "string[]",
              salaryMin: "number",
              salaryMax: "number",
              currency: "string",
              remote: "boolean",
              willingToRelocate: "boolean",
              startAvailability: "string",
            },
            experience: {
              totalYears: "number",
              currentTitle: "string",
              currentCompany: "string",
              summary: "string",
            },
            skills: "string[]",
            workAuthorization: {
              country: "string",
              status: "string",
              requiresSponsorship: "boolean",
            },
            coverLetterTemplate: "string",
          },
        }),
      },
    ],
    temperature: 0.2,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("NO_PROFILE");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new Error("MALFORMED_PROFILE");
  }

  const profile = normalizeProfile(parsed);
  if (!validateProfile(profile)) {
    throw new Error("MALFORMED_PROFILE");
  }

  const usage = buildTokenUsage(
    PARSE_PROFILE_MODEL,
    completion.usage?.prompt_tokens ?? 0,
    completion.usage?.completion_tokens ?? 0
  );
  logTokenUsage(PARSE_PROFILE_MODEL, usage);

  return { profile: { ...EMPTY_PROFILE, ...profile }, usage };
}
