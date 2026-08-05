import type { Metadata } from "next";
import SavedSearchesList from "@/components/talent-mapper/SavedSearchesList";

export const metadata: Metadata = {
  title: "Saved searches",
  description:
    "ResumeX Talent saved searches, shortlists, and recruiter notes persisted on the server.",
};

export default function TalentSearchesPage() {
  return (
    <div className="relative min-h-full flex-1 overflow-hidden text-zinc-900">
      <div className="relative z-10">
        <SavedSearchesList />
      </div>
    </div>
  );
}
