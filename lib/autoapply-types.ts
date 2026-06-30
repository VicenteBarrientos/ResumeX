export type ApplicationStatus = "applied" | "reviewing" | "interview" | "offer" | "rejected";

export interface Application {
  id: string;
  platform: string;
  company: string;
  role: string;
  jobUrl: string;
  jobDescription: string;
  appliedAt: string; // ISO date string
  status: ApplicationStatus;
  answers: Record<string, string>; // field label -> answer
}

export interface CandidateProfile {
  personal: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location: string;
    linkedinUrl: string;
    githubUrl: string;
  };
  target: {
    roles: string[];
    salaryMin: number;
    salaryMax: number;
    currency: string;
    remote: boolean;
    willingToRelocate: boolean;
    startAvailability: string;
    greenhouseBoards?: string[];
    leverBoards?: string[];
  };
  experience: {
    totalYears: number;
    currentTitle: string;
    currentCompany: string;
    summary: string;
  };
  skills: string[];
  workAuthorization: {
    country: string;
    status: string;
    requiresSponsorship: boolean;
  };
  coverLetterTemplate: string;
}
