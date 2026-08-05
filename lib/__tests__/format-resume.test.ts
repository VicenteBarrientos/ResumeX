import { beforeEach, describe, expect, it, vi } from "vitest";
import { FORMAT_MODEL, formatResume } from "@/lib/format-resume";

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

function completionFrom(content: unknown, usage = { prompt_tokens: 10, completion_tokens: 20 }) {
  return {
    choices: [{ message: { content: typeof content === "string" ? content : JSON.stringify(content) } }],
    usage,
  };
}

const MINIMAL_VALID = {
  contact: { name: "Ada Lovelace" },
  summary: "",
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  languages: [],
};

describe("formatResume", () => {
  beforeEach(() => {
    createCompletion.mockReset();
    constructOpenAI.mockReset();
  });

  it("normalizes a full model payload into FormattedResume shape", async () => {
    createCompletion.mockResolvedValue(
      completionFrom({
        contact: {
          name: "  Ada Lovelace ",
          title: " Mathematician ",
          email: "ada@example.com",
          phone: "555",
          location: "London",
          linkedin: "https://linkedin.com/in/ada",
          website: "https://ada.dev",
        },
        summary: " Pioneer of computing. ",
        experience: [
          {
            company: " Analytical Engine ",
            role: " Programmer ",
            location: "  ",
            dates: "1843",
            bullets: [" Wrote notes ", "", 42, " Designed loops "],
          },
        ],
        education: [
          {
            institution: " Home ",
            degree: " Self-taught ",
            location: "",
            dates: "",
            details: [" Mentored by Babbage ", null],
          },
        ],
        skills: [" Algebra ", "", " Logic "],
        projects: [{ name: " Notes ", description: " On the Engine ", bullets: [" Published "] }],
        certifications: [{ name: " None ", issuer: "", date: "" }],
        languages: [" English ", " French ", 7],
      }),
    );

    const { result, usage } = await formatResume("raw resume text", "sk-test");

    expect(constructOpenAI).toHaveBeenCalledWith({ apiKey: "sk-test" });
    expect(createCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        model: FORMAT_MODEL,
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    );
    expect(result.contact).toEqual({
      name: "Ada Lovelace",
      title: "Mathematician",
      email: "ada@example.com",
      phone: "555",
      location: "London",
      linkedin: "https://linkedin.com/in/ada",
      website: "https://ada.dev",
    });
    expect(result.summary).toBe("Pioneer of computing.");
    expect(result.experience).toEqual([
      {
        company: "Analytical Engine",
        role: "Programmer",
        location: "",
        dates: "1843",
        bullets: ["Wrote notes", "Designed loops"],
      },
    ]);
    expect(result.education[0]?.details).toEqual(["Mentored by Babbage"]);
    expect(result.skills).toEqual(["Algebra", "Logic"]);
    expect(result.languages).toEqual(["English", "French"]);
    expect(usage).toEqual({
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
      estimatedCostUsd: expect.any(Number),
    });
    expect(usage.estimatedCostUsd).toBeGreaterThan(0);
  });

  it("fills missing sections with empty strings and arrays", async () => {
    createCompletion.mockResolvedValue(
      completionFrom({
        contact: { name: "Only Name" },
      }),
    );

    const { result } = await formatResume("thin resume", "sk-test");

    expect(result.contact.title).toBe("");
    expect(result.contact.email).toBe("");
    expect(result.summary).toBe("");
    expect(result.experience).toEqual([]);
    expect(result.education).toEqual([]);
    expect(result.skills).toEqual([]);
    expect(result.projects).toEqual([]);
    expect(result.certifications).toEqual([]);
    expect(result.languages).toEqual([]);
  });

  it("accepts experience-only resumes without a contact name", async () => {
    createCompletion.mockResolvedValue(
      completionFrom({
        contact: {},
        experience: [{ company: "Acme", role: "Eng", bullets: ["Shipped"] }],
      }),
    );

    const { result } = await formatResume("resume", "sk-test");

    expect(result.contact.name).toBe("");
    expect(result.experience).toHaveLength(1);
  });

  it("throws NO_ANALYSIS when the model returns empty content", async () => {
    createCompletion.mockResolvedValue({
      choices: [{ message: { content: "" } }],
      usage: {},
    });

    await expect(formatResume("resume", "sk-test")).rejects.toThrow("NO_ANALYSIS");
  });

  it("throws MALFORMED_ANALYSIS when there is no name and no experience", async () => {
    createCompletion.mockResolvedValue(
      completionFrom({
        contact: { name: "" },
        experience: [],
        skills: ["TypeScript"],
      }),
    );

    await expect(formatResume("resume", "sk-test")).rejects.toThrow("MALFORMED_ANALYSIS");
  });

  it("rethrows when the model returns invalid JSON", async () => {
    createCompletion.mockResolvedValue(completionFrom("not-json{"));

    await expect(formatResume("resume", "sk-test")).rejects.toThrow();
  });

  it("treats non-array section payloads as empty lists", async () => {
    createCompletion.mockResolvedValue(
      completionFrom({
        ...MINIMAL_VALID,
        experience: "not-an-array",
        education: null,
        skills: "TypeScript",
        projects: 3,
        certifications: {},
        languages: "English",
      }),
    );

    const { result } = await formatResume("resume", "sk-test");

    expect(result.experience).toEqual([]);
    expect(result.education).toEqual([]);
    expect(result.skills).toEqual([]);
    expect(result.projects).toEqual([]);
    expect(result.certifications).toEqual([]);
    expect(result.languages).toEqual([]);
  });
});
