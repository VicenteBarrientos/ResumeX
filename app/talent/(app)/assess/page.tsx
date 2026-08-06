import type { Metadata } from "next";
import TalentAssessor from "@/components/talent/TalentAssessor";

export const metadata: Metadata = {
  title: "Candidate assessment",
  description:
    "Assess a candidate resume against a job description. Get a decision brief with concern level, next step, phone-screen questions, and a sendout blurb.",
};

export default function TalentAssessPage() {
  return <TalentAssessor />;
}
