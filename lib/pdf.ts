import { extractText, getDocumentProxy } from "unpdf";
import { cleanExtractedText, type CleanTextResult } from "@/lib/clean-text";
import { debugError, debugLog, isResumeXDebugEnabled } from "@/lib/debug-log";

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
  if (!isResumeXDebugEnabled()) {
    console.error(
      "[ResumeX] PDF extraction error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return;
  }

  debugError("[ResumeX] PDF extraction error:", {
    fileName: context.fileName ?? "(unknown)",
    fileSize: context.fileSize ?? null,
    bufferLength: buffer.length,
    isBuffer: Buffer.isBuffer(buffer),
    error,
  });

  if (error instanceof Error) {
    debugError("[ResumeX] PDF extraction error message:", error.message);
    if (error.stack) debugError("[ResumeX] PDF extraction stack:", error.stack);
    if (error.cause) debugError("[ResumeX] PDF extraction cause:", error.cause);
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

  debugLog("[ResumeX] PDF extraction start:", {
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

    const cleanResult = cleanExtractedText(rawJoined);

    debugLog("[ResumeX] PDF cleanup result:", {
      rawLength: cleanResult.raw.length,
      cleanedLength: cleanResult.cleaned.length,
      wasCorrupted: cleanResult.wasCorrupted,
      charSpacingFixed: cleanResult.charSpacingFixed,
    });

    const text = cleanResult.cleaned;

    debugLog("[ResumeX] PDF extraction complete:", {
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
