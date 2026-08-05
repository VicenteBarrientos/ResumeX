import { describe, expect, it } from "vitest";
import {
  normalizeCriteriaItem,
  normalizeStrongMatch,
  resumeContainsQuote,
} from "@/lib/criteria-evidence";

const RESUME = "Full-stack engineer with 5 years of experience building React apps.";

describe("resumeContainsQuote", () => {
  it("matches across whitespace differences", () => {
    expect(
      resumeContainsQuote(RESUME, "5 years of\nexperience building"),
    ).toBe(true);
  });

  it("rejects invented text", () => {
    expect(resumeContainsQuote(RESUME, "10 years of Kubernetes")).toBe(false);
  });
});

describe("normalizeCriteriaItem", () => {
  it("keeps verbatim met evidence", () => {
    expect(
      normalizeCriteriaItem(
        {
          criterion: "Years of experience",
          status: "met",
          quote: "5 years of experience",
          aiInferred: false,
        },
        RESUME,
      ),
    ).toEqual({
      criterion: "Years of experience",
      status: "met",
      quote: "5 years of experience",
      aiInferred: false,
    });
  });

  it("forces empty quote when status is insufficient", () => {
    expect(
      normalizeCriteriaItem(
        {
          criterion: "Fintech",
          status: "insufficient",
          quote: "should be cleared",
          aiInferred: true,
        },
        RESUME,
      ),
    ).toEqual({
      criterion: "Fintech",
      status: "insufficient",
      quote: "",
      aiInferred: false,
    });
  });

  it("downgrades fabricated quotes to insufficient", () => {
    expect(
      normalizeCriteriaItem(
        {
          criterion: "Kubernetes",
          status: "met",
          quote: "Expert in Kubernetes and Helm",
          aiInferred: false,
        },
        RESUME,
      ),
    ).toEqual({
      criterion: "Kubernetes",
      status: "insufficient",
      quote: "",
      aiInferred: true,
    });
  });
});

describe("normalizeStrongMatch", () => {
  it("drops matches without a resume quote", () => {
    expect(
      normalizeStrongMatch(
        {
          match: "Cloud",
          quote: "Deployed to AWS Lambda",
          aiInferred: false,
        },
        RESUME,
      ),
    ).toBeNull();
  });
});
