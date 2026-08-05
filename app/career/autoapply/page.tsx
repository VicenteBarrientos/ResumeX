import type { Metadata } from "next";
import AutoApplyDashboard from "@/components/AutoApplyDashboard";

export const metadata: Metadata = {
  title: "AutoApply",
  description: "Track your job applications, manage your candidate profile, and review AI-generated answers.",
};

export default function AutoApplyPage() {
  return (
    <div className="relative min-h-full flex-1 overflow-hidden text-zinc-900">
      <div className="relative z-10">
        <AutoApplyDashboard />
      </div>
    </div>
  );
}
