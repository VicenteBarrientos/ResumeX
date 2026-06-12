/** Vercel serverless body limit is 4.5 MB; leave headroom for multipart overhead. */
export const MAX_PDF_SIZE_BYTES = 4 * 1024 * 1024;

export const MAX_PDF_SIZE_LABEL = "4 MB";

export const MAX_TEXT_LENGTH = 15000;

export const RESUMEX_URL =
  process.env.NEXT_PUBLIC_RESUMEX_URL ?? "https://resume-x-rose.vercel.app";

export const TALENTX_URL =
  process.env.NEXT_PUBLIC_TALENTX_URL ?? "https://talentx-website.vercel.app";
