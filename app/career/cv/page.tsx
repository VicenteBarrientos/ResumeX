import type { Metadata } from "next";
import CvFormatter from "@/components/CvFormatter";

export const metadata: Metadata = {
  title: "CV Formatter",
  description: "Turn any resume into a polished, professional CV in one click.",
};

export default function CvPage() {
  return (
    <div className="relative min-h-full flex-1 overflow-hidden text-zinc-900">
      <div className="relative z-10">
        <CvFormatter />
      </div>
    </div>
  );
}
