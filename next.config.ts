import type { NextConfig } from "next";
import { RESUMEX_OFFICIAL_URL } from "./lib/constants";

/**
 * Resolve the public origin NextAuth (and Stripe callbacks) should use.
 * Production must never fall through to a `*.vercel.app` deployment URL —
 * that host is an alias, not the official product URL.
 */
function resolveNextAuthUrl(): string {
  const configured = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "");
  if (configured) {
    return configured;
  }

  if (process.env.VERCEL_ENV === "production") {
    return RESUMEX_OFFICIAL_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

const nextAuthUrl = resolveNextAuthUrl();

/**
 * Flat tool routes moved under the /career and /talent product segments.
 * These 308s keep every bookmark, indexed URL, shipped Chrome extension build
 * and outbound email link working. `redirects` runs before `proxy.ts`, so an
 * unauthenticated hit lands on /login with the *new* callbackUrl.
 */
const PRODUCT_SEGMENT_REDIRECTS = [
  { source: "/cv/:path*", destination: "/career/cv/:path*" },
  { source: "/analyzer/:path*", destination: "/career/analyzer/:path*" },
  { source: "/cover-letter/:path*", destination: "/career/cover-letter/:path*" },
  { source: "/jobs/:path*", destination: "/career/jobs/:path*" },
  { source: "/jobsearcher/:path*", destination: "/career/jobsearcher/:path*" },
  { source: "/tracker/:path*", destination: "/career/tracker/:path*" },
  { source: "/autoapply/:path*", destination: "/career/autoapply/:path*" },
  { source: "/onboarding/:path*", destination: "/career/onboarding/:path*" },
  // /formatter was already an alias of the CV Formatter; point it at the real page.
  { source: "/formatter/:path*", destination: "/career/cv" },
  { source: "/talent-mapper/:path*", destination: "/talent/mapper/:path*" },
];

/** Production Vercel aliases → official custom domain. */
const OFFICIAL_HOST_REDIRECTS = [
  "resume-x-yixz.vercel.app",
  "resume-x-yixz-vicente-barrientos-projects.vercel.app",
  "resume-x-yixz-git-main-vicente-barrientos-projects.vercel.app",
].map((host) => ({
  source: "/:path*",
  has: [{ type: "host" as const, value: host }],
  destination: `${RESUMEX_OFFICIAL_URL}/:path*`,
  permanent: true,
}));

const nextConfig: NextConfig = {
  env: {
    NEXTAUTH_URL: nextAuthUrl,
    NEXT_PUBLIC_RESUMEX_URL: process.env.NEXT_PUBLIC_RESUMEX_URL || RESUMEX_OFFICIAL_URL,
  },
  async redirects() {
    return [
      ...PRODUCT_SEGMENT_REDIRECTS.map((r) => ({ ...r, permanent: true })),
      ...OFFICIAL_HOST_REDIRECTS,
    ];
  },
  // Keep unpdf (PDF.js) external so the bundler (Turbopack/webpack) does not try to
  // inline PDF.js's dynamic worker import. Bundling it breaks the worker resolution
  // ("Setting up fake worker failed: Cannot find module pdf.worker.mjs"). Leaving it
  // external lets Node load it from node_modules at runtime, where the worker resolves.
  serverExternalPackages: ["unpdf"],
  // Guarantee the PDF.js worker asset is traced into the serverless functions on Vercel
  // so the runtime dynamic import of pdf.worker.mjs can always be resolved in production.
  outputFileTracingIncludes: {
    "/api/format": ["./node_modules/unpdf/dist/**"],
    "/api/analyze": ["./node_modules/unpdf/dist/**"],
    "/api/talent-assess": ["./node_modules/unpdf/dist/**"],
  },
};

export default nextConfig;
