import { describe, expect, it } from "vitest";
import { getDemoCriteria } from "@/lib/talent-mapper/criteria";
import { matchEvidence, normalizeText } from "@/lib/talent-mapper/evidence";
import type { ScholarlyWork } from "@/lib/talent-mapper/types";

function work(
  partial: Partial<ScholarlyWork> & Pick<ScholarlyWork, "id" | "title">,
): ScholarlyWork {
  return {
    topics: [],
    keywords: [],
    isRetracted: false,
    authorships: [],
    ...partial,
  };
}

describe("matchEvidence", () => {
  const criteria = getDemoCriteria();

  it("normalizes text by lowercasing and collapsing whitespace", () => {
    expect(normalizeText("  Viral   Rescue\nSystem ")).toBe(
      "viral rescue system",
    );
  });

  it("returns direct confidence for exact phrase matches", () => {
    const matches = matchEvidence(
      work({
        id: "W1",
        title: "Generation and rescue of recombinant influenza A viruses",
        abstract:
          "We describe a viral rescue and reverse genetics platform for influenza.",
      }),
      criteria,
    );

    const viralRescue = matches.find(
      (m) => m.criterion === "Viral rescue" && m.confidence === "direct",
    );
    const reverseGenetics = matches.find(
      (m) => m.criterion === "Reverse genetics" && m.confidence === "direct",
    );

    expect(viralRescue).toBeDefined();
    expect(reverseGenetics).toBeDefined();
    expect(viralRescue!.matchType).toBe("exact");
    expect(viralRescue!.snippet.length).toBeLessThanOrEqual(140);
  });

  it("matches topics and keywords as evidence corpus", () => {
    const matches = matchEvidence(
      work({
        id: "W2",
        title: "Methods paper",
        topics: ["Virology"],
        keywords: ["mammalian cell culture"],
      }),
      criteria,
    );

    expect(
      matches.some(
        (m) => m.criterion === "Virology" && m.confidence === "direct",
      ),
    ).toBe(true);
    expect(
      matches.some(
        (m) =>
          m.criterion === "Mammalian cell culture" &&
          m.confidence === "direct",
      ),
    ).toBe(true);
  });
});
