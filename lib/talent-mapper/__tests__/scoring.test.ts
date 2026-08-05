import { describe, expect, it } from "vitest";
import { getDemoCriteria } from "@/lib/talent-mapper/criteria";
import { scoreResearcher } from "@/lib/talent-mapper/scoring";
import type { EvidenceMatch, RelevantWork } from "@/lib/talent-mapper/types";

function match(
  criterion: string,
  confidence: EvidenceMatch["confidence"],
  workId = "W1",
): EvidenceMatch {
  return {
    criterion,
    matchType:
      confidence === "direct"
        ? "exact"
        : confidence === "strong_adjacent"
          ? "adjacent"
          : "inferred",
    workTitle: "Example work",
    year: 2024,
    snippet: `evidence for ${criterion}`,
    confidence,
    workId,
  };
}

describe("scoreResearcher", () => {
  const criteria = getDemoCriteria();

  it("is deterministic and stays within 0–100", () => {
    const input = {
      name: "Alex Researcher",
      criteria,
      matchedRequired: [
        match("Viral rescue", "direct"),
        match("Reverse genetics", "direct"),
        match("Molecular cloning", "strong_adjacent"),
      ],
      matchedPreferred: [match("Independent experimental design", "possible")],
      matchedResearchAreas: [match("Virology", "direct")],
      matchedOrganisms: [match("Influenza", "direct")],
      relevantWorks: [
        {
          id: "W1",
          title: "Rescue of recombinant influenza",
          year: 2024,
          matchedCriteria: ["Viral rescue", "Reverse genetics"],
        },
        {
          id: "W2",
          title: "Cloning approaches in virology",
          year: 2023,
          matchedCriteria: ["Molecular cloning"],
        },
      ] satisfies RelevantWork[],
      likelyInstitution: {
        name: "Harvard Medical School",
        countryCode: "US",
      },
      publicationYears: [2023, 2024],
      mostRecentRelevantYear: 2024,
    };

    const a = scoreResearcher(input);
    const b = scoreResearcher(input);

    expect(a).toEqual(b);
    expect(a.score).toBeGreaterThanOrEqual(0);
    expect(a.score).toBeLessThanOrEqual(100);
    expect(a.scoreBreakdown.total).toBe(a.score);
    expect(a.scoreBreakdown.requiredTechniques).toBeLessThanOrEqual(40);
    expect(a.scoreBreakdown.researchArea).toBeLessThanOrEqual(20);
    expect(a.scoreBreakdown.recency).toBeLessThanOrEqual(15);
    expect(a.scoreBreakdown.repeatedEvidence).toBeLessThanOrEqual(10);
    expect(a.scoreBreakdown.geography).toBeLessThanOrEqual(10);
    expect(a.scoreBreakdown.seniority).toBeLessThanOrEqual(5);
  });

  it("does not treat missing data as negative", () => {
    const scored = scoreResearcher({
      name: "Sparse Profile",
      criteria: {
        ...criteria,
        location: {},
        senioritySignals: [],
      },
      matchedRequired: [],
      matchedPreferred: [],
      matchedResearchAreas: [],
      matchedOrganisms: [],
      relevantWorks: [
        {
          id: "W9",
          title: "Unrelated title",
          matchedCriteria: ["placeholder"],
        },
      ],
      publicationYears: [],
    });

    expect(scored.scoreBreakdown.geography).toBe(0);
    expect(scored.scoreBreakdown.seniority).toBe(0);
    expect(scored.scoreBreakdown.recency).toBe(0);
    expect(scored.score).toBeGreaterThanOrEqual(0);
  });

  it("does not let citations dominate (citations unused in scoring)", () => {
    const baseWorks: RelevantWork[] = [
      {
        id: "W1",
        title: "Viral rescue methods",
        year: 2024,
        citedByCount: 2,
        matchedCriteria: ["Viral rescue"],
      },
    ];

    const lowCite = scoreResearcher({
      name: "A",
      criteria,
      matchedRequired: [match("Viral rescue", "direct")],
      matchedPreferred: [],
      matchedResearchAreas: [],
      matchedOrganisms: [],
      relevantWorks: baseWorks,
      publicationYears: [2024],
      mostRecentRelevantYear: 2024,
    });

    const highCite = scoreResearcher({
      name: "A",
      criteria,
      matchedRequired: [match("Viral rescue", "direct")],
      matchedPreferred: [],
      matchedResearchAreas: [],
      matchedOrganisms: [],
      relevantWorks: [{ ...baseWorks[0], citedByCount: 50_000 }],
      publicationYears: [2024],
      mostRecentRelevantYear: 2024,
    });

    expect(highCite.score).toBe(lowCite.score);
  });

  it("always includes employment, moving, and work-authorization unknowns", () => {
    const scored = scoreResearcher({
      name: "Alex",
      criteria,
      matchedRequired: [match("Viral rescue", "direct")],
      matchedPreferred: [],
      matchedResearchAreas: [],
      matchedOrganisms: [],
      relevantWorks: [
        {
          id: "W1",
          title: "Work",
          year: 2024,
          matchedCriteria: ["Viral rescue"],
        },
      ],
      publicationYears: [2024],
      mostRecentRelevantYear: 2024,
    });

    expect(scored.unknowns).toEqual([
      "Current employment",
      "Interest in moving",
      "Work authorization",
    ]);
  });

  it("pins confidence weights so strong_adjacent outranks possible", () => {
    // Characterization for R-012: inverting 0.7/0.35 must fail this test.
    const required = criteria.requiredTechniques;
    const strong = scoreResearcher({
      name: "Strong",
      criteria,
      matchedRequired: required.map((c) => match(c, "strong_adjacent")),
      matchedPreferred: [],
      matchedResearchAreas: [],
      matchedOrganisms: [],
      relevantWorks: [
        {
          id: "W1",
          title: "Work",
          year: 2024,
          matchedCriteria: required,
        },
      ],
      publicationYears: [2024],
      mostRecentRelevantYear: 2024,
    });
    const weak = scoreResearcher({
      name: "Weak",
      criteria,
      matchedRequired: required.map((c) => match(c, "possible")),
      matchedPreferred: [],
      matchedResearchAreas: [],
      matchedOrganisms: [],
      relevantWorks: [
        {
          id: "W1",
          title: "Work",
          year: 2024,
          matchedCriteria: required,
        },
      ],
      publicationYears: [2024],
      mostRecentRelevantYear: 2024,
    });

    expect(strong.scoreBreakdown.requiredTechniques).toBe(28); // round(40 * 0.7)
    expect(weak.scoreBreakdown.requiredTechniques).toBe(14); // round(40 * 0.35)
    expect(strong.scoreBreakdown.requiredTechniques).toBeGreaterThan(
      weak.scoreBreakdown.requiredTechniques,
    );
  });

  it("pins fresh-work recency at 15 and country match at 7+", () => {
    const currentYear = new Date().getUTCFullYear();
    const scored = scoreResearcher({
      name: "Geo",
      criteria,
      matchedRequired: [match("Viral rescue", "direct")],
      matchedPreferred: [],
      matchedResearchAreas: [],
      matchedOrganisms: [],
      relevantWorks: [
        {
          id: "W1",
          title: "Work",
          year: currentYear,
          matchedCriteria: ["Viral rescue"],
        },
      ],
      likelyInstitution: {
        name: "MIT",
        countryCode: "US",
      },
      publicationYears: [currentYear],
      mostRecentRelevantYear: currentYear,
    });

    expect(scored.scoreBreakdown.recency).toBe(15);
    expect(scored.scoreBreakdown.geography).toBeGreaterThanOrEqual(7);
  });
});
