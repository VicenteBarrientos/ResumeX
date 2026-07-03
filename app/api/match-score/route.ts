import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { getOpenAiApiKey } from "@/lib/env";
import { getUserIdFromBearer } from "@/lib/extension-auth";
import OpenAI from "openai";

function getOpenAI() {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for match scoring.");
  }

  return new OpenAI({ apiKey });
}

export async function POST(req: Request) {
  const { jobDescription, jobTitle, company } = await req.json();

  if (!jobDescription?.trim()) {
    return NextResponse.json({ score: null, error: "No job description provided." });
  }

  const userId = (await getUserIdFromBearer(req)) ?? (await getServerSession(authOptions))?.user?.id;
  if (!userId) {
    return NextResponse.json({ score: null, error: "Sign in to get match scores." });
  }

  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile?.resumeText) {
    return NextResponse.json({ score: null, error: "Upload your resume first." });
  }

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a recruiter. Given a candidate's resume and a job description, return a JSON object with:
- score: number 0-100 (how well the candidate matches)
- verdict: string "Strong Match" | "Good Match" | "Partial Match" | "Weak Match"
- topGap: string (the single most important missing skill or experience, max 8 words)
Respond ONLY with valid JSON, no markdown.`,
        },
        {
          role: "user",
          content: `Job: ${jobTitle ?? ""}${company ? ` at ${company}` : ""}\n\nJob Description:\n${jobDescription.slice(0, 3000)}\n\nCandidate Resume:\n${profile.resumeText!.slice(0, 3000)}`,
        },
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const result = JSON.parse(raw);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ score: null, error: "Analysis failed." });
  }
}
