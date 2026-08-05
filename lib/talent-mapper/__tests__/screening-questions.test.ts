import { describe, expect, it } from "vitest";
import { buildScreeningQuestions } from "@/lib/talent-mapper/screening-questions";
import type { EvidenceMatch, SourcingCriteria } from "@/lib/talent-mapper/types";

const criteria: SourcingCriteria = {
  roleTitle: "Virologist",
  roleSummary: "Rescue systems",
  requiredTechniques: ["Viral rescue", "Reverse genetics", "Plaque assay"],
  preferredTechniques: [],
  researchAreas: ["Virology"],
  organismsOrSystems: [],
  adjacentTerms: [],
  senioritySignals: [],
  location: {},
  exclusions: [],
  recruiterNotes: [],
};

function match(criterion: string): EvidenceMatch {
  return {
    criterion,
    matchType: "exact",
    workTitle: "Example",
    snippet: criterion,
    confidence: "direct",
    workId: "W1",
  };
}

describe("buildScreeningQuestions", () => {
  it("asks about unmatched required techniques and always-unknowns", () => {
    const questions = buildScreeningQuestions({
      criteria,
      matchedRequired: [match("Viral rescue")],
      unknowns: [
        "Current employment",
        "Interest in moving",
        "Work authorization",
      ],
      possibleConcerns: [],
    });

    expect(questions.some((q) => q.includes("Reverse genetics"))).toBe(true);
    expect(questions.some((q) => /currently based|present role/i.test(q))).toBe(
      true,
    );
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.length).toBeLessThanOrEqual(5);
  });

  it("adds a retraction question when concerns mention retraction", () => {
    const questions = buildScreeningQuestions({
      criteria,
      matchedRequired: criteria.requiredTechniques.map(match),
      unknowns: [],
      possibleConcerns: [
        "One or more retrieved works are marked retracted — review carefully before outreach.",
      ],
    });

    expect(questions.some((q) => /retracted/i.test(q))).toBe(true);
  });
});
