import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep unpdf (PDF.js) external so Vercel bundles it correctly in production.
  serverExternalPackages: ["unpdf"],
};

export default nextConfig;
