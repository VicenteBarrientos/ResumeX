/** Vercel serverless body limit is 4.5 MB; leave headroom for multipart overhead. */
export const MAX_PDF_SIZE_BYTES = 4 * 1024 * 1024;

export const MAX_PDF_SIZE_LABEL = "4 MB";

export const MAX_TEXT_LENGTH = 15000;
