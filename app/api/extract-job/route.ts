import { NextResponse } from "next/server";
import OpenAI from "openai";
import { assertAiQuota, recordUsage } from "@/lib/entitlements";
import { getOpenAiApiKey } from "@/lib/env";
import { quotaDenialResponse } from "@/lib/quota";
import { requireSession } from "@/lib/require-auth";
import { buildTokenUsage } from "@/lib/token-usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function POST(req: Request) {
  const { userId, error: authError } = await requireSession();
  if (authError) return authError;

  const apiKey = getOpenAiApiKey();
  if (!apiKey) return NextResponse.json({ company: "", role: "" });

  const { jobDescription } = await req.json();
  if (!jobDescription?.trim()) return NextResponse.json({ company: "", role: "" });

  const denial = await assertAiQuota(userId, "extract_job");
  if (denial) return quotaDenialResponse(denial);

  const openai = new OpenAI({ apiKey });
  const model = "gpt-4o-mini";

  const completion = await openai.chat.completions.create({
    model,
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

  const usage = buildTokenUsage(
    model,
    completion.usage?.prompt_tokens ?? 0,
    completion.usage?.completion_tokens ?? 0,
  );
  await recordUsage(userId, "extract_job", usage.estimatedCostUsd);

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
