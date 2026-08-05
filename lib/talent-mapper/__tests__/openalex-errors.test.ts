import { describe, expect, it } from "vitest";
import {
  TalentMapperError,
  normalizeOpenAlexHttpError,
  normalizeTalentMapperError,
} from "@/lib/talent-mapper/errors";

describe("OpenAlex / Talent Mapper error normalization", () => {
  it("maps missing/invalid key statuses", () => {
    const invalid = normalizeOpenAlexHttpError(401, "unauthorized");
    expect(invalid).toBeInstanceOf(TalentMapperError);
    expect(invalid.code).toBe("invalid_openalex_key");
    expect(invalid.message.toLowerCase()).toContain("api key");
  });

  it("maps rate limit and quota bodies", () => {
    const rate = normalizeOpenAlexHttpError(429, "too many requests");
    expect(rate.code).toBe("openalex_rate_limit");

    const quota = normalizeOpenAlexHttpError(429, "quota exceeded");
    expect(quota.code).toBe("openalex_quota");
  });

  it("maps timeout and unavailable statuses", () => {
    expect(normalizeOpenAlexHttpError(504).code).toBe("openalex_timeout");
    expect(normalizeOpenAlexHttpError(503).code).toBe("openalex_unavailable");
    expect(normalizeOpenAlexHttpError(500).code).toBe("openalex_unavailable");
  });

  it("passes through existing TalentMapperError", () => {
    const original = new TalentMapperError(
      "Live search is not configured.",
      "missing_openalex_key",
      503,
    );
    expect(normalizeTalentMapperError(original)).toBe(original);
  });

  it("normalizes empty shortlist and empty JD messages", () => {
    expect(
      normalizeTalentMapperError(new Error("empty shortlist")).code,
    ).toBe("empty_shortlist");
    expect(
      normalizeTalentMapperError(new Error("empty job description")).code,
    ).toBe("empty_job_description");
  });

  it("never includes secret values in messages", () => {
    const err = normalizeOpenAlexHttpError(
      401,
      "invalid api_key=sk-secret-should-not-leak",
    );
    expect(err.message.toLowerCase()).not.toContain("sk-secret");
    expect(err.message).toContain("OPENALEX_API_KEY");
  });
});
