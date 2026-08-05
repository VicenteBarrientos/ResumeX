import type { Metadata } from "next";
import TalentAssessor from "@/components/talent/TalentAssessor";

export const metadata: Metadata = {
  title: "Candidate assessment",
  description:
    "Assess a candidate resume against a job description. Get a decision brief with concern level, next step, phone-screen questions, and a sendout blurb.",
};

export default function TalentAssessPage() {
  return (
    <div className="relative min-h-full flex-1 overflow-hidden bg-gradient-to-b from-emerald-50/80 via-white to-white text-zinc-900 dark:bg-[#050816] dark:bg-none dark:text-white">
      <div className="pointer-events-none fixed inset-0 hidden overflow-hidden dark:block">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-[28rem] w-[28rem] rounded-full bg-teal-600/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
      </div>
      <div className="relative z-10">
        <TalentAssessor />
      </div>
    </div>
  );
}
