import type { Metadata } from "next";
import SavedSearchesList from "@/components/talent-mapper/SavedSearchesList";

export const metadata: Metadata = {
  title: "Saved searches",
  description:
    "ResumeX Talent saved searches, shortlists, and recruiter notes persisted on the server.",
};

export default function TalentSearchesPage() {
  return (
    <div className="relative min-h-full flex-1 overflow-hidden bg-gradient-to-b from-emerald-50/80 via-white to-white text-zinc-900 dark:bg-[#050816] dark:bg-none dark:text-white">
      <div className="pointer-events-none fixed inset-0 hidden overflow-hidden dark:block">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-[28rem] w-[28rem] rounded-full bg-teal-600/15 blur-3xl" />
      </div>
      <div className="relative z-10">
        <SavedSearchesList />
      </div>
    </div>
  );
}
