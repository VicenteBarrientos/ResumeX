import type { AnalysisResult, CriteriaItem, StrongMatch } from "@/lib/types";

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

function formatStrongMatches(matches: StrongMatch[]): string {
  if (matches.length === 0) {
    return "Strong Matches\nNone identified.";
  }

  const lines = matches.map((item) => `${item.match}\n  Evidence: ${item.evidence}`);
  return `Strong Matches\n${lines.join("\n")}`;
}

function formatBulletList(title: string, items: string[]): string {
  if (items.length === 0) {
    return `${title}\nNone identified.`;
  }

  return `${title}\n${items.map((item) => `• ${item}`).join("\n")}`;
}

function formatNumberedList(title: string, items: string[]): string {
  if (items.length === 0) {
    return `${title}\nNone identified.`;
  }

  return `${title}\n${items.map((item, index) => `${index + 1}. ${item}`).join("\n")}`;
}

function formatSuggestions(result: AnalysisResult): string {
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

export function formatFullAnalysisSummary(result: AnalysisResult): string {
  const sections = [
    "RESUMEX ANALYSIS SUMMARY",
    "",
    `Match Score: ${result.matchScore}/100`,
    `Concern Level: ${result.concernLevel}`,
    `Recommended Next Step: ${result.recommendedNextStep}`,
    "",
    "Overall Fit",
    result.summary,
    "",
    formatCriteriaList("Must-Have Criteria", result.mustHaveCriteria),
    "",
    formatCriteriaList("Nice-to-Have Criteria", result.niceToHaveCriteria),
    "",
    formatStrongMatches(result.strongMatches),
    "",
    formatBulletList("Strengths", result.strengths),
    "",
    formatBulletList("Gaps", result.gaps),
    "",
    `Matched Keywords: ${result.matchedKeywords.join(", ") || "None"}`,
    `Missing Keywords: ${result.missingKeywords.join(", ") || "None"}`,
    "",
    formatSuggestions(result),
    "",
    formatNumberedList("Phone Screen Questions", result.phoneScreenQuestions),
    "",
    formatBulletList("Client-Facing Bullets", result.clientFacingBullets),
    "",
    "Sendout Blurb",
    result.sendoutBlurb.trim(),
  ];

  return sections.join("\n").trim();
}
