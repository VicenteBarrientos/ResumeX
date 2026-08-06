import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  usageEventCount,
  usageEventCreate,
  usageEventFindFirst,
  usageEventAggregate,
  userFindUnique,
} = vi.hoisted(() => ({
  usageEventCount: vi.fn(),
  usageEventCreate: vi.fn(),
  usageEventFindFirst: vi.fn(),
  usageEventAggregate: vi.fn(),
  userFindUnique: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: userFindUnique },
    usageEvent: {
      count: usageEventCount,
      create: usageEventCreate,
      findFirst: usageEventFindFirst,
      aggregate: usageEventAggregate,
    },
  },
}));

import {
  assertDailyBudget,
  assertQuota,
  quotaDenialResponse,
  recordUsage,
} from "@/lib/quota";
import { assertAiQuota } from "@/lib/entitlements";
import { DAILY_BUDGET_USD, FREE_LIMITS } from "@/lib/quota-limits";

describe("assertQuota", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows when under the limit", async () => {
    usageEventCount.mockResolvedValue(0);
    const denial = await assertQuota({
      userId: "u1",
      name: "talent_assess",
      limit: 1,
      windowMs: FREE_LIMITS.talent_assess.windowMs,
      onExceeded: () => ({
        code: "quota_exceeded",
        message: "nope",
        status: 429,
      }),
    });
    expect(denial).toBeNull();
  });

  it("denies when used >= limit and reports retryAfterSec", async () => {
    usageEventCount.mockResolvedValue(1);
    const oldest = new Date(Date.now() - 60_000);
    usageEventFindFirst.mockResolvedValue({ createdAt: oldest });

    const denial = await assertQuota({
      userId: "u1",
      name: "talent_assess",
      limit: 1,
      windowMs: 7 * 24 * 60 * 60 * 1000,
      onExceeded: ({ used, limit, retryAfterSec }) => ({
        code: "quota_exceeded",
        message: `used ${used}/${limit}`,
        retryAfterSec,
        status: 429,
      }),
    });

    expect(denial?.code).toBe("quota_exceeded");
    expect(denial?.status).toBe(429);
    expect(denial?.retryAfterSec).toBeGreaterThan(0);
  });
});

describe("assertDailyBudget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cuts when accumulated costUsd reaches the daily ceiling", async () => {
    usageEventAggregate.mockResolvedValue({
      _sum: { costUsd: DAILY_BUDGET_USD.free },
    });

    const denial = await assertDailyBudget({
      userId: "u1",
      maxUsd: DAILY_BUDGET_USD.free,
      onExceeded: ({ spentUsd, maxUsd }) => ({
        code: "upgrade_required",
        message: `spent ${spentUsd} of ${maxUsd}`,
        upgradeUrl: "/upgrade",
        status: 402,
      }),
    });

    expect(denial?.code).toBe("upgrade_required");
    expect(denial?.status).toBe(402);
    expect(denial?.message).toContain("0.25");
  });

  it("allows when under the budget", async () => {
    usageEventAggregate.mockResolvedValue({ _sum: { costUsd: 0.01 } });
    const denial = await assertDailyBudget({
      userId: "u1",
      maxUsd: DAILY_BUDGET_USD.free,
      onExceeded: () => ({
        code: "quota_exceeded",
        message: "nope",
        status: 429,
      }),
    });
    expect(denial).toBeNull();
  });
});

describe("recordUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usageEventCreate.mockResolvedValue({ id: "e1" });
  });

  it("persists optional costUsd", async () => {
    await recordUsage("u1", "talent_assess", 0.0025);
    expect(usageEventCreate).toHaveBeenCalledWith({
      data: { userId: "u1", name: "talent_assess", costUsd: 0.0025 },
    });
  });

  it("omits costUsd when not provided", async () => {
    await recordUsage("u1", "talent_mapper_search");
    expect(usageEventCreate).toHaveBeenCalledWith({
      data: { userId: "u1", name: "talent_mapper_search" },
    });
  });
});

describe("assertAiQuota / talent_assess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usageEventAggregate.mockResolvedValue({ _sum: { costUsd: 0 } });
  });

  it("returns upgrade_required for free users who already used their weekly assess", async () => {
    userFindUnique.mockResolvedValue({ isPro: false });
    usageEventCount.mockResolvedValue(1);
    usageEventFindFirst.mockResolvedValue({
      createdAt: new Date(Date.now() - 60_000),
    });

    const denial = await assertAiQuota("u1", "talent_assess");
    expect(denial?.code).toBe("upgrade_required");
    expect(denial?.status).toBe(402);
    expect(denial?.upgradeUrl).toBe("/upgrade");
  });

  it("returns quota_exceeded for Pro users over the high daily cap", async () => {
    userFindUnique.mockResolvedValue({ isPro: true });
    usageEventCount.mockResolvedValue(200);
    usageEventFindFirst.mockResolvedValue({
      createdAt: new Date(Date.now() - 60_000),
    });

    const denial = await assertAiQuota("u1", "talent_assess");
    expect(denial?.code).toBe("quota_exceeded");
    expect(denial?.status).toBe(429);
  });

  it("quotaDenialResponse keeps error as a string (extension contract)", async () => {
    const res = quotaDenialResponse({
      code: "upgrade_required",
      message: "Free plan includes 1 Talent Assess run per week.",
      upgradeUrl: "/upgrade",
      status: 402,
    });
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(typeof body.error).toBe("string");
    expect(body.code).toBe("upgrade_required");
    expect(body.upgradeUrl).toBe("/upgrade");
  });
});
