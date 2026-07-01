import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { jobDescription, company, role } = await req.json();

  if (!jobDescription?.trim()) {
    return NextResponse.json({ error: "Job description required." }, { status: 400 });
  }

  let profileContext = "";
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
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
  }

  const systemPrompt = profileContext
    ? `You are an expert cover letter writer. Write a professional, tailored cover letter using the candidate's profile below. Be specific, confident, and concise (3–4 paragraphs). Do not use placeholder brackets — use the real information provided.\n\nCandidate profile:\n${profileContext}`
    : `You are an expert cover letter writer. Write a professional, tailored cover letter based on the job description. Use "I" in first person. Keep it to 3–4 paragraphs. Be specific and confident.`;

  const userPrompt = `Job Description:\n${jobDescription.slice(0, 4000)}${company ? `\n\nCompany: ${company}` : ""}${role ? `\nRole: ${role}` : ""}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 800,
    temperature: 0.7,
  });

  const letter = completion.choices[0]?.message?.content ?? "";
  return NextResponse.json({ letter });
}
