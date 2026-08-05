import { describe, expect, it } from "vitest";
import type { CandidateProfile } from "@/lib/autoapply-types";
import { EMPTY_PROFILE, mergeProfile } from "@/lib/merge-profile";

function profile(partial: {
  personal?: Partial<CandidateProfile["personal"]>;
  target?: Partial<CandidateProfile["target"]>;
  experience?: Partial<CandidateProfile["experience"]>;
  skills?: string[];
  workAuthorization?: Partial<CandidateProfile["workAuthorization"]>;
  coverLetterTemplate?: string;
}): CandidateProfile {
  return {
    personal: { ...EMPTY_PROFILE.personal, ...partial.personal },
    target: { ...EMPTY_PROFILE.target, ...partial.target },
    experience: { ...EMPTY_PROFILE.experience, ...partial.experience },
    skills: partial.skills ?? [],
    workAuthorization: {
      ...EMPTY_PROFILE.workAuthorization,
      ...partial.workAuthorization,
    },
    coverLetterTemplate:
      partial.coverLetterTemplate ?? EMPTY_PROFILE.coverLetterTemplate,
  };
}

describe("mergeProfile", () => {
  it("keeps existing personal fields when extraction is blank or whitespace", () => {
    const existing = profile({
      personal: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        phone: "555-0100",
        location: "London",
        linkedinUrl: "https://linkedin.com/in/ada",
        githubUrl: "https://github.com/ada",
      },
    });
    const extracted = profile({
      personal: {
        firstName: "  ",
        lastName: "",
        email: undefined as unknown as string,
        phone: "   ",
        location: "",
        linkedinUrl: "",
        githubUrl: "",
      },
    });

    const merged = mergeProfile(existing, extracted);

    expect(merged.personal).toEqual(existing.personal);
  });

  it("prefers non-empty extracted personal fields over existing", () => {
    const existing = profile({
      personal: { firstName: "Old", email: "old@example.com" },
    });
    const extracted = profile({
      personal: { firstName: "New", email: "new@example.com", phone: "555" },
    });

    const merged = mergeProfile(existing, extracted);

    expect(merged.personal.firstName).toBe("New");
    expect(merged.personal.email).toBe("new@example.com");
    expect(merged.personal.phone).toBe("555");
  });

  it("keeps existing roles and skills when extraction lists are empty", () => {
    const existing = profile({
      target: { roles: ["Engineer"] },
      skills: ["TypeScript", "Go"],
    });
    const extracted = profile({
      target: { roles: ["  ", ""] },
      skills: [],
    });

    const merged = mergeProfile(existing, extracted);

    expect(merged.target.roles).toEqual(["Engineer"]);
    expect(merged.skills).toEqual(["TypeScript", "Go"]);
  });

  it("replaces roles and skills when extraction has at least one value", () => {
    const existing = profile({
      target: { roles: ["Engineer"] },
      skills: ["TypeScript"],
    });
    const extracted = profile({
      target: { roles: [" Staff Engineer ", ""] },
      skills: [" Rust ", ""],
    });

    const merged = mergeProfile(existing, extracted);

    expect(merged.target.roles).toEqual(["Staff Engineer"]);
    expect(merged.skills).toEqual(["Rust"]);
  });

  it("ignores non-positive extracted numbers and keeps existing", () => {
    const existing = profile({
      target: { salaryMin: 120000, salaryMax: 150000 },
      experience: { totalYears: 8 },
    });
    const extracted = profile({
      target: { salaryMin: 0, salaryMax: Number.NaN },
      experience: { totalYears: -3 },
    });

    const merged = mergeProfile(existing, extracted);

    expect(merged.target.salaryMin).toBe(120000);
    expect(merged.target.salaryMax).toBe(150000);
    expect(merged.experience.totalYears).toBe(8);
  });

  it("defaults currency to USD when both sides leave it blank", () => {
    const existing = profile({ target: { currency: "" } });
    const extracted = profile({ target: { currency: "  " } });

    expect(mergeProfile(existing, extracted).target.currency).toBe("USD");
  });

  it("preserves existing board lists; never takes them from extraction", () => {
    const existing = profile({
      target: {
        greenhouseBoards: ["acme"],
        leverBoards: ["beta"],
      },
    });
    const extracted = profile({
      target: {
        greenhouseBoards: ["should-not-appear"],
        leverBoards: ["should-not-appear"],
        roles: ["PM"],
      },
    });

    const merged = mergeProfile(existing, extracted);

    expect(merged.target.greenhouseBoards).toEqual(["acme"]);
    expect(merged.target.leverBoards).toEqual(["beta"]);
    expect(merged.target.roles).toEqual(["PM"]);
  });

  it("uses extracted remote/relocate when present, including false", () => {
    const existing = profile({
      target: { remote: true, willingToRelocate: true },
    });
    const extracted = profile({
      target: { remote: false, willingToRelocate: false },
    });

    const merged = mergeProfile(existing, extracted);

    expect(merged.target.remote).toBe(false);
    expect(merged.target.willingToRelocate).toBe(false);
  });

  it("only updates requiresSponsorship when extracted status is non-empty", () => {
    const existing = profile({
      workAuthorization: {
        country: "US",
        status: "Citizen",
        requiresSponsorship: false,
      },
    });
    const blankStatus = profile({
      workAuthorization: {
        status: "",
        requiresSponsorship: true,
      },
    });
    const withStatus = profile({
      workAuthorization: {
        status: "H-1B",
        requiresSponsorship: true,
      },
    });

    expect(mergeProfile(existing, blankStatus).workAuthorization).toEqual({
      country: "US",
      status: "Citizen",
      requiresSponsorship: false,
    });
    expect(mergeProfile(existing, withStatus).workAuthorization).toEqual({
      country: "US",
      status: "H-1B",
      requiresSponsorship: true,
    });
  });
});
