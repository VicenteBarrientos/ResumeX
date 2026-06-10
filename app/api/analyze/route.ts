import { NextResponse } from "next/server";
import { analyzeResume } from "@/lib/analyze";
import {
  getClientErrorMessage,
  logAnalysisError,
  normalizeAnalysisError,
} from "@/lib/analysis-errors";
import { MAX_PDF_SIZE_BYTES, MAX_PDF_SIZE_LABEL, MAX_TEXT_LENGTH } from "@/lib/constants";
import { getOpenAiApiKey } from "@/lib/env";
import { extractTextFromPdf } from "@/lib/pdf";
import type { AnalyzeRequest } from "@/lib/types";

const isDev = process.env.NODE_ENV === "development";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const GENERIC_PDF_EXTRACTION_ERROR =
  "Could not extract text from this PDF. Try a text-based PDF or paste your resume instead.";

function getPdfExtractionErrorMessage(error: unknown): string {
  if (isDev) {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  return GENERIC_PDF_EXTRACTION_ERROR;
}

async function resolveResumeFromMultipart(request: Request): Promise<{
  resume?: string;
  jobDescription?: string;
  error?: string;
  status?: number;
}> {
  const formData = await request.formData();
  const file = formData.get("resumePdf");
  const jobDescription = String(formData.get("jobDescription") ?? "").trim();

  if (!(file instanceof File)) {
    return {
      error: "A PDF resume file is required for upload.",
      status: 400,
    };
  }

  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    return {
      error: "Only PDF files are supported for resume upload.",
      status: 400,
    };
  }

  if (file.size === 0) {
    return {
      error: "The uploaded PDF file is empty.",
      status: 400,
    };
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
    return { resume, jobDescription };
  } catch (error) {
    return {
      error: getPdfExtractionErrorMessage(error),
      status: 422,
    };
  }
}

async function resolveResumeFromJson(request: Request): Promise<{
  resume?: string;
  jobDescription?: string;
  error?: string;
  status?: number;
}> {
  let body: AnalyzeRequest;

  try {
    body = await request.json();
  } catch {
    return { error: "Invalid request body.", status: 400 };
  }

  return {
    resume: body.resume?.trim(),
    jobDescription: body.jobDescription?.trim(),
  };
}

export async function POST(request: Request) {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    console.error("[ResumeX] OPENAI_API_KEY is not configured.");
    return NextResponse.json(
      { error: "OpenAI API key is not configured on the server." },
      { status: 500 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");

  const resolved = isMultipart
    ? await resolveResumeFromMultipart(request)
    : await resolveResumeFromJson(request);

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

  try {
    const { result, usage } = await analyzeResume(resume, jobDescription, apiKey);

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
