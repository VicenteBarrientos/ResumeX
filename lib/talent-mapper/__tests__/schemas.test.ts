import { describe, expect, it } from "vitest";
import { getDemoCriteria } from "@/lib/talent-mapper/criteria";
import {
  normalizeOpenAlexHttpError,
  normalizeTalentMapperError,
  normalizeUnknownError,
} from "@/lib/talent-mapper/errors";
import {
  parseExtractCriteriaRequest,
  parseOutreachResponse,
  parseSearchRequest,
  parseSourcingCriteria,
  safeParseSourcingCriteria,
  sourcingCriteriaSchema,
} from "@/lib/talent-mapper/schemas";

describe("talent-mapper schemas", () => {
  it("parses valid sourcing criteria", () => {
    const criteria = getDemoCriteria();
    expect(parseSourcingCriteria(criteria)).toEqual(criteria);
    expect(safeParseSourcingCriteria(criteria).success).toBe(true);
  });

  it("rejects missing role title", () => {
    const result = sourcingCriteriaSchema.safeParse({
      ...getDemoCriteria(),
      roleTitle: "",
    });
    expect(result.success).toBe(false);
  });

  it("parses extract request and rejects empty JD", () => {
    expect(
      parseExtractCriteriaRequest({
        jobDescription: "Scientist role with viral rescue experience",
      }).jobDescription.length,
    ).toBeGreaterThan(0);

    expect(() =>
      parseExtractCriteriaRequest({ jobDescription: "" }),
    ).toThrow(/Invalid extract request/i);
  });

  it("parses search request with defaults", () => {
    const parsed = parseSearchRequest({
      criteria: getDemoCriteria(),
      queries: [
        {
          id: "q1",
          label: "Core",
          group: "core",
          query: '"viral rescue"',
          enabled: true,
        },
      ],
    });

    expect(parsed.mode).toBe("live");
    expect(parsed.queries).toHaveLength(1);
  });

  it("parses outreach response", () => {
    const parsed = parseOutreachResponse({
      body: "Hi Ada — I came across your work on viral rescue...",
      tone: "concise",
    });
    expect(parsed.referencedWorks).toEqual([]);
    expect(parsed.warnings).toEqual([]);
  });
});

describe("openalex error normalization", () => {
  it("maps 429 to rate limit with action", () => {
    const err = normalizeOpenAlexHttpError(429);
    expect(err.code).toBe("openalex_rate_limit");
    expect(err.action.length).toBeGreaterThan(0);
  });

  it("maps abort to timeout via normalizeUnknownError", () => {
    const err = normalizeUnknownError(new Error("The operation was aborted"));
    expect(err.code).toBe("openalex_timeout");
  });

  it("maps missing key message", () => {
    const err = normalizeUnknownError(
      new Error("OPENALEX_API_KEY is not configured"),
    );
    expect(err.code).toBe("missing_openalex_key");
  });

  it("never includes secret values in messages", () => {
    const err = normalizeOpenAlexHttpError(
      401,
      "invalid api_key=sk-secret-should-not-leak",
    );
    expect(err.message.toLowerCase()).not.toContain("sk-secret");
    expect(normalizeTalentMapperError(err).code).toBe("invalid_openalex_key");
  });
});
