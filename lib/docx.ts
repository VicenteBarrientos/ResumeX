import mammoth from "mammoth";

const MIN_SUCCESSFUL_TEXT_LENGTH = 100;

export interface DocxExtractionContext {
  fileName?: string;
  fileSize?: number;
}

function logExtractionError(
  error: unknown,
  context: DocxExtractionContext,
  buffer: Buffer,
): void {
  console.error("[ResumeX] DOCX extraction error:", {
    fileName: context.fileName ?? "(unknown)",
    fileSize: context.fileSize ?? null,
    bufferLength: buffer.length,
    isBuffer: Buffer.isBuffer(buffer),
    error,
  });

  if (error instanceof Error && error.stack) {
    console.error("[ResumeX] DOCX extraction stack:", error.stack);
  }
}

export async function extractTextFromDocx(
  buffer: Buffer,
  context: DocxExtractionContext = {},
): Promise<string> {
  if (!Buffer.isBuffer(buffer)) {
    const error = new Error(
      `Expected a Node.js Buffer for DOCX extraction, received ${typeof buffer}`,
    );
    logExtractionError(error, context, buffer as Buffer);
    throw error;
  }

  try {
    // Keep line breaks: mammoth returns paragraph text separated by newlines.
    const { value } = await mammoth.extractRawText({ buffer });
    const text = value.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();

    if (text.length <= MIN_SUCCESSFUL_TEXT_LENGTH) {
      throw new Error(
        `EMPTY_DOCX_TEXT: extracted ${text.length} characters (minimum ${MIN_SUCCESSFUL_TEXT_LENGTH + 1} required)`,
      );
    }

    return text;
  } catch (error) {
    logExtractionError(error, context, buffer);
    throw error;
  }
}
