/**
 * Route-level proof for T-12.4 done criteria:
 * exhausting talent-assess quota returns 402 with `code`, and a second call
 * never reaches OpenAI.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireSession,
  assertAiQuota,
  recordUsage,
  assessForTalent,
  getOpenAiApiKey,
  resolveResumeJobInput,
} = vi.hoisted(() => ({
  requireSession: vi.fn(),
  assertAiQuota: vi.fn(),
  recordUsage: vi.fn(),
  assessForTalent: vi.fn(),
  getOpenAiApiKey: vi.fn(),
  resolveResumeJobInput: vi.fn(),
}));

vi.mock("@/lib/require-auth", () => ({ requireSession }));
vi.mock("@/lib/entitlements", () => ({ assertAiQuota, recordUsage }));
vi.mock("@/lib/analyze", () => ({ assessForTalent }));
vi.mock("@/lib/env", () => ({ getOpenAiApiKey }));
vi.mock("@/lib/resolve-resume-job-input", () => ({ resolveResumeJobInput }));

import { POST } from "@/app/api/talent-assess/route";

describe("POST /api/talent-assess quota", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue({ userId: "user_1", error: null });
    resolveResumeJobInput.mockResolvedValue({
      resume: "Five years of TypeScript.",
      jobDescription: "Need a senior engineer.",
    });
    getOpenAiApiKey.mockReturnValue("sk-test");
  });

  it("returns 402 with code and does not call OpenAI when quota is exhausted", async () => {
    assertAiQuota.mockResolvedValue({
      code: "upgrade_required",
      message: "Free plan includes 1 Talent Assess run per week.",
      upgradeUrl: "/upgrade",
      status: 402,
    });

    const req = new Request("http://localhost/api/talent-assess", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        resume: "Five years of TypeScript.",
        jobDescription: "Need a senior engineer.",
      }),
    });

    const first = await POST(req);
    expect(first.status).toBe(402);
    const body = await first.json();
    expect(body.code).toBe("upgrade_required");
    expect(typeof body.error).toBe("string");
    expect(assessForTalent).not.toHaveBeenCalled();
    expect(recordUsage).not.toHaveBeenCalled();

    // Second attempt in the same window still blocked before OpenAI.
    const second = await POST(
      new Request("http://localhost/api/talent-assess", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          resume: "Five years of TypeScript.",
          jobDescription: "Need a senior engineer.",
        }),
      }),
    );
    expect(second.status).toBe(402);
    expect(assessForTalent).not.toHaveBeenCalled();
  });

  it("records usage with estimatedCostUsd after a successful assess", async () => {
    assertAiQuota.mockResolvedValue(null);
    assessForTalent.mockResolvedValue({
      result: { matchScore: 80 },
      usage: { estimatedCostUsd: 0.0012 },
    });

    const res = await POST(
      new Request("http://localhost/api/talent-assess", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          resume: "Five years of TypeScript.",
          jobDescription: "Need a senior engineer.",
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(assessForTalent).toHaveBeenCalledOnce();
    expect(recordUsage).toHaveBeenCalledWith("user_1", "talent_assess", 0.0012);
  });
});
