import type { Metadata } from "next";
import ResumeAnalyzer from "@/components/ResumeAnalyzer";

export const metadata: Metadata = {
  title: "Match Analyzer",
  description:
    "Compare your resume to any job description. Get match scores, keyword gaps, and tailored suggestions.",
};

export default function AnalyzerPage() {
  return (
    <div className="relative min-h-full flex-1 overflow-hidden text-zinc-900">
      <div className="relative z-10">
        <ResumeAnalyzer />
      </div>
    </div>
  );
}
