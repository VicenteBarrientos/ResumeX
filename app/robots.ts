import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/talent", "/login", "/register"],
      disallow: ["/career/", "/api/", "/upgrade", "/extension-auth"],
    },
    sitemap: "https://resumex.talentxrecruiting.com/sitemap.xml",
  };
}
