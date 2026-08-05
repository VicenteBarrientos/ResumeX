import { describe, expect, it } from "vitest";
import { reconstructAbstract } from "../abstract";

describe("reconstructAbstract", () => {
  it("reconstructs word order from inverted index", () => {
    const text = reconstructAbstract({
      viral: [0],
      rescue: [1],
      of: [2],
      influenza: [3],
    });
    expect(text).toBe("viral rescue of influenza");
  });

  it("returns empty string for null/undefined/malformed", () => {
    expect(reconstructAbstract(null)).toBe("");
    expect(reconstructAbstract(undefined)).toBe("");
    expect(reconstructAbstract({ bad: "nope" as unknown as number[] })).toBe("");
  });

  it("caps length", () => {
    const index: Record<string, number[]> = {};
    for (let i = 0; i < 500; i++) index[`w${i}`] = [i];
    const text = reconstructAbstract(index, 40);
    expect(text.length).toBeLessThanOrEqual(41);
    expect(text.endsWith("…")).toBe(true);
  });
});
