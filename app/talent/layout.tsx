import type { Metadata } from "next";
import { TALENT } from "@/lib/products";

export const metadata: Metadata = {
  title: {
    default: `${TALENT.name} — evidence-based candidate discovery`,
    template: `%s — ${TALENT.name}`,
  },
  description: TALENT.tagline,
};

/**
 * ResumeX Talent — the recruiter product. A normal segment layout, not a root
 * layout: providers stay in `app/layout.tsx` so crossing to /career does not
 * force a full reload (R-006). Navigation comes from `TALENT.nav`.
 */
export default function TalentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
