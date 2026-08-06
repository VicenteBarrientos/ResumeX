import { describe, expect, it } from "vitest";
import { DEMO_JOB_DESCRIPTION, DEMO_RESUME } from "@/lib/demo-data";
import {
  getDemoCareerAnalysis,
  getDemoCoverLetter,
  isCareerDemoInput,
  isCareerDemoJobDescription,
} from "@/lib/demo-career";

describe("demo-career", () => {
  it("detects exact Try-demo payloads only", () => {
    expect(isCareerDemoInput(DEMO_RESUME, DEMO_JOB_DESCRIPTION)).toBe(true);
    expect(isCareerDemoInput(` ${DEMO_RESUME} `, ` ${DEMO_JOB_DESCRIPTION} `)).toBe(true);
    expect(isCareerDemoInput(DEMO_RESUME, "other jd")).toBe(false);
    expect(isCareerDemoJobDescription(DEMO_JOB_DESCRIPTION)).toBe(true);
    expect(isCareerDemoJobDescription("other")).toBe(false);
  });

  it("returns analysis with literal resume quotes and no invented evidence", () => {
    const result = getDemoCareerAnalysis();
    expect(result.matchScore).toBe(86);
    expect(result.mustHaveCriteria.length).toBeGreaterThan(0);
    for (const item of result.mustHaveCriteria) {
      if (item.status === "met") {
        expect(item.quote.length).toBeGreaterThan(0);
        expect(DEMO_RESUME).toContain(item.quote);
        expect(item.aiInferred).toBe(false);
      }
    }
    expect(result.niceToHaveCriteria.some((c) => c.status === "insufficient")).toBe(true);
  });

  it("builds a cover letter that names company and role", () => {
    const letter = getDemoCoverLetter("Acme", "Engineer");
    expect(letter).toContain("Acme");
    expect(letter).toContain("Engineer");
    expect(letter).toMatch(/Dear Hiring Team/);
  });
});
