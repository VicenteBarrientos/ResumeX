import { describe, expect, it } from "vitest";
import { escapeCsv, exportShortlistCsv } from "../export-csv";
import type { ResearcherCandidate } from "../types";

function stubCandidate(over: Partial<ResearcherCandidate> = {}): ResearcherCandidate {
  return {
    authorId: "https://openalex.org/A1",
    name: 'Ada "Demo" Example',
    openAlexUrl: "https://openalex.org/A1",
    relevantWorks: [],
    matchedRequiredCriteria: [
      {
        criterion: "Viral rescue",
        matchType: "exact",
        workTitle: "Rescue of X",
        confidence: "direct",
        workId: "W1",
        snippet: "viral rescue",
      },
    ],
    matchedPreferredCriteria: [],
    matchedResearchAreas: [],
    matchedOrganismsOrSystems: [],
    publicationYears: [2024],
    mostRecentRelevantYear: 2024,
    relevantWorkCount: 1,
    totalCitationCountForRelevantWorks: 3,
    score: 70,
    scoreBreakdown: {
      requiredTechniques: 30,
      researchArea: 15,
      recency: 12,
      repeatedEvidence: 4,
      geography: 6,
      seniority: 3,
      total: 70,
    },
    evidenceSummary: "Public research evidence…",
    outreachAngle: "Ask about viral rescue",
    possibleConcerns: [],
    unknowns: ["Current employment"],
    likelyInstitution: { name: "Example Lab, Cambridge", countryCode: "US" },
    ...over,
  };
}

describe("export-csv", () => {
  it("escapes commas quotes and newlines", () => {
    expect(escapeCsv("a,b")).toBe('"a,b"');
    expect(escapeCsv('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsv("line1\nline2")).toBe('"line1\nline2"');
  });

  it("exports shortlist rows", () => {
    const csv = exportShortlistCsv([stubCandidate()], { searchMode: "demo" });
    expect(csv).toContain("Name");
    expect(csv).toContain('"Ada ""Demo"" Example"');
    expect(csv).toContain("Viral rescue");
    expect(csv).toContain("demo");
  });
});
