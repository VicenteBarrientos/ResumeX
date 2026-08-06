import type { Metadata } from "next";
import SavedSearchesList from "@/components/talent-mapper/SavedSearchesList";

export const metadata: Metadata = {
  title: "Saved searches",
  description:
    "ResumeX Talent saved searches, shortlists, and recruiter notes persisted on the server.",
};

export default function TalentSearchesPage() {
  return <SavedSearchesList />;
}
