import { describe, expect, it } from "vitest";
import {
  aggregateAuthors,
  dedupeWorks,
  dedupeWorksById,
} from "@/lib/talent-mapper/aggregate-authors";
import { getDemoCriteria } from "@/lib/talent-mapper/criteria";
import type { ScholarlyWork } from "@/lib/talent-mapper/types";

function makeWork(
  overrides: Partial<ScholarlyWork> &
    Pick<ScholarlyWork, "id" | "title" | "authorships">,
): ScholarlyWork {
  return {
    topics: ["Virology"],
    keywords: [],
    isRetracted: false,
    year: 2024,
    ...overrides,
  };
}

describe("aggregateAuthors", () => {
  const criteria = getDemoCriteria();

  it("deduplicates works by OpenAlex work ID", () => {
    const works = [
      makeWork({
        id: "https://openalex.org/W111",
        title: "Viral rescue of influenza",
        abstract: "viral rescue reverse genetics",
        authorships: [
          {
            authorId: "A1",
            name: "Ada",
            institutions: [{ name: "MIT", countryCode: "US" }],
          },
        ],
      }),
      makeWork({
        id: "W111",
        title: "Viral rescue of influenza (dup)",
        abstract: "viral rescue reverse genetics",
        authorships: [
          {
            authorId: "A1",
            name: "Ada",
            institutions: [{ name: "MIT", countryCode: "US" }],
          },
        ],
      }),
    ];

    expect(dedupeWorks(works)).toHaveLength(1);
    expect(dedupeWorksById(works)).toHaveLength(1);

    const candidates = aggregateAuthors(works, criteria);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].relevantWorkCount).toBe(1);
  });

  it("deduplicates authors by author ID and sorts by score desc", () => {
    const works = [
      makeWork({
        id: "W1",
        title: "Viral rescue and reverse genetics for influenza",
        abstract:
          "We report viral rescue, reverse genetics, molecular cloning, mammalian cell culture, transfection, and PCR methods.",
        year: 2024,
        authorships: [
          {
            authorId: "https://openalex.org/A100",
            name: "High Match",
            institutions: [
              { name: "Broad Institute", countryCode: "US" },
            ],
          },
        ],
      }),
      makeWork({
        id: "W2",
        title: "Notes on transfection assays",
        abstract: "Transfection in mammalian cell culture.",
        year: 2018,
        authorships: [
          {
            authorId: "A200",
            name: "Lower Match",
            institutions: [{ name: "Example Lab", countryCode: "DE" }],
          },
        ],
      }),
      makeWork({
        id: "W3",
        title: "Another viral rescue study",
        abstract: "viral rescue influenza reverse genetics",
        year: 2023,
        authorships: [
          {
            authorId: "A100",
            name: "High Match",
            institutions: [
              { name: "Harvard Medical School", countryCode: "US" },
            ],
          },
        ],
      }),
    ];

    const candidates = aggregateAuthors(works, criteria);
    expect(candidates.map((c) => c.authorId)).toEqual(["A100", "A200"]);
    expect(candidates[0].score).toBeGreaterThanOrEqual(candidates[1].score);
    expect(candidates[0].relevantWorkCount).toBe(2);
    expect(candidates[0].likelyInstitution?.name).toBe("Broad Institute");
  });

  it("skips retracted works by default", () => {
    const works = [
      makeWork({
        id: "W9",
        title: "Retracted viral rescue paper",
        abstract: "viral rescue reverse genetics influenza",
        isRetracted: true,
        authorships: [
          {
            authorId: "A9",
            name: "Retracted Author",
            institutions: [{ name: "Somewhere", countryCode: "US" }],
          },
        ],
      }),
    ];

    expect(aggregateAuthors(works, criteria)).toHaveLength(0);
  });
});
