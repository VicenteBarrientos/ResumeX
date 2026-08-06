import type { Metadata } from "next";
import AtsIntegrationsClient from "@/components/talent/ats/AtsIntegrationsClient";
import { TALENT } from "@/lib/products";

export const metadata: Metadata = {
  title: "ATS Integrations",
  description:
    "Send recruiter-reviewed candidates and evidence into your existing hiring system.",
};

export default function TalentIntegrationsPage() {
  return (
    <main>
      <AtsIntegrationsClient />
      <p className="mx-auto max-w-4xl px-4 pb-10 text-xs text-zinc-500">
        Part of {TALENT.name}. ResumeX does not replace your ATS.
      </p>
    </main>
  );
}
