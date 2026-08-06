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
    <div>
      <AtsIntegrationsClient />
      <p className="px-4 pb-8 text-xs text-zinc-500 sm:px-5 lg:px-6">
        Part of {TALENT.name}. ResumeX does not replace your ATS.
      </p>
    </div>
  );
}
