import { describe, expect, it } from "vitest";
import {
  parseCriteriaPayload,
  toSearchDetail,
  toSearchSummary,
} from "@/lib/talent-mapper/search-store";

describe("search-store mappers", () => {
  it("parses criteria payload shape", () => {
    expect(parseCriteriaPayload({ criteria: null, extractedCriteria: null })).toEqual({
      criteria: null,
      extractedCriteria: null,
    });
  });

  it("builds list summaries with shortlist counts", () => {
    const summary = toSearchSummary({
      id: "s1",
      roleTitle: "Virologist",
      jobDescription: "JD",
      criteriaJson: {},
      queriesJson: [],
      mode: "demo",
      resultJson: { candidates: [{}, {}], meta: { worksReviewed: 12 } },
      worksReviewed: 12,
      uiStep: "results",
      createdAt: new Date("2026-08-05T12:00:00.000Z"),
      updatedAt: new Date("2026-08-05T13:00:00.000Z"),
      _count: { shortlist: 2 },
    });

    expect(summary).toMatchObject({
      id: "s1",
      roleTitle: "Virologist",
      mode: "demo",
      candidateCount: 2,
      shortlistedCount: 2,
      worksReviewed: 12,
    });
  });

  it("builds detail DTOs with notes map", () => {
    const detail = toSearchDetail({
      id: "s1",
      roleTitle: "Virologist",
      jobDescription: "JD text",
      criteriaJson: { criteria: null, extractedCriteria: null },
      queriesJson: [],
      mode: "live",
      resultJson: null,
      worksReviewed: 0,
      uiStep: "criteria",
      createdAt: new Date("2026-08-05T12:00:00.000Z"),
      updatedAt: new Date("2026-08-05T13:00:00.000Z"),
      shortlist: [{ authorId: "A1" }],
      notes: [{ authorId: "A1", body: "Promising" }],
    });

    expect(detail.mode).toBe("live");
    expect(detail.shortlist).toEqual(["A1"]);
    expect(detail.notes).toEqual({ A1: "Promising" });
    expect(detail.step).toBe("criteria");
  });
});
