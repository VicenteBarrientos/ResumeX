import { describe, expect, it } from "vitest";
import { mergeScholarlyWorks } from "@/lib/talent-mapper/merge/merge-works";
import { reconcileAuthorsOnWorks } from "@/lib/talent-mapper/merge/reconcile-authors";
import { matchEvidence } from "@/lib/talent-mapper/evidence";
import { aggregateAuthors } from "@/lib/talent-mapper/aggregate-authors";
import { getDemoCriteria } from "@/lib/talent-mapper/criteria";
import { exportShortlistCsv } from "@/lib/talent-mapper/export-csv";
import type { ScholarlyWork } from "@/lib/talent-mapper/types";

function work(overrides: Partial<ScholarlyWork> & Pick<ScholarlyWork, "id" | "title">): ScholarlyWork {
  return {
    topics: [],
    keywords: [],
    isRetracted: false,
    authorships: [],
    ...overrides,
  };
}

describe("mergeScholarlyWorks", () => {
  it("merges on DOI and counts once", () => {
    const merged = mergeScholarlyWorks([
      work({
        id: "W1",
        title: "Viral rescue of influenza",
        year: 2023,
        doi: "https://doi.org/10.1000/Demo.DOI",
        sources: ["openalex"],
        openAlexId: "W1",
        abstract: "viral rescue reverse genetics",
        authorships: [
          {
            authorId: "A1",
            name: "Jordan Exemplar",
            institutions: [{ name: "Demo Lab" }],
          },
        ],
      }),
      work({
        id: "pmid:999",
        title: "Viral rescue of influenza",
        year: 2023,
        doi: "10.1000/demo.doi",
        pmid: "999",
        sources: ["pubmed"],
        meshTerms: ["Reverse Genetics"],
        abstract: "BACKGROUND: viral rescue",
        authorships: [
          {
            authorId: "pubmed-provisional:jordan exemplar|demo lab",
            name: "Jordan Exemplar",
            institutions: [{ name: "Demo Lab", type: "publication_affiliation" }],
            affiliationTexts: ["Demo Lab"],
          },
        ],
      }),
    ]);

    expect(merged.diagnostics.canonicalWorkCount).toBe(1);
    expect(merged.diagnostics.mergedDuplicateCount).toBe(1);
    expect(merged.works[0].sources).toEqual(["openalex", "pubmed"]);
    expect(merged.works[0].pmid).toBe("999");
    expect(merged.works[0].meshTerms).toContain("Reverse Genetics");
  });

  it("does not merge on loose title similarity", () => {
    const merged = mergeScholarlyWorks([
      work({
        id: "W1",
        title: "Viral rescue of influenza A",
        year: 2023,
        sources: ["openalex"],
      }),
      work({
        id: "pmid:1",
        title: "Viral rescue of influenza B strains",
        year: 2023,
        pmid: "1",
        sources: ["pubmed"],
      }),
    ]);
    expect(merged.works).toHaveLength(2);
  });

  it("merges exact title + year fallback", () => {
    const merged = mergeScholarlyWorks([
      work({
        id: "W1",
        title: "Exact Same Title Here",
        year: 2022,
        sources: ["openalex"],
      }),
      work({
        id: "pmid:2",
        title: "Exact Same Title Here",
        year: 2022,
        pmid: "2",
        sources: ["pubmed"],
      }),
    ]);
    expect(merged.works).toHaveLength(1);
  });
});

describe("reconcileAuthorsOnWorks", () => {
  it("merges by ORCID", () => {
    const works = reconcileAuthorsOnWorks([
      work({
        id: "W1",
        title: "Paper",
        authorships: [
          {
            authorId: "A100",
            name: "Jordan Exemplar",
            orcid: "https://orcid.org/0000-0002-1825-0097",
            institutions: [],
          },
          {
            authorId: "pubmed-provisional:other|x",
            name: "Other Person",
            orcid: "0000-0002-1825-0097",
            institutions: [],
          },
        ],
      }),
    ]);
    const ids = new Set(works[0].authorships.map((a) => a.authorId));
    expect(ids.size).toBe(1);
  });

  it("keeps ambiguous identical names on different works separate", () => {
    const works = reconcileAuthorsOnWorks([
      work({
        id: "pmid:1",
        title: "One",
        authorships: [
          {
            authorId: "pubmed-provisional:john smith|lab a",
            name: "John Smith",
            institutions: [{ name: "Lab A" }],
            affiliationTexts: ["Lab A"],
          },
        ],
      }),
      work({
        id: "pmid:2",
        title: "Two",
        authorships: [
          {
            authorId: "pubmed-provisional:john smith|lab b",
            name: "John Smith",
            institutions: [{ name: "Lab B" }],
            affiliationTexts: ["Lab B"],
          },
        ],
      }),
    ]);
    expect(works[0].authorships[0].authorId).not.toBe(
      works[1].authorships[0].authorId,
    );
  });
});

