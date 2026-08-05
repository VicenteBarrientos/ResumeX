import { beforeEach, describe, expect, it, vi } from "vitest";
import { PARSE_PROFILE_MODEL, parseProfileFromResume } from "@/lib/parse-profile";

const { createCompletion, constructOpenAI } = vi.hoisted(() => ({
  createCompletion: vi.fn(),
  constructOpenAI: vi.fn(),
}));

vi.mock("openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("openai")>();

  class MockOpenAI {
    chat = {
      completions: {
        create: createCompletion,
      },
    };

    constructor(options: unknown) {
      constructOpenAI(options);
    }
  }

  return { ...actual, default: MockOpenAI };
});

function completionFrom(content: unknown, usage = { prompt_tokens: 11, completion_tokens: 22 }) {
  return {
    choices: [{ message: { content: typeof content === "string" ? content : JSON.stringify(content) } }],
    usage,
  };
}

describe("parseProfileFromResume", () => {
  beforeEach(() => {
    createCompletion.mockReset();
    constructOpenAI.mockReset();
  });

  it("normalizes a well-formed resume payload into CandidateProfile", async () => {
    createCompletion.mockResolvedValue(
      completionFrom({
        personal: {
          firstName: "Ada",
          lastName: "Lovelace",
          email: "ada@example.com",
          phone: "555",
          location: "London",
          linkedinUrl: "https://linkedin.com/in/ada",
          githubUrl: "https://github.com/ada",
        },
        target: {
          roles: ["Software Engineer", "Staff Engineer"],
          salaryMin: 140000,
          salaryMax: 180000,
          currency: "USD",
          remote: true,
          willingToRelocate: false,
          startAvailability: "Immediate",
        },
        experience: {
          totalYears: 7.6,
          currentTitle: "Engineer",
          currentCompany: "Analytical Engine",
          summary: "Computing pioneer.",
        },
        skills: ["Algebra", "Logic"],
        workAuthorization: {
          country: "UK",
          status: "Citizen",
          requiresSponsorship: false,
        },
        coverLetterTemplate: "I am applying for {role} at {company}.",
      }),
    );

    const { profile, usage } = await parseProfileFromResume("Ada resume…", "sk-test");

    expect(constructOpenAI).toHaveBeenCalledWith({ apiKey: "sk-test" });
    expect(createCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        model: PARSE_PROFILE_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    );
    expect(profile.personal.firstName).toBe("Ada");
    expect(profile.target.roles).toEqual(["Software Engineer", "Staff Engineer"]);
    expect(profile.experience.totalYears).toBe(8);
    expect(profile.skills).toEqual(["Algebra", "Logic"]);
    expect(profile.coverLetterTemplate).toContain("{role}");
    expect(usage).toEqual({
      promptTokens: 11,
      completionTokens: 22,
      totalTokens: 33,
      estimatedCostUsd: expect.any(Number),
    });
    expect(usage.estimatedCostUsd).toBeGreaterThan(0);
  });

  it("fills defaults for missing or empty extraction fields", async () => {
    createCompletion.mockResolvedValue(completionFrom({}));

    const { profile } = await parseProfileFromResume("unstructured text", "sk-test");

    expect(profile.personal).toEqual({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      location: "",
      linkedinUrl: "",
      githubUrl: "",
    });
    expect(profile.target).toEqual({
      roles: [],
      salaryMin: 0,
      salaryMax: 0,
      currency: "USD",
      remote: false,
      willingToRelocate: false,
      startAvailability: "2 weeks",
    });
    expect(profile.experience).toEqual({
      totalYears: 0,
      currentTitle: "",
      currentCompany: "",
      summary: "",
    });
    expect(profile.skills).toEqual([]);
    expect(profile.workAuthorization).toEqual({
      country: "",
      status: "",
      requiresSponsorship: false,
    });
    expect(profile.coverLetterTemplate).toBe("");
  });

  it("coerces invalid skills/roles arrays to empty and clamps negative years", async () => {
    createCompletion.mockResolvedValue(
      completionFrom({
        target: { roles: ["ok", 3], salaryMin: "bad", salaryMax: null },
        experience: { totalYears: -2.2 },
        skills: "not-an-array",
      }),
    );

    const { profile } = await parseProfileFromResume("resume", "sk-test");

    expect(profile.target.roles).toEqual([]);
    expect(profile.target.salaryMin).toBe(0);
    expect(profile.target.salaryMax).toBe(0);
    expect(profile.experience.totalYears).toBe(0);
    expect(profile.skills).toEqual([]);
  });

  it("throws NO_PROFILE when the model returns empty content", async () => {
    createCompletion.mockResolvedValue({
      choices: [{ message: { content: null } }],
      usage: {},
    });

    await expect(parseProfileFromResume("resume", "sk-test")).rejects.toThrow("NO_PROFILE");
  });

  it("throws MALFORMED_PROFILE when the model returns invalid JSON", async () => {
    createCompletion.mockResolvedValue(completionFrom("{not-json"));

    await expect(parseProfileFromResume("resume", "sk-test")).rejects.toThrow(
      "MALFORMED_PROFILE",
    );
  });
});
