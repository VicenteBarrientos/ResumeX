import type {
  EvidenceMatch,
  ResearcherCandidate,
  SourcingCriteria,
} from "@/lib/talent-mapper/types";

/**
 * Build actionable phone-screen prompts from public-evidence gaps only.
 * Never invent qualifications — questions ask what publications cannot answer (R-007).
 */
export function buildScreeningQuestions(input: {
  criteria: SourcingCriteria;
  matchedRequired: EvidenceMatch[];
  unknowns: string[];
  possibleConcerns: string[];
}): string[] {
  const questions: string[] = [];
  const matchedRequiredKeys = new Set(
    input.matchedRequired.map((m) => m.criterion.trim().toLowerCase()),
  );

  for (const technique of input.criteria.requiredTechniques) {
    const key = technique.trim().toLowerCase();
    if (!key || matchedRequiredKeys.has(key)) {
      continue;
    }
    questions.push(
      `Which of your projects used ${technique}, and what was your specific role?`,
    );
    if (questions.length >= 3) {
      break;
    }
  }

  for (const unknown of input.unknowns) {
    const lower = unknown.toLowerCase();
    if (lower.includes("employment")) {
      questions.push("Where are you currently based, and what is your present role?");
    } else if (lower.includes("moving") || lower.includes("interest")) {
      questions.push(
        "Are you open to exploring new roles in the next few months?",
      );
    } else if (lower.includes("authorization") || lower.includes("work auth")) {
      questions.push(
        "Do you already have authorization to work in the role's target location?",
      );
    } else {
      questions.push(`Can you clarify: ${unknown}?`);
    }
  }

  for (const concern of input.possibleConcerns) {
    if (concern.toLowerCase().includes("retract")) {
      questions.push(
        "One retrieved work appears retracted — can you walk through the context?",
      );
    }
  }

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const question of questions) {
    const key = question.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(question);
    if (deduped.length >= 5) {
      break;
    }
  }

  return deduped;
}

export function withScreeningQuestions(
  candidate: Omit<ResearcherCandidate, "screeningQuestions">,
  criteria: SourcingCriteria,
): ResearcherCandidate {
  return {
    ...candidate,
    screeningQuestions: buildScreeningQuestions({
      criteria,
      matchedRequired: candidate.matchedRequiredCriteria,
      unknowns: candidate.unknowns,
      possibleConcerns: candidate.possibleConcerns,
    }),
  };
}
