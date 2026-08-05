import { describe, expect, it } from "vitest";
import { safeCallbackUrl } from "@/lib/safe-callback-url";

describe("safeCallbackUrl", () => {
  it("rejects open redirects and falls back", () => {
    expect(safeCallbackUrl(null)).toBe("/career/tracker");
    expect(safeCallbackUrl("//evil.com")).toBe("/career/tracker");
    expect(safeCallbackUrl("https://evil.com")).toBe("/career/tracker");
  });

  it("allows same-origin relative paths", () => {
    expect(safeCallbackUrl("/talent/mapper")).toBe("/talent/mapper");
    expect(safeCallbackUrl("/career/analyzer", "/career/onboarding")).toBe(
      "/career/analyzer",
    );
  });
});
