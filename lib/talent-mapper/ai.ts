import OpenAI from "openai";
import { getOpenAiApiKey } from "@/lib/env";
import { getDemoCriteria } from "./criteria";
import { buildSearchQueries } from "./query-builder";
import { parseSourcingCriteria, safeParseSourcingCriteria } from "./schemas";
import type {
  OutreachResult,
  OutreachTone,
  ResearcherCandidate,
  SearchQuery,
  SourcingCriteria,
} from "./types";

export const TALENT_MAPPER_MODEL = "gpt-4o-mini";

const EXTRACT_SYSTEM = `You extract recruiter sourcing criteria from a scientific job description.
Return JSON only matching this shape:
{
  "roleTitle": string,
  "roleSummary": string,
  "requiredTechniques": string[],
  "preferredTechniques": string[],
  "researchAreas": string[],
  "organismsOrSystems": string[],
  "adjacentTerms": string[],
  "senioritySignals": string[],
  "location": { "city"?: string, "region"?: string, "country"?: string, "remoteAllowed"?: boolean },
  "publicationYearFrom"?: number,
  "exclusions": string[],
  "recruiterNotes": string[]
}
Rules:
- Prefer concrete experimental techniques over soft skills.
- adjacentTerms should help scholarly search (synonyms, related methods).
- Do not invent protected characteristics or work authorization.
- Keep lists concise (typically 3–8 items each).
- publicationYearFrom defaults to a sensible recent year such as 2018 if not specified.`;

export async function extractSourcingCriteria(input: {
  jobDescription: string;
  roleTitle?: string;
}): Promise<{ criteria: SourcingCriteria; queries: SearchQuery[]; usedAi: boolean; warning?: string }> {
  const apiKey = getOpenAiApiKey();
  const fallback = () => {
    const base = getDemoCriteria();
    const criteria: SourcingCriteria = {
      ...base,
      roleTitle: input.roleTitle?.trim() || base.roleTitle,
      roleSummary: input.jobDescription.slice(0, 400),
    };
    // Heuristic: pull quoted / capitalized technique-like lines is too fragile;
    // return demo-shaped editable criteria seeded from JD title.
    return {
      criteria,
      queries: buildSearchQueries(criteria),
      usedAi: false,
      warning:
        "OpenAI is unavailable. Criteria were seeded from the scientific demo template — edit them before searching.",
    };
  };

  if (!apiKey) return fallback();

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: TALENT_MAPPER_MODEL,
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        { role: "system", content: EXTRACT_SYSTEM },
        {
          role: "user",
          content: `Role title hint: ${input.roleTitle || "(none)"}\n\nJob description:\n${input.jobDescription.slice(0, 8000)}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    if (input.roleTitle?.trim()) parsed.roleTitle = input.roleTitle.trim();
    const result = safeParseSourcingCriteria(parsed);
    if (!result.success) {
      return {
        ...fallback(),
        warning:
          "AI returned invalid criteria structure. Seeded editable demo criteria instead.",
      };
    }
    const criteria = parseSourcingCriteria(result.data);
    return {
      criteria,
      queries: buildSearchQueries(criteria),
      usedAi: true,
    };
  } catch {
    return fallback();
  }
}

export async function generateOutreach(input: {
  candidate: Pick<
    ResearcherCandidate,
    | "name"
    | "likelyInstitution"
    | "evidenceSummary"
    | "outreachAngle"
    | "matchedRequiredCriteria"
    | "relevantWorks"
  > & { authorId?: string };
  roleTitle: string;
  tone: OutreachTone;
}): Promise<OutreachResult> {
  const { candidate, roleTitle, tone } = input;
  const works = (candidate.relevantWorks || []).slice(0, 2);
  const techniques = (candidate.matchedRequiredCriteria || [])
    .slice(0, 2)
    .map((m) => m.criterion);

  const fallbackBody =
    tone === "conversational"
      ? `Hi ${candidate.name.split(" ")[0] || candidate.name} — I came across your work${
          works[0] ? ` on “${works[0].title}”` : ""
        } while mapping researchers with hands-on experience in ${
          techniques[0] || "experimental virology methods"
        }. I’m supporting a small research organization conducting empirical work at the intersection of advanced AI and experimental biology, and your public research evidence appeared potentially relevant. Would you be open to a brief conversation to learn more, even if the timing is not currently right?`
      : `Hi ${candidate.name.split(" ")[0] || candidate.name} — Your public work${
          works[0] ? ` (“${works[0].title}”${works[0].year ? `, ${works[0].year}` : ""})` : ""
        } suggests possible relevance to a ${roleTitle || "research scientist"} search focused on ${
          techniques.join(" and ") || "virology experimental methods"
        }. Would you be open to a short conversation? No pressure if timing is not right.`;

  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    return {
      subject: `Conversation about ${roleTitle || "a research role"}`,
      body: fallbackBody,
      tone,
      characterCount: fallbackBody.length,
    };
  }

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: TALENT_MAPPER_MODEL,
      response_format: { type: "json_object" },
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content: `Write personalized recruiter outreach based only on public research evidence.
Return JSON: {"subject": string, "body": string}
Tone: ${tone}.
Rules:
- Concise, low-pressure CTA.
- Reference 1–2 specific public works by title/year.
- Do not claim the person is qualified, available, or eligible.
- Do not invent private details or overstate the organization.
- No mass-email or manipulative language.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            name: candidate.name,
            institution: candidate.likelyInstitution?.name,
            roleTitle,
            evidenceSummary: candidate.evidenceSummary,
            outreachAngle: candidate.outreachAngle,
            techniques,
            works,
          }),
        },
      ],
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    const body =
      typeof parsed.body === "string" && parsed.body.trim()
        ? parsed.body.trim()
        : fallbackBody;
    const subject =
      typeof parsed.subject === "string" && parsed.subject.trim()
        ? parsed.subject.trim()
        : `Conversation about ${roleTitle || "a research role"}`;
    return { subject, body, tone, characterCount: body.length };
  } catch {
    return {
      subject: `Conversation about ${roleTitle || "a research role"}`,
      body: fallbackBody,
      tone,
      characterCount: fallbackBody.length,
    };
  }
}
