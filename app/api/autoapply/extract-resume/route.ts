import { NextResponse } from "next/server";
import { MAX_PDF_SIZE_BYTES, MAX_PDF_SIZE_LABEL, MAX_TEXT_LENGTH } from "@/lib/constants";
import { extractTextFromPdf } from "@/lib/pdf";
import { requireSession } from "@/lib/require-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isDev = process.env.NODE_ENV === "development";

const GENERIC_PDF_EXTRACTION_ERROR =
  "Could not extract text from this PDF. Try a text-based PDF or paste your resume instead.";

function getPdfExtractionErrorMessage(error: unknown): string {
  if (isDev && error instanceof Error) return error.message;
  return GENERIC_PDF_EXTRACTION_ERROR;
}

/** POST /api/autoapply/extract-resume — PDF to text only (no OpenAI required) */
export async function POST(request: Request) {
  const { error: authError } = await requireSession();
  if (authError) return authError;

  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "PDF upload required." }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("resumePdf");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A PDF resume file is required." }, { status: 400 });
  }

  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "The uploaded PDF file is empty." }, { status: 400 });
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    return NextResponse.json(
      { error: `PDF file must be ${MAX_PDF_SIZE_LABEL} or smaller.` },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const resume = await extractTextFromPdf(buffer, {
      fileName: file.name,
      fileSize: file.size,
    });

    if (!resume.trim()) {
      return NextResponse.json({ error: GENERIC_PDF_EXTRACTION_ERROR }, { status: 422 });
    }

    if (resume.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: "Extracted resume text exceeds 15,000 characters." },
        { status: 400 }
      );
    }

    return NextResponse.json({ resume });
  } catch (error) {
    return NextResponse.json(
      { error: getPdfExtractionErrorMessage(error) },
      { status: 422 }
    );
  }
}
