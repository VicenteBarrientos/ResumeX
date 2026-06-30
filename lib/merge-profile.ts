import type { CandidateProfile } from "@/lib/autoapply-types";

function pickString(extracted: string | undefined, existing: string): string {
  const v = extracted?.trim();
  return v ? v : existing;
}

function pickNumber(extracted: number | undefined, existing: number): number {
  if (typeof extracted === "number" && !Number.isNaN(extracted) && extracted > 0) {
    return extracted;
  }
  return existing;
}

function pickRoles(extracted: string[] | undefined, existing: string[]): string[] {
  const roles = (extracted ?? []).map((s) => s.trim()).filter(Boolean);
  return roles.length ? roles : existing;
}

function pickSkills(extracted: string[] | undefined, existing: string[]): string[] {
  const skills = (extracted ?? []).map((s) => s.trim()).filter(Boolean);
  return skills.length ? skills : existing;
}

/** Merge parsed resume data into an existing profile draft, keeping prior values when extraction is empty. */
export function mergeProfile(
  existing: CandidateProfile,
  extracted: CandidateProfile
): CandidateProfile {
  return {
    personal: {
      firstName: pickString(extracted.personal.firstName, existing.personal.firstName),
      lastName: pickString(extracted.personal.lastName, existing.personal.lastName),
      email: pickString(extracted.personal.email, existing.personal.email),
      phone: pickString(extracted.personal.phone, existing.personal.phone),
      location: pickString(extracted.personal.location, existing.personal.location),
      linkedinUrl: pickString(extracted.personal.linkedinUrl, existing.personal.linkedinUrl),
      githubUrl: pickString(extracted.personal.githubUrl, existing.personal.githubUrl),
    },
    target: {
      roles: pickRoles(extracted.target.roles, existing.target.roles),
      salaryMin: pickNumber(extracted.target.salaryMin, existing.target.salaryMin),
      salaryMax: pickNumber(extracted.target.salaryMax, existing.target.salaryMax),
      currency: pickString(extracted.target.currency, existing.target.currency) || "USD",
      remote: extracted.target.remote ?? existing.target.remote,
      willingToRelocate: extracted.target.willingToRelocate ?? existing.target.willingToRelocate,
      startAvailability: pickString(extracted.target.startAvailability, existing.target.startAvailability),
      greenhouseBoards: existing.target.greenhouseBoards,
      leverBoards: existing.target.leverBoards,
    },
    experience: {
      totalYears: pickNumber(extracted.experience.totalYears, existing.experience.totalYears),
      currentTitle: pickString(extracted.experience.currentTitle, existing.experience.currentTitle),
      currentCompany: pickString(extracted.experience.currentCompany, existing.experience.currentCompany),
      summary: pickString(extracted.experience.summary, existing.experience.summary),
    },
    skills: pickSkills(extracted.skills, existing.skills),
    workAuthorization: {
      country: pickString(extracted.workAuthorization.country, existing.workAuthorization.country),
      status: pickString(extracted.workAuthorization.status, existing.workAuthorization.status),
      requiresSponsorship:
        extracted.workAuthorization.status
          ? extracted.workAuthorization.requiresSponsorship
          : existing.workAuthorization.requiresSponsorship,
    },
    coverLetterTemplate: pickString(extracted.coverLetterTemplate, existing.coverLetterTemplate),
  };
}

export const EMPTY_PROFILE: CandidateProfile = {
  personal: {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    linkedinUrl: "",
    githubUrl: "",
  },
  target: {
    roles: [],
    salaryMin: 0,
    salaryMax: 0,
    currency: "USD",
    remote: true,
    willingToRelocate: false,
    startAvailability: "2 weeks",
  },
  experience: {
    totalYears: 0,
    currentTitle: "",
    currentCompany: "",
    summary: "",
  },
  skills: [],
  workAuthorization: {
    country: "",
    status: "",
    requiresSponsorship: false,
  },
  coverLetterTemplate: "",
};
