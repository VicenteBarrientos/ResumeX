import { extractText, getDocumentProxy } from "unpdf";
import { cleanExtractedText, type CleanTextResult } from "@/lib/clean-text";

const MIN_SUCCESSFUL_TEXT_LENGTH = 100;
const isDev = process.env.NODE_ENV === "development";

export interface PdfExtractionContext {
  fileName?: string;
  fileSize?: number;
}

export interface PdfExtractionResult {
  text: string;
  /** Only populated when NODE_ENV=development */
  debug?: CleanTextResult;
}

function logExtractionError(
  error: unknown,
  context: PdfExtractionContext,
  buffer: Buffer,
): void {
  console.error("[ResumeX] PDF extraction error:", {
    fileName: context.fileName ?? "(unknown)",
    fileSize: context.fileSize ?? null,
    bufferLength: buffer.length,
    isBuffer: Buffer.isBuffer(buffer),
    error,
  });

  if (error instanceof Error) {
    console.error("[ResumeX] PDF extraction error message:", error.message);
    if (error.stack) console.error("[ResumeX] PDF extraction stack:", error.stack);
    if (error.cause) console.error("[ResumeX] PDF extraction cause:", error.cause);
  }
}

/**
 * Join per-page text arrays into a single string that preserves line and section
 * structure. Uses mergePages:false so each page keeps its internal newlines from
 * hasEOL markers, then pages are separated with a blank line.
 *
 * This replaces the old approach of mergePages:true + replace(/\s+/g,' ') which:
 *   a) destroyed all newlines / section structure, and
 *   b) made character-spacing corruption unfixable (all on one line).
 */
function joinPages(pages: string[]): string {
  return pages
    .map((page) =>
      // Collapse excessive blank lines within a page, then trim whitespace.
      page.replace(/\n{3,}/g, "\n\n").trim(),
    )
    .filter(Boolean)
    .join("\n\n");
}

export async function extractTextFromPdf(
  buffer: Buffer,
  context: PdfExtractionContext = {},
): Promise<string> {
  const result = await extractTextFromPdfWithDebug(buffer, context);
  return result.text;
}

export async function extractTextFromPdfWithDebug(
  buffer: Buffer,
  context: PdfExtractionContext = {},
): Promise<PdfExtractionResult> {
  if (!Buffer.isBuffer(buffer)) {
    const error = new Error(
      `Expected a Node.js Buffer for PDF extraction, received ${typeof buffer}`,
    );
    logExtractionError(error, context, buffer as Buffer);
    throw error;
  }

  console.log("[ResumeX] PDF extraction start:", {
    fileName: context.fileName ?? "(unknown)",
    fileSize: context.fileSize ?? null,
    bufferLength: buffer.length,
  });

  const pdfData = new Uint8Array(buffer);
  const pdf = await getDocumentProxy(pdfData);

  try {
    // Use mergePages:false to get per-page text arrays that preserve internal
    // newlines (from hasEOL markers). This keeps section/line structure intact.
    const { text: pages } = await extractText(pdf, { mergePages: false });
    const rawJoined = joinPages(pages as string[]);

    if (isDev) {
      // Log a 500-char preview of the raw text before any cleanup.
      console.log("[ResumeX] PDF raw extracted text (first 500 chars):");
      console.log(rawJoined.slice(0, 500));
    }

    const cleanResult = cleanExtractedText(rawJoined);

    if (isDev) {
      console.log("[ResumeX] PDF cleanup result:", {
        rawLength: cleanResult.raw.length,
        cleanedLength: cleanResult.cleaned.length,
        wasCorrupted: cleanResult.wasCorrupted,
        charSpacingFixed: cleanResult.charSpacingFixed,
      });
      if (cleanResult.charSpacingFixed) {
        console.log("[ResumeX] PDF cleaned text (first 500 chars):");
        console.log(cleanResult.cleaned.slice(0, 500));
      }
    }

    const text = cleanResult.cleaned;

    console.log("[ResumeX] PDF extraction complete:", {
      fileName: context.fileName ?? "(unknown)",
      pageCount: (pages as string[]).length,
      rawLength: rawJoined.length,
      cleanedLength: text.length,
      charSpacingFixed: cleanResult.charSpacingFixed,
    });

    if (text.length <= MIN_SUCCESSFUL_TEXT_LENGTH) {
      throw new Error(
        `EMPTY_PDF_TEXT: extracted ${text.length} characters (minimum ${MIN_SUCCESSFUL_TEXT_LENGTH + 1} required)`,
      );
    }

    return {
      text,
      ...(isDev ? { debug: cleanResult } : {}),
    };
  } catch (error) {
    logExtractionError(error, context, buffer);
    throw error;
  } finally {
    await pdf.destroy();
  }
}
