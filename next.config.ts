import type { NextConfig } from "next";

const nextAuthUrl =
  process.env.NEXTAUTH_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

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

const nextConfig: NextConfig = {
  env: {
    NEXTAUTH_URL: nextAuthUrl,
  },
  async redirects() {
    return PRODUCT_SEGMENT_REDIRECTS.map((r) => ({ ...r, permanent: true }));
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
  },
};

export default nextConfig;
