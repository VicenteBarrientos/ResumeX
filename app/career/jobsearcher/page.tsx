import type { Metadata } from "next";
import JobSearcherDashboard from "@/components/JobSearcherDashboard";

export const metadata: Metadata = {
  title: "Job Searcher",
  description: "Discover jobs, analyze match scores, and queue roles for AutoApply.",
};

export default function JobSearcherPage() {
  return (
    <div className="relative min-h-full flex-1 overflow-hidden text-zinc-900">
      <div className="relative z-10">
        <JobSearcherDashboard />
      </div>
    </div>
  );
}
