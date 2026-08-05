import type { Metadata } from "next";
import { CAREER } from "@/lib/products";

export const metadata: Metadata = {
  title: {
    default: `${CAREER.name} — AI job search workspace`,
    template: `%s — ${CAREER.name}`,
  },
  description: CAREER.tagline,
};

/**
 * ResumeX Career — the candidate product. A normal segment layout, not a root
 * layout: providers stay in `app/layout.tsx` so crossing to /talent does not
 * force a full reload (R-006). Navigation comes from `CAREER.nav`.
 */
export default function CareerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
