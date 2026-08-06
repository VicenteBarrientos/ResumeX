import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { apiError } from "@/lib/api/response";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import {
  getDemoCoverLetter,
  isCareerDemoJobDescription,
} from "@/lib/demo-career";
import {
  assertCoverLetterEntitlement,
  recordUsage,
} from "@/lib/entitlements";
import { getOpenAiApiKey } from "@/lib/env";
import { quotaDenialResponse } from "@/lib/quota";
import { buildTokenUsage } from "@/lib/token-usage";
import OpenAI from "openai";

function getOpenAI() {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for cover letter generation.");
  }

  return new OpenAI({ apiKey });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return apiError("Unauthorized", { status: 401 });
  }

  const { jobDescription, company, role } = await req.json();

  if (!jobDescription?.trim()) {
    return apiError("Job description required.", { status: 400 });
  }

  // Deterministic Try-demo JD: no OpenAI, no free-tier burn.
  if (isCareerDemoJobDescription(jobDescription)) {
    return NextResponse.json({
      letter: getDemoCoverLetter(
        typeof company === "string" ? company : undefined,
        typeof role === "string" ? role : undefined,
      ),
    });
  }

  const denial = await assertCoverLetterEntitlement(session.user.id);
  if (denial) return quotaDenialResponse(denial);

  let profileContext = "";
  const profile = await db.profile.findUnique({ where: { userId: session.user.id } });
  if (profile) {
    const parts: string[] = [];
    if (profile.fullName) parts.push(`Name: ${profile.fullName}`);
    if (profile.email) parts.push(`Email: ${profile.email}`);
    if (profile.location) parts.push(`Location: ${profile.location}`);
    if (profile.linkedinUrl) parts.push(`LinkedIn: ${profile.linkedinUrl}`);
    if (profile.resumeText) parts.push(`\nResume:\n${profile.resumeText.slice(0, 3000)}`);
    profileContext = parts.join("\n");
  }

  const systemPrompt = profileContext
    ? `You are an expert cover letter writer. Write a professional, tailored cover letter using the candidate's profile below. Be specific, confident, and concise (3–4 paragraphs). Do not use placeholder brackets — use the real information provided.\n\nCandidate profile:\n${profileContext}`
    : `You are an expert cover letter writer. Write a professional, tailored cover letter based on the job description. Use "I" in first person. Keep it to 3–4 paragraphs. Be specific and confident.`;

  const userPrompt = `Job Description:\n${jobDescription.slice(0, 4000)}${company ? `\n\nCompany: ${company}` : ""}${role ? `\nRole: ${role}` : ""}`;

  try {
    const model = "gpt-4o-mini";
    const completion = await getOpenAI().chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const letter = completion.choices[0]?.message?.content ?? "";
    const usage = buildTokenUsage(
      model,
      completion.usage?.prompt_tokens ?? 0,
      completion.usage?.completion_tokens ?? 0,
    );
    await recordUsage(session.user.id, "cover_letter", usage.estimatedCostUsd);
    return NextResponse.json({ letter });
  } catch {
    return apiError("Cover letter generation failed.", { status: 500 });
  }
}
