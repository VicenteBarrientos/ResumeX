/**
 * ResumeX ships two products on one codebase (R-002). Their names are exact
 * (R-003) and live here so nav, metadata and copy read them from one place
 * instead of each surface inventing its own variant.
 *
 * Talent Mapper is a feature inside ResumeX Talent, never a product name (R-004).
 */

export type ProductId = "career" | "talent";

export type ProductNavLink = {
  href: string;
  label: string;
  /** Key into `t.nav` when the label is translated. `label` is the English fallback. */
  localeKey?: "cvFormatter" | "analyzer";
};

export type Product = {
  id: ProductId;
  /** Exact product name per R-003. */
  name: string;
  /** Word rendered after the shared "ResumeX" wordmark. */
  suffix: string;
  audience: string;
  tagline: string;
  /** Segment root. Every route of the product lives under it. */
  basePath: string;
  /** Where a signed-in user of this product lands. */
  home: string;
  nav: ProductNavLink[];
};

export const CAREER: Product = {
  id: "career",
  name: "ResumeX Career",
  suffix: "Career",
  audience: "Job seekers",
  tagline: "Format a CV, check job fit, draft cover letters, and track applications.",
  basePath: "/career",
  home: "/career/tracker",
  nav: [
    { href: "/career/cv", label: "CV Formatter", localeKey: "cvFormatter" },
    { href: "/career/analyzer", label: "Match Analyzer", localeKey: "analyzer" },
    { href: "/career/jobs", label: "Job Search" },
    { href: "/career/cover-letter", label: "Cover Letter" },
    { href: "/career/autoapply", label: "AutoApply" },
    { href: "/career/tracker", label: "Tracker" },
    { href: "/upgrade", label: "Pro" },
  ],
};

export const TALENT: Product = {
  id: "talent",
  name: "ResumeX Talent",
  suffix: "Talent",
  audience: "Recruiters and hiring teams",
  tagline: "Find researchers by their public evidence, not by their job title.",
  basePath: "/talent",
  home: "/talent/mapper",
  nav: [
    { href: "/talent/mapper", label: "Talent Mapper" },
    { href: "/talent/assess", label: "Assess" },
    { href: "/talent/searches", label: "Saved searches" },
  ],
};

export const PRODUCTS: Product[] = [CAREER, TALENT];

/** The product a path belongs to, or null for shared surfaces (`/`, auth, upgrade). */
export function productForPath(pathname: string): Product | null {
  return (
    PRODUCTS.find(
      (p) => pathname === p.basePath || pathname.startsWith(`${p.basePath}/`)
    ) ?? null
  );
}

/** The other product — used for the cross-product link in the nav. */
export function otherProduct(product: Product): Product {
  return product.id === "career" ? TALENT : CAREER;
}
