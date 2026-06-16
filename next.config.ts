import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