describe("evidence + scoring double-count guards", () => {
  const criteria = getDemoCriteria();

  it("MeSH-only match scores below direct abstract match", () => {
    const direct = matchEvidence(
      work({
        id: "W1",
        title: "Study",
        abstract: "We report viral rescue using reverse genetics.",
        authorships: [
          { authorId: "A1", name: "A", institutions: [] },
        ],
      }),
      criteria,
    );
    const meshOnly = matchEvidence(
      work({
        id: "W2",
        title: "Unrelated title",
        meshTerms: ["Viral rescue", "Reverse Genetics"],
        authorships: [
          { authorId: "A1", name: "A", institutions: [] },
        ],
      }),
      criteria,
    );
    const directReq = direct.find((m) =>
      /viral rescue|reverse genetics/i.test(m.criterion),
    );
    const meshReq = meshOnly.find((m) =>
      /viral rescue|reverse genetics/i.test(m.criterion),
    );
    expect(directReq?.confidence).toBe("direct");
    expect(meshReq?.confidence).toBe("topical");
  });

  it("retracted publications produce no positive evidence", () => {
    const matches = matchEvidence(
      work({
        id: "pmid:r",
        title: "viral rescue reverse genetics",
        abstract: "viral rescue reverse genetics influenza",
        isRetracted: true,
        retractionStatus: "retracted",
        authorships: [{ authorId: "A1", name: "A", institutions: [] }],
      }),
      criteria,
    );
    expect(matches).toHaveLength(0);
  });

  it("review articles get weaker hands-on evidence than methods papers", () => {
    const review = matchEvidence(
      work({
        id: "R1",
        title: "Review of viral rescue",
        abstract: "This review covers viral rescue and reverse genetics.",
        publicationTypes: ["Review"],
        authorships: [{ authorId: "A1", name: "A", institutions: [] }],
      }),
      criteria,
    );
    const methods = matchEvidence(
      work({
        id: "M1",
        title: "Protocol for viral rescue",
        abstract: "This methods paper covers viral rescue and reverse genetics.",
        publicationTypes: ["Journal Article"],
        authorships: [{ authorId: "A1", name: "A", institutions: [] }],
      }),
      criteria,
    );
    const reviewConf = review.find((m) => /viral rescue/i.test(m.criterion))
      ?.confidence;
    const methodsConf = methods.find((m) => /viral rescue/i.test(m.criterion))
      ?.confidence;
    expect(methodsConf).toBe("direct");
    expect(reviewConf).not.toBe("direct");
  });

  it("same paper from two sources is counted once in aggregation", () => {
    const merged = mergeScholarlyWorks([
      work({
        id: "W1",
        title: "Viral rescue and reverse genetics for influenza",
        year: 2024,
        doi: "10.1000/same",
        abstract:
          "viral rescue reverse genetics molecular cloning mammalian cell culture transfection",
        sources: ["openalex"],
        authorships: [
          {
            authorId: "A1",
            name: "Ada",
            authorPosition: "first",
            institutions: [{ name: "MIT", countryCode: "US" }],
          },
        ],
      }),
      work({
        id: "pmid:55",
        title: "Viral rescue and reverse genetics for influenza",
        year: 2024,
        doi: "10.1000/same",
        pmid: "55",
        abstract:
          "viral rescue reverse genetics molecular cloning mammalian cell culture transfection",
        sources: ["pubmed"],
        authorships: [
          {
            authorId: "A1",
            name: "Ada",
            authorPosition: "first",
            institutions: [{ name: "MIT", countryCode: "US" }],
          },
        ],
      }),
    ]);
    const candidates = aggregateAuthors(merged.works, criteria);
    expect(candidates[0].relevantWorkCount).toBe(1);
  });
});

describe("export CSV pubmed fields", () => {
  it("includes PMID/PubMed URL and excludes full abstracts", () => {
    const csv = exportShortlistCsv(
      [
        {
          authorId: "A1",
          name: "Ada",
          openAlexUrl: "https://openalex.org/A1",
          relevantWorks: [
            {
              id: "W1",
              title: "Paper",
              pmid: "123",
              pubmedUrl: "https://pubmed.ncbi.nlm.nih.gov/123/",
              matchedCriteria: ["Viral rescue"],
              abstractSnippet: "short excerpt only",
            },
          ],
          matchedRequiredCriteria: [
            {
              criterion: "Viral rescue",
              matchType: "exact",
              workTitle: "Paper",
              confidence: "direct",
              workId: "W1",
              snippet: "viral rescue",
              pmid: "123",
              pubmedUrl: "https://pubmed.ncbi.nlm.nih.gov/123/",
            },
          ],
          matchedPreferredCriteria: [],
          matchedResearchAreas: [],
          matchedOrganismsOrSystems: [],
          publicationYears: [2024],
          mostRecentRelevantYear: 2024,
          relevantWorkCount: 1,
          totalCitationCountForRelevantWorks: 0,
          score: 50,
          scoreBreakdown: {
            requiredTechniques: 20,
            researchArea: 10,
            recency: 10,
            repeatedEvidence: 3,
            geography: 5,
            seniority: 2,
            total: 50,
          },
          evidenceSummary: "summary",
          outreachAngle: "angle",
          possibleConcerns: [],
          unknowns: [],
        },
      ],
      { searchMode: "demo" },
    );
    expect(csv).toContain("PubMed URLs");
    expect(csv).toContain("PMIDs");
    expect(csv).toContain("123");
    expect(csv).toContain("pubmed.ncbi.nlm.nih.gov/123");
    expect(csv).not.toMatch(/BACKGROUND:[\s\S]{200,}/);
  });
});
