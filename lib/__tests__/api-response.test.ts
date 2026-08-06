import { describe, expect, it } from "vitest";
import { apiError, apiOk } from "@/lib/api/response";
import { AtsError } from "@/lib/ats/errors";
import { atsErrorResponse } from "@/lib/ats/http-response";

describe("apiError (R-021 flat envelope)", () => {
  it("keeps error as a string with sibling code/upgradeUrl", async () => {
    const res = apiError("Free plan limit reached.", {
      status: 402,
      code: "upgrade_required",
      upgradeUrl: "/upgrade",
    });
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(typeof body.error).toBe("string");
    expect(body.error).toBe("Free plan limit reached.");
    expect(body.code).toBe("upgrade_required");
    expect(body.upgradeUrl).toBe("/upgrade");
    expect(body.error).not.toHaveProperty("message");
  });

  it("sets Retry-After from retryAfterSec", async () => {
    const res = apiError("Slow down.", {
      status: 429,
      code: "quota_exceeded",
      retryAfterSec: 42,
    });
    expect(res.headers.get("Retry-After")).toBe("42");
  });

  it("places non-standard siblings in extra", async () => {
    const res = apiError("No match.", {
      status: 200,
      extra: { score: null },
    });
    const body = await res.json();
    expect(body).toEqual({ error: "No match.", score: null });
  });
});

describe("apiOk", () => {
  it("returns JSON payload", async () => {
    const res = apiOk({ ok: true });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe("atsErrorResponse flatten", () => {
  it("flattens AtsError so error is the message string", async () => {
    const err = new AtsError({
      provider: "ASHBY",
      code: "validation",
      message: "Invalid connection payload.",
      retryable: false,
    });
    const res = atsErrorResponse(err);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid connection payload.");
    expect(typeof body.error).toBe("string");
    expect(body.code).toBe("validation");
    expect(body.retryable).toBe(false);
    expect(body.details).toMatchObject({ provider: "ASHBY" });
  });

  it("maps authentication to 401", async () => {
    const err = new AtsError({
      provider: "RECRUITEE",
      code: "authentication",
      message: "Bad token.",
      retryable: false,
    });
    const res = atsErrorResponse(err);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Bad token.");
  });
});
