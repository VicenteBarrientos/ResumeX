import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getOpenAiApiKey } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function POST(req: Request) {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) return NextResponse.json({ company: "", role: "" });

  const { jobDescription } = await req.json();
  if (!jobDescription?.trim()) return NextResponse.json({ company: "", role: "" });

  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `Extract the company name and job title from the job description. Return JSON: {"company": "...", "role": "..."}. If not found, return empty strings.`,
      },
      { role: "user", content: jobDescription.slice(0, 3000) },
    ],
  });

  try {
    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    return NextResponse.json({
      company: parsed.company ?? "",
      role: parsed.role ?? "",
    });
  } catch {
    return NextResponse.json({ company: "", role: "" });
  }
}
