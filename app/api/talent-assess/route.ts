import { NextResponse } from "next/server";
import { assessForTalent } from "@/lib/analyze";
import {
  getClientErrorMessage,
  logAnalysisError,
  normalizeAnalysisError,
} from "@/lib/analysis-errors";
import { MAX_TEXT_LENGTH } from "@/lib/constants";
import { assertAiQuota, recordUsage } from "@/lib/entitlements";
import { getOpenAiApiKey } from "@/lib/env";
import { quotaDenialResponse } from "@/lib/quota";
import { requireSession } from "@/lib/require-auth";
import { resolveResumeJobInput } from "@/lib/resolve-resume-job-input";

const isDev = process.env.NODE_ENV === "development";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const { userId, error: authError } = await requireSession();
  if (authError) return authError;

  const resolved = await resolveResumeJobInput(request);

  if (resolved.error) {
    return NextResponse.json(
      { error: resolved.error },
      { status: resolved.status ?? 400 },
    );
  }

  const { resume, jobDescription } = resolved;

  if (!resume || !jobDescription) {
    return NextResponse.json(
      { error: "Both resume and job description are required." },
      { status: 400 },
    );
  }

  if (resume.length > MAX_TEXT_LENGTH || jobDescription.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: "Resume and job description must each be under 15,000 characters." },
      { status: 400 },
    );
  }

  const denial = await assertAiQuota(userId, "talent_assess");
  if (denial) return quotaDenialResponse(denial);

  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    console.error("[ResumeX] OPENAI_API_KEY is not configured.");
    return NextResponse.json(
      { error: "OpenAI API key is not configured on the server." },
      { status: 500 },
    );
  }

  try {
    const { result, usage } = await assessForTalent(resume, jobDescription, apiKey);
    await recordUsage(userId, "talent_assess", usage.estimatedCostUsd);

    return NextResponse.json({
      result,
      ...(isDev ? { usage } : {}),
    });
  } catch (error) {
    logAnalysisError(error);

    const analysisError = normalizeAnalysisError(error);

    return NextResponse.json(
      { error: getClientErrorMessage(analysisError, isDev) },
      { status: analysisError.status },
    );
  }
}
