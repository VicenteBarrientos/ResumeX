import OpenAI from "openai";
import { buildTokenUsage, logTokenUsage } from "@/lib/token-usage";
import type {
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  FormattedResume,
  ProjectEntry,
  ResumeContact,
  TokenUsage,
} from "@/lib/types";

export const FORMAT_MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `You are ResumeX Formatter, an expert resume editor.
Your job is to take a candidate's raw resume text and reorganize it into a clean, professional, ATS-friendly structure returned as JSON only.

CRITICAL ACCURACY RULES:
- Preserve original facts exactly. Never invent experience, employers, job titles, degrees, schools, dates, certifications, projects, or skills.
- Do not embellish, exaggerate, or add metrics that are not present in the source.
- If information for a field is missing, leave it as an empty string "" (or an empty array for lists). Never guess or hallucinate.
- You may lightly rephrase existing bullet points for clarity and consistency, but keep their factual meaning identical.
- Convert responsibilities into concise, action-oriented bullet points only when the source already supports them.

FIELD RULES:
- contact.name: the candidate's full name (empty string if not found)
- contact.title: a short professional title/headline only if present or clearly stated; otherwise ""
- contact.email, contact.phone, contact.location, contact.linkedin, contact.website: only if present, else ""
- summary: a 2-4 sentence professional summary. Use the candidate's existing summary if present; otherwise compose a faithful summary strictly from facts in the resume. If there is not enough information, return "".
- experience: array, most recent first. Each entry: company, role, location (or ""), dates (e.g. "Mar 2021 – Present", or ""), bullets (string[] of accomplishments/responsibilities).
- education: array. Each entry: institution, degree, location (or ""), dates (or ""), details (string[] for honors/GPA/coursework if present, else []).
- skills: string[] of individual skills (deduplicated, concise). [] if none.
- projects: array. Each entry: name, description (or ""), bullets (string[] or []). [] if none.
- certifications: array. Each entry: name, issuer (or ""), date (or ""). [] if none.
- languages: string[] of spoken/written languages. [] if none.

Return ONLY valid JSON matching the provided schema. Omit nothing from the schema; use "" or [] for anything missing.`;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeContact(value: unknown): ResumeContact {
  const contact = (value ?? {}) as Record<string, unknown>;
  return {
    name: asString(contact.name),
    title: asString(contact.title),
    email: asString(contact.email),
    phone: asString(contact.phone),
    location: asString(contact.location),
    linkedin: asString(contact.linkedin),
    website: asString(contact.website),
  };
}

function normalizeExperience(value: unknown): ExperienceEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((raw) => {
    const entry = (raw ?? {}) as Record<string, unknown>;
    return {
      company: asString(entry.company),
      role: asString(entry.role),
      location: asString(entry.location),
      dates: asString(entry.dates),
      bullets: asStringArray(entry.bullets),
    };
  });
}

function normalizeEducation(value: unknown): EducationEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((raw) => {
    const entry = (raw ?? {}) as Record<string, unknown>;
    return {
      institution: asString(entry.institution),
      degree: asString(entry.degree),
      location: asString(entry.location),
      dates: asString(entry.dates),
      details: asStringArray(entry.details),
    };
  });
}

function normalizeProjects(value: unknown): ProjectEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((raw) => {
    const entry = (raw ?? {}) as Record<string, unknown>;
    return {
      name: asString(entry.name),
      description: asString(entry.description),
      bullets: asStringArray(entry.bullets),
    };
  });
}

function normalizeCertifications(value: unknown): CertificationEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((raw) => {
    const entry = (raw ?? {}) as Record<string, unknown>;
    return {
      name: asString(entry.name),
      issuer: asString(entry.issuer),
      date: asString(entry.date),
    };
  });
}

function normalizeFormattedResume(parsed: unknown): FormattedResume {
  const data = (parsed ?? {}) as Record<string, unknown>;

  return {
    contact: normalizeContact(data.contact),
    summary: asString(data.summary),
    experience: normalizeExperience(data.experience),
    education: normalizeEducation(data.education),
    skills: asStringArray(data.skills),
    projects: normalizeProjects(data.projects),
    certifications: normalizeCertifications(data.certifications),
    languages: asStringArray(data.languages),
  };
}

export interface FormatResumeResponse {
  result: FormattedResume;
  usage: TokenUsage;
}

const isDev = process.env.NODE_ENV === "development";

export async function formatResume(
  resume: string,
  apiKey: string,
): Promise<FormatResumeResponse> {
  if (isDev) {
    console.log("[ResumeX] formatResume — OpenAI input (first 600 chars):");
    console.log(resume.slice(0, 600));
    console.log("[ResumeX] formatResume — total input length:", resume.length);
  }

  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: FORMAT_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: JSON.stringify({
          resume,
          responseSchema: {
            contact: {
              name: "string",
              title: "string",
              email: "string",
              phone: "string",
              location: "string",
              linkedin: "string",
              website: "string",
            },
            summary: "string",
            experience: [
              {
                company: "string",
                role: "string",
                location: "string",
                dates: "string",
                bullets: "string[]",
              },
            ],
            education: [
              {
                institution: "string",
                degree: "string",
                location: "string",
                dates: "string",
                details: "string[]",
              },
            ],
            skills: "string[]",
            projects: [
              { name: "string", description: "string", bullets: "string[]" },
            ],
            certifications: [
              { name: "string", issuer: "string", date: "string" },
            ],
            languages: "string[]",
          },
        }),
      },
    ],
    temperature: 0.2,
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("NO_ANALYSIS");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    console.error("Failed to parse OpenAI JSON response:", content);
    throw error;
  }

  const result = normalizeFormattedResume(parsed);

  if (!result.contact.name && result.experience.length === 0) {
    throw new Error("MALFORMED_ANALYSIS");
  }

  const usage = buildTokenUsage(
    FORMAT_MODEL,
    completion.usage?.prompt_tokens ?? 0,
    completion.usage?.completion_tokens ?? 0,
  );

  logTokenUsage(FORMAT_MODEL, usage);

  if (isDev) {
    console.log("[ResumeX] formatResume — OpenAI output (first 600 chars):");
    console.log(content.slice(0, 600));
  }

  return { result, usage };
}
