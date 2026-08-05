import type { Metadata } from "next";
import JobSearcherDashboard from "@/components/JobSearcherDashboard";

export const metadata: Metadata = {
  title: "Job Searcher",
  description: "Discover jobs, analyze match scores, and queue roles for AutoApply.",
};

export default function JobSearcherPage() {
  return (
    <div className="relative min-h-full flex-1 overflow-hidden bg-gradient-to-b from-indigo-50/80 via-white to-white text-zinc-900 dark:bg-[#050816] dark:bg-none dark:text-white">
      <div className="pointer-events-none fixed inset-0 hidden overflow-hidden dark:block">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-[28rem] w-[28rem] rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl" />
      </div>
      <div className="relative z-10">
        <JobSearcherDashboard />
      </div>
    </div>
  );
}
