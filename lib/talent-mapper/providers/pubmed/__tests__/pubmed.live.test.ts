/**
 * Optional live PubMed smoke — skipped unless NCBI_EMAIL is set.
 * Run: npm run test:pubmed:live
 */
import { describe, expect, it } from "vitest";

const email = process.env.NCBI_EMAIL?.trim();

describe.runIf(Boolean(email))("pubmed live smoke", () => {
  it(
    "retrieves and normalizes a tiny PubMed result set",
    async () => {
      const { searchPubmedWorks } = await import(
        "@/lib/talent-mapper/providers/pubmed/client"
      );
      const result = await searchPubmedWorks({
        queries: [
          {
            id: "smoke",
            label: "Smoke",
            group: "core",
            enabled: true,
            query:
              '("reverse genetics"[tiab]) AND influenza[tiab] AND hasabstract',
          },
        ],
        criteria: {
          roleTitle: "Smoke",
          roleSummary: "",
          requiredTechniques: ["Reverse genetics"],
          preferredTechniques: [],
          researchAreas: ["Virology"],
          organismsOrSystems: ["Influenza"],
          adjacentTerms: [],
          senioritySignals: [],
          location: {},
          exclusions: [],
          recruiterNotes: [],
        },
        limitPerQuery: 3,
        totalResultLimit: 5,
      });

      expect(result.diagnostics.status).toBe("success");
      expect(result.records.length).toBeGreaterThan(0);
      expect(result.records[0].pmid).toBeTruthy();
      expect(result.records[0].title.length).toBeGreaterThan(0);
    },
    60_000,
  );
});

describe.runIf(!email)("pubmed live smoke (skipped)", () => {
  it("documents that NCBI_EMAIL is required", () => {
    expect(email).toBeFalsy();
  });
});
