import {
  APIConnectionTimeoutError,
  APIError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
} from "openai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANALYSIS_MODEL,
  ANALYSIS_PROMPTS,
  analyzeForCareer,
  assessForTalent,
  validateCareerAnalysis,
  validateTalentAssessment,
} from "@/lib/analyze";
import {
  AnalysisError,
  getClientErrorMessage,
  logAnalysisError,
  normalizeAnalysisError,
} from "@/lib/analysis-errors";
import type { CareerAnalysis, TalentAssessment } from "@/lib/types";

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

const SAMPLE_RESUME =
  "Built TypeScript services. Led API delivery for two products. Mentored junior engineers.";

const VALID_CAREER: CareerAnalysis = {
  matchScore: 82,
  summary:
    "You already show TypeScript delivery. PostgreSQL is missing from the resume, so add concrete database work before you apply.",
  mustHaveCriteria: [
    {
      criterion: "TypeScript",
      status: "met",
      quote: "Built TypeScript services.",
      aiInferred: false,
    },
  ],
  niceToHaveCriteria: [
    {
      criterion: "PostgreSQL",
      status: "insufficient",
      quote: "",
      aiInferred: false,
    },
  ],
  strengths: ["Relevant TypeScript experience"],
  gaps: ["No PostgreSQL evidence"],
  matchedKeywords: ["TypeScript"],
  missingKeywords: ["PostgreSQL"],
  suggestions: [
    { title: "Add database context", detail: "Name the databases used in recent roles." },
  ],
};

const VALID_TALENT: TalentAssessment = {
  matchScore: 82,
  summary:
    "Advancing carries moderate risk because database evidence is absent. Validate PostgreSQL depth on a phone screen before an interview.",
  concernLevel: "Low",
  recommendedNextStep: "Interview",
  mustHaveCriteria: [
    {
      criterion: "TypeScript",
      status: "met",
      quote: "Built TypeScript services.",
      aiInferred: false,
    },
  ],
  niceToHaveCriteria: [
    {
      criterion: "PostgreSQL",
      status: "insufficient",
      quote: "",
      aiInferred: false,
    },
  ],
  strongMatches: [
    {
      match: "Backend delivery",
      quote: "Led API delivery for two products.",
      aiInferred: false,
    },
  ],
  phoneScreenQuestions: [
    "How did you structure the TypeScript services?",
    "Which databases have you used?",
    "How did you test the APIs?",
    "What scale did the services support?",
    "What did you own end to end?",
  ],
  clientFacingBullets: [
    "Relevant TypeScript delivery experience.",
    "Evidence of API ownership.",
    "Database background needs validation.",
  ],
  sendoutBlurb: "The candidate shows relevant TypeScript and API delivery experience.",
};

function mockCompletion(content: string | null, promptTokens = 120, completionTokens = 80) {
  createCompletion.mockResolvedValue({
    choices: [{ message: { content } }],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
    },
  });
}

function makeOpenAIError<T extends Error>(
  ErrorType: { prototype: T },
  message: string,
  fields: Record<string, unknown> = {},
): T {
  const error = Object.create(ErrorType.prototype) as T;
  Object.assign(error, { message, name: ErrorType.prototype.name, ...fields });
  return error;
}

beforeEach(() => {
  createCompletion.mockReset();
  constructOpenAI.mockReset();
  vi.restoreAllMocks();
});

