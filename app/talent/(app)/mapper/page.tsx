import type { Metadata } from "next";
import { Suspense } from "react";
import TalentMapperWorkspace from "@/components/talent-mapper/TalentMapperWorkspace";

export const metadata: Metadata = {
  title: "Talent Mapper",
  description:
    "Find potential candidates through public evidence of their work. Evidence-based candidate discovery beyond LinkedIn.",
};

export default function TalentMapperPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-500">Loading Talent Mapper…</div>}>
      <TalentMapperWorkspace />
    </Suspense>
  );
}
