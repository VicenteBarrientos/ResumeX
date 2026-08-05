import type { CareerAnalysis, CriteriaItem, TalentAssessment } from "@/lib/types";

function formatCriteriaList(title: string, items: CriteriaItem[]): string {
  if (items.length === 0) {
    return `${title}\nNone identified.`;
  }

  const lines = items.map(
    (item) =>
      `${item.met ? "[Met]" : "[Not met]"} ${item.criterion}\n  Evidence: ${item.evidence}`,
  );

  return `${title}\n${lines.join("\n")}`;
}

function formatBulletList(title: string, items: string[]): string {
  if (items.length === 0) {
    return `${title}\nNone identified.`;
  }

  return `${title}\n${items.map((item) => `• ${item}`).join("\n")}`;
}

function formatSuggestions(result: CareerAnalysis): string {
  if (result.suggestions.length === 0) {
    return "Suggestions\nNone identified.";
  }

  const lines = result.suggestions.map(
    (item) => `• ${item.title}\n  ${item.detail}`,
  );

  return `Suggestions\n${lines.join("\n")}`;
}

export function formatSendoutBlurb(blurb: string): string {
  return blurb.trim();
}

export function formatClientFacingBullets(bullets: string[]): string {
  return bullets.map((bullet) => `• ${bullet}`).join("\n");
}

export function formatPhoneScreenQuestions(questions: string[]): string {
  return questions.map((question, index) => `${index + 1}. ${question}`).join("\n");
}

export function formatCareerAnalysisSummary(result: CareerAnalysis): string {
  const sections = [
    "RESUMEX CAREER ANALYSIS",
    "",
    `Match Score: ${result.matchScore}/100`,
    "",
    "Overall Fit",
    result.summary,
    "",
    formatCriteriaList("Must-Have Criteria", result.mustHaveCriteria),
    "",
    formatCriteriaList("Nice-to-Have Criteria", result.niceToHaveCriteria),
    "",
    formatBulletList("Strengths", result.strengths),
    "",
    formatBulletList("Gaps", result.gaps),
    "",
    `Matched Keywords: ${result.matchedKeywords.join(", ") || "None"}`,
    `Missing Keywords: ${result.missingKeywords.join(", ") || "None"}`,
    "",
    formatSuggestions(result),
  ];

  return sections.join("\n").trim();
}

export function formatTalentAssessmentSummary(result: TalentAssessment): string {
  const sections = [
    "RESUMEX TALENT ASSESSMENT",
    "",
    `Match Score: ${result.matchScore}/100`,
    `Concern Level: ${result.concernLevel}`,
    `Recommended Next Step: ${result.recommendedNextStep}`,
    "",
    "Decision Summary",
    result.summary,
    "",
    formatCriteriaList("Must-Have Criteria", result.mustHaveCriteria),
    "",
    formatCriteriaList("Nice-to-Have Criteria", result.niceToHaveCriteria),
    "",
    "Phone Screen Questions",
    formatPhoneScreenQuestions(result.phoneScreenQuestions) || "None identified.",
    "",
    formatBulletList("Client-Facing Bullets", result.clientFacingBullets),
    "",
    "Sendout Blurb",
    result.sendoutBlurb.trim(),
  ];

  return sections.join("\n").trim();
}
