import { NextResponse } from "next/server";
import {
  getClientErrorMessage,
  logAnalysisError,
  normalizeAnalysisError,
} from "@/lib/analysis-errors";
import { MAX_PDF_SIZE_BYTES, MAX_PDF_SIZE_LABEL, MAX_TEXT_LENGTH } from "@/lib/constants";
import { assertAiQuota, recordUsage } from "@/lib/entitlements";
import { getOpenAiApiKey } from "@/lib/env";
import { parseProfileFromResume } from "@/lib/parse-profile";
import { extractTextFromPdf } from "@/lib/pdf";
import { quotaDenialResponse } from "@/lib/quota";
import { requireSession } from "@/lib/require-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const isDev = process.env.NODE_ENV === "development";

const GENERIC_PDF_EXTRACTION_ERROR =
  "Could not extract text from this PDF. Try a text-based PDF or paste your resume instead.";

function getPdfExtractionErrorMessage(error: unknown): string {
  if (isDev && error instanceof Error) return error.message;
  return GENERIC_PDF_EXTRACTION_ERROR;
}

async function resolveResumeFromMultipart(request: Request): Promise<{
  resume?: string;
  error?: string;
  status?: number;
}> {
  const formData = await request.formData();
  const file = formData.get("resumePdf");

  if (!(file instanceof File)) {
    return { error: "A PDF resume file is required for upload.", status: 400 };
  }

  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    return { error: "Only PDF files are supported for resume upload.", status: 400 };
  }

  if (file.size === 0) {
    return { error: "The uploaded PDF file is empty.", status: 400 };
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    return {
      error: `PDF file must be ${MAX_PDF_SIZE_LABEL} or smaller.`,
      status: 400,
    };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const resume = await extractTextFromPdf(buffer, {
      fileName: file.name,
      fileSize: file.size,
    });
    return { resume };
  } catch (error) {
    return { error: getPdfExtractionErrorMessage(error), status: 422 };
  }
}

async function resolveResumeFromJson(request: Request): Promise<{
  resume?: string;
  error?: string;
  status?: number;
}> {
  let body: { resume?: string };
  try {
    body = await request.json();
  } catch {
    return { error: "Invalid request body.", status: 400 };
  }
  return { resume: body.resume?.trim() };
}

export async function POST(request: Request) {
  const { userId, error: authError } = await requireSession();
  if (authError) return authError;

  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key is not configured on the server." },
      { status: 500 }
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");
  const resolved = isMultipart
    ? await resolveResumeFromMultipart(request)
    : await resolveResumeFromJson(request);

  if (resolved.error) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status ?? 400 });
  }

  const { resume } = resolved;
  if (!resume) {
    return NextResponse.json({ error: "Resume text is required." }, { status: 400 });
  }

  if (resume.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: "Resume must be under 15,000 characters." },
      { status: 400 }
    );
  }

  const denial = await assertAiQuota(userId, "parse_profile");
  if (denial) return quotaDenialResponse(denial);

  try {
    const { profile, usage } = await parseProfileFromResume(resume, apiKey);
    await recordUsage(userId, "parse_profile", usage.estimatedCostUsd);
    return NextResponse.json({
      profile,
      ...(isDev ? { usage } : {}),
    });
  } catch (error) {
    logAnalysisError(error);
    const analysisError = normalizeAnalysisError(error);
    return NextResponse.json(
      { error: getClientErrorMessage(analysisError, isDev) },
      { status: analysisError.status }
    );
  }
}
