import { NextResponse } from "next/server";
import {
  getClientErrorMessage,
  logAnalysisError,
  normalizeAnalysisError,
} from "@/lib/analysis-errors";
import { MAX_PDF_SIZE_BYTES, MAX_PDF_SIZE_LABEL, MAX_TEXT_LENGTH } from "@/lib/constants";
import { extractTextFromDocx } from "@/lib/docx";
import { getOpenAiApiKey } from "@/lib/env";
import { formatResume } from "@/lib/format-resume";
import { extractTextFromPdfWithDebug } from "@/lib/pdf";
import type { CleanTextResult } from "@/lib/clean-text";
import type { FormatRequest } from "@/lib/types";

const isDev = process.env.NODE_ENV === "development";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const GENERIC_EXTRACTION_ERROR =
  "Could not extract text from this file. Try a text-based PDF/DOCX or paste your resume instead.";

const DOCX_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

function getExtractionErrorMessage(error: unknown): string {
  if (isDev) {
    return error instanceof Error ? error.message : String(error);
  }

  return GENERIC_EXTRACTION_ERROR;
}

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isDocxFile(file: File): boolean {
  return (
    DOCX_TYPES.includes(file.type) ||
    file.name.toLowerCase().endsWith(".docx") ||
    file.name.toLowerCase().endsWith(".doc")
  );
}

async function resolveResumeFromMultipart(request: Request): Promise<{
  resume?: string;
  extractionDebug?: CleanTextResult;
  error?: string;
  status?: number;
}> {
  const formData = await request.formData();
  const file = formData.get("resumeFile");

  if (!(file instanceof File)) {
    return { error: "A resume file is required for upload.", status: 400 };
  }

  const isPdf = isPdfFile(file);
  const isDocx = isDocxFile(file);

  if (!isPdf && !isDocx) {
    return {
      error: "Only PDF and DOCX files are supported for resume upload.",
      status: 400,
    };
  }

  if (file.size === 0) {
    return { error: "The uploaded file is empty.", status: 400 };
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    return { error: `File must be ${MAX_PDF_SIZE_LABEL} or smaller.`, status: 400 };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    if (isPdf) {
      const { text, debug } = await extractTextFromPdfWithDebug(buffer, {
        fileName: file.name,
        fileSize: file.size,
      });
      return { resume: text, extractionDebug: debug };
    }

    const resume = await extractTextFromDocx(buffer, {
      fileName: file.name,
      fileSize: file.size,
    });
    return { resume };
  } catch (error) {
    return { error: getExtractionErrorMessage(error), status: 422 };
  }
}

async function resolveResumeFromJson(request: Request): Promise<{
  resume?: string;
  error?: string;
  status?: number;
}> {
  let body: FormatRequest;

  try {
    body = await request.json();
  } catch {
    return { error: "Invalid request body.", status: 400 };
  }

  return { resume: body.resume?.trim() };
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

  // ?debug=1 is only honoured in development.
  const url = new URL(request.url);
  const debugMode = isDev && url.searchParams.get("debug") === "1";

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

  const { resume, extractionDebug } = resolved as {
    resume?: string;
    extractionDebug?: CleanTextResult;
  };

  if (!resume) {
    return NextResponse.json(
      { error: "Resume text or file is required." },
      { status: 400 },
    );
  }

  if (resume.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: "Resume must be under 15,000 characters." },
      { status: 400 },
    );
  }

  try {
    const { result, usage } = await formatResume(resume, apiKey);

    return NextResponse.json({
      result,
      ...(isDev ? { usage } : {}),
      ...(debugMode
        ? {
            debug: {
              rawExtracted: extractionDebug?.raw ?? resume,
              cleanedExtracted: extractionDebug?.cleaned ?? resume,
              wasCorrupted: extractionDebug?.wasCorrupted ?? false,
              charSpacingFixed: extractionDebug?.charSpacingFixed ?? false,
              openAiInput: resume,
            },
          }
        : {}),
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
