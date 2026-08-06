import { DEMO_JOB_DESCRIPTION, DEMO_RESUME } from "@/lib/demo-data";
import type { CareerAnalysis } from "@/lib/types";

/** True when both inputs match the canned Career demo payloads (trim-equal). */
export function isCareerDemoInput(resume: string, jobDescription: string): boolean {
  return (
    resume.trim() === DEMO_RESUME.trim() &&
    jobDescription.trim() === DEMO_JOB_DESCRIPTION.trim()
  );
}

export function isCareerDemoJobDescription(jobDescription: string): boolean {
  return jobDescription.trim() === DEMO_JOB_DESCRIPTION.trim();
}

/**
 * Deterministic Career analyzer result for the Try-demo payloads.
 * Quotes are literal excerpts from DEMO_RESUME — never model inventions.
 */
export function getDemoCareerAnalysis(): CareerAnalysis {
  return {
    matchScore: 86,
    summary:
      "Strong overlap on TypeScript, React, Node.js, PostgreSQL, cloud, testing, and mentoring. Fintech/payments domain experience is not stated in the resume.",
    mustHaveCriteria: [
      {
        criterion: "5+ years of professional software engineering experience",
        status: "met",
        quote: "Full-stack software engineer with 5 years of experience building scalable web applications.",
        aiInferred: false,
      },
      {
        criterion: "Strong proficiency in TypeScript, React, and Node.js",
        status: "met",
        quote: "Strong background in React, Node.js, TypeScript, PostgreSQL, and cloud deployment.",
        aiInferred: false,
      },
      {
        criterion: "Experience designing and building RESTful APIs",
        status: "met",
        quote: "Built REST APIs with Node.js and PostgreSQL and integrated third-party demo systems.",
        aiInferred: false,
      },
      {
        criterion: "Production experience with PostgreSQL or similar relational databases",
        status: "met",
        quote: "Built REST APIs with Node.js and PostgreSQL and integrated third-party demo systems.",
        aiInferred: false,
      },
      {
        criterion: "Familiarity with cloud infrastructure",
        status: "met",
        quote: "Deployed services on cloud infrastructure with CI/CD pipelines.",
        aiInferred: false,
      },
      {
        criterion: "Experience with automated testing and CI/CD pipelines",
        status: "met",
        quote:
          "Mentored 3 junior engineers and established frontend testing standards with Jest and React Testing Library.",
        aiInferred: false,
      },
      {
        criterion: "Ability to mentor junior engineers and participate in code reviews",
        status: "met",
        quote: "Mentored 3 junior engineers and established frontend testing standards with Jest and React Testing Library.",
        aiInferred: false,
      },
    ],
    niceToHaveCriteria: [
      {
        criterion: "Experience in fintech, payments, or regulated industries",
        status: "insufficient",
        quote: "",
        aiInferred: false,
      },
      {
        criterion: "Knowledge of compliance requirements",
        status: "insufficient",
        quote: "",
        aiInferred: false,
      },
      {
        criterion: "Experience with Kubernetes and infrastructure-as-code",
        status: "insufficient",
        quote: "",
        aiInferred: false,
      },
      {
        criterion: "GraphQL API design experience",
        status: "insufficient",
        quote: "",
        aiInferred: false,
      },
      {
        criterion: "Prior work with event-driven architectures",
        status: "insufficient",
        quote: "",
        aiInferred: false,
      },
    ],
    strengths: [
      "Five years of full-stack delivery with React, Node.js, and TypeScript",
      "PostgreSQL and REST API work in production-style roles",
      "Mentoring and frontend testing standards already on the resume",
    ],
    gaps: [
      "No stated fintech or payments domain experience",
      "Kubernetes / IaC and GraphQL are not mentioned",
    ],
    matchedKeywords: [
      "TypeScript",
      "React",
      "Node.js",
      "PostgreSQL",
      "REST APIs",
      "CI/CD",
      "Jest",
    ],
    missingKeywords: ["fintech", "payments", "Kubernetes", "GraphQL"],
    suggestions: [
      {
        title: "Call out domain adjacency",
        detail:
          "If you have any regulated-data or payments-adjacent work, add one bullet so the fintech nice-to-have is no longer blank.",
      },
      {
        title: "Name cloud specifics",
        detail:
          "Replace generic “cloud infrastructure” with the providers and services you actually used.",
      },
    ],
  };
}

export function getDemoCoverLetter(company?: string, role?: string): string {
  const companyName = company?.trim() || "Example Fintech Platform";
  const roleName = role?.trim() || "Senior Full-Stack Engineer";

  return `Dear Hiring Team at ${companyName},

I am writing to apply for the ${roleName} role. I am a full-stack software engineer with 5 years of experience building scalable web applications, with a strong background in React, Node.js, TypeScript, PostgreSQL, and cloud deployment.

In my recent work I led development of a customer portal used by 100,000+ users, improved page load times by 40%, built REST APIs with Node.js and PostgreSQL, and mentored junior engineers while establishing frontend testing standards with Jest and React Testing Library. I have also deployed services on cloud infrastructure with CI/CD pipelines.

I would welcome the chance to bring that delivery focus to your merchant dashboard and payments API. Thank you for considering my application.

Sincerely,
Sample Candidate`;
}
