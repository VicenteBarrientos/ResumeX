import { MAX_PDF_SIZE_BYTES, MAX_PDF_SIZE_LABEL } from "@/lib/constants";
import { extractTextFromPdf } from "@/lib/pdf";
import type { AnalyzeRequest } from "@/lib/types";

const isDev = process.env.NODE_ENV === "development";
const GENERIC_PDF_EXTRACTION_ERROR =
  "Could not extract text from this PDF. Try a text-based PDF or paste the resume instead.";

export type ResolvedResumeJobInput = {
  resume?: string;
  jobDescription?: string;
  error?: string;
  status?: number;
};

function getPdfExtractionErrorMessage(error: unknown): string {
  if (isDev) {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  return GENERIC_PDF_EXTRACTION_ERROR;
}

export async function resolveResumeJobFromMultipart(
  request: Request,
): Promise<ResolvedResumeJobInput> {
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

export async function resolveResumeJobFromJson(
  request: Request,
): Promise<ResolvedResumeJobInput> {
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

export async function resolveResumeJobInput(
  request: Request,
): Promise<ResolvedResumeJobInput> {
  const contentType = request.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");

  return isMultipart
    ? resolveResumeJobFromMultipart(request)
    : resolveResumeJobFromJson(request);
}
