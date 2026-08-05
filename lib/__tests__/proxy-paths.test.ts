import { describe, expect, it } from "vitest";
import { isProtectedPath } from "@/proxy";

describe("isProtectedPath", () => {
  it("keeps the Talent landing public and tools gated", () => {
    expect(isProtectedPath("/talent")).toBe(false);
    expect(isProtectedPath("/talent/")).toBe(false);
    expect(isProtectedPath("/talent/mapper")).toBe(true);
    expect(isProtectedPath("/talent/assess")).toBe(true);
    expect(isProtectedPath("/talent/searches")).toBe(true);
  });

  it("gates Career, upgrade, and extension-auth", () => {
    expect(isProtectedPath("/career")).toBe(true);
    expect(isProtectedPath("/career/analyzer")).toBe(true);
    expect(isProtectedPath("/upgrade")).toBe(true);
    expect(isProtectedPath("/extension-auth")).toBe(true);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/")).toBe(false);
  });
});