describe("analyzeForCareer", () => {
  it("builds the Career request and returns a validated result with usage", async () => {
    mockCompletion(JSON.stringify(VALID_CAREER));

    const response = await analyzeForCareer(
      SAMPLE_RESUME,
      "Job description text",
      "server-api-key",
    );

    expect(constructOpenAI).toHaveBeenCalledWith({ apiKey: "server-api-key" });
    expect(createCompletion).toHaveBeenCalledOnce();

    const request = createCompletion.mock.calls[0][0];
    expect(request.model).toBe(ANALYSIS_MODEL);
    expect(request.response_format).toEqual({ type: "json_object" });
    expect(request.temperature).toBe(0.3);
    expect(request.messages[0].content).toBe(ANALYSIS_PROMPTS.career);
    expect(JSON.parse(request.messages[1].content)).toMatchObject({
      resume: SAMPLE_RESUME,
      jobDescription: "Job description text",
      responseSchema: expect.objectContaining({
        strengths: "string[]",
        suggestions: expect.any(Array),
        mustHaveCriteria: expect.arrayContaining([
          expect.objectContaining({
            status: "met | not_met | insufficient",
            quote: expect.any(String),
            aiInferred: "boolean",
          }),
        ]),
      }),
    });
    expect(JSON.parse(request.messages[1].content)).not.toHaveProperty(
      "missingEvidenceFallback",
    );
    expect(JSON.parse(request.messages[1].content).responseSchema).not.toHaveProperty(
      "recommendedNextStep",
    );
    expect(response).toEqual({
      result: VALID_CAREER,
      usage: {
        promptTokens: 120,
        completionTokens: 80,
        totalTokens: 200,
        estimatedCostUsd: 0.000066,
      },
    });
    expect(response.result).not.toHaveProperty("recommendedNextStep");
  });

  it("rejects invalid JSON and normalizes it as a parse failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockCompletion("{not valid json");

    const thrown = await analyzeForCareer(SAMPLE_RESUME, "job", "key").catch(
      (error) => error,
    );

    expect(thrown).toBeInstanceOf(SyntaxError);
    expect(normalizeAnalysisError(thrown)).toMatchObject({
      code: "JSON_PARSE_FAILED",
      status: 502,
    });
  });

  it("rejects responses with missing or malformed fields", async () => {
    mockCompletion(JSON.stringify({ ...VALID_CAREER, suggestions: undefined }));

    await expect(analyzeForCareer(SAMPLE_RESUME, "job", "key")).rejects.toThrow(
      "MALFORMED_ANALYSIS",
    );
  });

  it.each([
    [-12.6, 0],
    [101.4, 100],
    [82.6, 83],
  ])("rounds and clamps matchScore %s to %s", async (matchScore, expected) => {
    mockCompletion(JSON.stringify({ ...VALID_CAREER, matchScore }));

    const response = await analyzeForCareer(SAMPLE_RESUME, "job", "key");

    expect(response.result.matchScore).toBe(expected);
  });

  it("rejects an empty model response", async () => {
    mockCompletion(null);

    await expect(analyzeForCareer(SAMPLE_RESUME, "job", "key")).rejects.toThrow(
      "NO_ANALYSIS",
    );
  });

  it("uses zero token counts when OpenAI omits usage", async () => {
    createCompletion.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(VALID_CAREER) } }],
    });

    const response = await analyzeForCareer(SAMPLE_RESUME, "job", "key");

    expect(response.usage).toMatchObject({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    });
  });

  it("downgrades fabricated criterion quotes to insufficient (R-007)", async () => {
    mockCompletion(
      JSON.stringify({
        ...VALID_CAREER,
        mustHaveCriteria: [
          {
            criterion: "TypeScript",
            status: "met",
            quote: "Invented quote not on the resume.",
            aiInferred: false,
          },
        ],
      }),
    );

    const response = await analyzeForCareer(SAMPLE_RESUME, "job", "key");

    expect(response.result.mustHaveCriteria[0]).toEqual({
      criterion: "TypeScript",
      status: "insufficient",
      quote: "",
      aiInferred: true,
    });
  });
});

describe("assessForTalent", () => {
  it("requests the Talent schema and returns only decision fields", async () => {
    mockCompletion(JSON.stringify(VALID_TALENT));

    const response = await assessForTalent(
      SAMPLE_RESUME,
      "Job description text",
      "server-api-key",
    );

    const request = createCompletion.mock.calls[0][0];
    expect(request.messages[0].content).toBe(ANALYSIS_PROMPTS.talent);
    expect(JSON.parse(request.messages[1].content).responseSchema).toMatchObject({
      recommendedNextStep: expect.any(String),
      phoneScreenQuestions: "string[5]",
      sendoutBlurb: "string",
    });
    expect(JSON.parse(request.messages[1].content).responseSchema).not.toHaveProperty(
      "suggestions",
    );
    expect(response.result).toEqual(VALID_TALENT);
    expect(response.result).not.toHaveProperty("suggestions");
  });

  it("rejects Talent payloads missing phone-screen questions", async () => {
    mockCompletion(
      JSON.stringify({ ...VALID_TALENT, phoneScreenQuestions: ["only one"] }),
    );

    await expect(assessForTalent(SAMPLE_RESUME, "job", "key")).rejects.toThrow(
      "MALFORMED_ANALYSIS",
    );
  });

  it("drops strong matches whose quotes are not in the resume", async () => {
    mockCompletion(
      JSON.stringify({
        ...VALID_TALENT,
        strongMatches: [
          {
            match: "Fabricated",
            quote: "This sentence does not appear.",
            aiInferred: false,
          },
          {
            match: "Backend delivery",
            quote: "Led API delivery for two products.",
            aiInferred: false,
          },
        ],
      }),
    );

    const response = await assessForTalent(SAMPLE_RESUME, "job", "key");

    expect(response.result.strongMatches).toEqual([
      {
        match: "Backend delivery",
        quote: "Led API delivery for two products.",
        aiInferred: false,
      },
    ]);
  });
});

