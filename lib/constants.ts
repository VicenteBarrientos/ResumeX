/** Vercel serverless body limit is 4.5 MB; leave headroom for multipart overhead. */
export const MAX_PDF_SIZE_BYTES = 4 * 1024 * 1024;

export const MAX_PDF_SIZE_LABEL = "4 MB";

export const MAX_TEXT_LENGTH = 15000;

/**
 * Official production origin for ResumeX.
 * Prefer this over any `*.vercel.app` deployment URL in metadata, emails,
 * Stripe redirects, auth callbacks, and the Chrome extension.
 */
export const RESUMEX_OFFICIAL_URL = "https://resumex.talentxrecruiting.com";

export const RESUMEX_URL =
  process.env.NEXT_PUBLIC_RESUMEX_URL?.replace(/\/$/, "") || RESUMEX_OFFICIAL_URL;

export const TALENTX_URL =
  process.env.NEXT_PUBLIC_TALENTX_URL?.replace(/\/$/, "") || "https://talentxrecruiting.com";

export const TALENTX_LINKEDIN = "https://www.linkedin.com/company/talentxrecruiting";

export const VICENTE_LINKEDIN = "https://www.linkedin.com/in/vicente-barrientos/";

export const BENJAMIN_LINKEDIN =
  "https://www.linkedin.com/in/benjam%C3%ADn-mahave-cornejo-39b2aa129/";
