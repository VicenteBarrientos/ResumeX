import { extractText, getDocumentProxy } from "unpdf";

const MIN_SUCCESSFUL_TEXT_LENGTH = 100;

export interface PdfExtractionContext {
  fileName?: string;
  fileSize?: number;
}

function logExtractionDetails(
  context: PdfExtractionContext,
  buffer: Buffer,
  extractedText?: string,
): void {
  const preview = extractedText
    ? extractedText.slice(0, 200)
    : undefined;

  console.log("[ResumeX] PDF extraction details:", {
    fileName: context.fileName ?? "(unknown)",
    fileSize: context.fileSize ?? null,
    bufferLength: buffer.length,
    isBuffer: Buffer.isBuffer(buffer),
    extractedTextLength: extractedText?.length ?? null,
    extractedTextPreview: preview ?? null,
  });
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

    if (error.stack) {
      console.error("[ResumeX] PDF extraction stack:", error.stack);
    }

    if (error.cause) {
      console.error("[ResumeX] PDF extraction cause:", error.cause);
    }
  }
}

export async function extractTextFromPdf(
  buffer: Buffer,
  context: PdfExtractionContext = {},
): Promise<string> {
  if (!Buffer.isBuffer(buffer)) {
    const error = new Error(
      `Expected a Node.js Buffer for PDF extraction, received ${typeof buffer}`,
    );
    logExtractionError(error, context, buffer as Buffer);
    throw error;
  }

  logExtractionDetails(context, buffer);

  const pdfData = new Uint8Array(buffer);
  const pdf = await getDocumentProxy(pdfData);

  try {
    const { text: rawText } = await extractText(pdf, { mergePages: true });
    const text = rawText.replace(/\s+/g, " ").trim();

    logExtractionDetails(context, buffer, text);

    if (text.length <= MIN_SUCCESSFUL_TEXT_LENGTH) {
      throw new Error(
        `EMPTY_PDF_TEXT: extracted ${text.length} characters (minimum ${MIN_SUCCESSFUL_TEXT_LENGTH + 1} required)`,
      );
    }

    return text;
  } catch (error) {
    logExtractionError(error, context, buffer);
    throw error;
  } finally {
    await pdf.destroy();
  }
}