describe("audience-specific summaries (T-2.4)", () => {
  it("frames Career and Talent summaries differently in the prompts", () => {
    expect(ANALYSIS_PROMPTS.career).toContain("what is already strong, what is missing");
    expect(ANALYSIS_PROMPTS.career).toContain("Do not recommend Reject/Screen/Interview");
    expect(ANALYSIS_PROMPTS.career).not.toContain("what risk they assume");

    expect(ANALYSIS_PROMPTS.talent).toContain("what risk they assume by advancing");
    expect(ANALYSIS_PROMPTS.talent).toContain("Do not write coaching advice");
    expect(ANALYSIS_PROMPTS.talent).not.toContain("what to fix first");
  });

  it("requires provenance fields in both audience prompts (T-3.4)", () => {
    for (const prompt of [ANALYSIS_PROMPTS.career, ANALYSIS_PROMPTS.talent]) {
      expect(prompt).toContain('"met", "not_met", "insufficient"');
      expect(prompt).toContain("verbatim substring");
      expect(prompt).toContain("aiInferred");
      expect(prompt).toContain('use status "insufficient" with an empty quote');
    }
  });

  it("accepts distinct summary text for the same underlying fit signal", () => {
    expect(validateCareerAnalysis(VALID_CAREER)).toBe(true);
    expect(validateTalentAssessment(VALID_TALENT)).toBe(true);
    expect(VALID_CAREER.summary).not.toBe(VALID_TALENT.summary);
    expect(VALID_CAREER.summary.toLowerCase()).toContain("before you apply");
    expect(VALID_TALENT.summary.toLowerCase()).toContain("risk");
  });
});

describe("analysis error normalization", () => {
  it("passes through an existing AnalysisError", () => {
    const original = new AnalysisError("Known failure", "KNOWN", 409);
    expect(normalizeAnalysisError(original)).toBe(original);
  });

  it("normalizes internal analysis failures", () => {
    expect(normalizeAnalysisError(new Error("NO_ANALYSIS"))).toMatchObject({
      code: "NO_ANALYSIS",
      status: 502,
    });
    expect(normalizeAnalysisError(new Error("MALFORMED_ANALYSIS"))).toMatchObject({
      code: "MALFORMED_ANALYSIS",
      status: 502,
    });
  });

  it("normalizes OpenAI timeout and authentication failures", () => {
    const timeout = makeOpenAIError(
      APIConnectionTimeoutError,
      "Request timed out",
    );
    const authentication = makeOpenAIError(
      AuthenticationError,
      "Incorrect API key",
      { status: 401 },
    );

    expect(normalizeAnalysisError(timeout)).toMatchObject({
      code: "OPENAI_TIMEOUT",
      status: 504,
    });
    expect(normalizeAnalysisError(authentication)).toMatchObject({
      code: "INVALID_API_KEY",
      status: 401,
    });
  });

  it("distinguishes rate limits from exhausted quota", () => {
    const rateLimit = makeOpenAIError(RateLimitError, "Too many requests", {
      status: 429,
      code: "rate_limit_exceeded",
    });
    const quota = makeOpenAIError(RateLimitError, "insufficient_quota", {
      status: 429,
      code: "insufficient_quota",
    });

    expect(normalizeAnalysisError(rateLimit).code).toBe("RATE_LIMIT");
    expect(normalizeAnalysisError(quota).code).toBe("INSUFFICIENT_QUOTA");
  });

  it("distinguishes a missing model from another missing resource", () => {
    const model = makeOpenAIError(NotFoundError, "Model does not exist", {
      status: 404,
      code: "model_not_found",
    });
    const resource = makeOpenAIError(NotFoundError, "File does not exist", {
      status: 404,
      code: "not_found",
    });

    expect(normalizeAnalysisError(model).code).toBe("MODEL_NOT_FOUND");
    expect(normalizeAnalysisError(resource).code).toBe("NOT_FOUND");
  });

  it("preserves an OpenAI API status and normalizes unknown values", () => {
    const apiError = makeOpenAIError(APIError, "Upstream failed", {
      status: 503,
    });

    expect(normalizeAnalysisError(apiError)).toMatchObject({
      code: "OPENAI_API_ERROR",
      status: 503,
    });
    expect(normalizeAnalysisError(new Error("other"))).toMatchObject({
      code: "UNKNOWN",
      status: 500,
    });
    expect(normalizeAnalysisError("other")).toMatchObject({
      code: "UNKNOWN",
      status: 500,
    });
  });

  it("exposes the underlying message only in development", () => {
    const cause = new Error("Provider detail");
    const error = new AnalysisError("Safe message", "SAFE", 502, cause);

    expect(getClientErrorMessage(error, true)).toBe("Provider detail");
    expect(getClientErrorMessage(error, false)).toBe("Safe message");
  });

  it("logs normalized metadata without throwing", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => logAnalysisError(new Error("NO_ANALYSIS"))).not.toThrow();
    expect(consoleError).toHaveBeenCalledWith(
      "Analysis failed:",
      expect.objectContaining({ code: "NO_ANALYSIS", status: 502 }),
    );
  });
});
