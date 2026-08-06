import type {
  AtsApplicationResult,
  AtsCandidateDraft,
  AtsCandidateMatch,
  AtsCapability,
  AtsConnectionTestResult,
  AtsEvidencePayload,
  AtsEvidenceWrittenAs,
  AtsJob,
  AtsJobStatus,
  AtsProvider,
  AtsStage,
} from "@/lib/ats/types";

export interface AtsAdapter {
  provider: AtsProvider;

  getCapabilities(): AtsCapability[];

  testConnection(): Promise<AtsConnectionTestResult>;

  listJobs(input?: {
    statuses?: AtsJobStatus[];
    search?: string;
    cursor?: string;
  }): Promise<{
    jobs: AtsJob[];
    nextCursor?: string;
  }>;

  searchCandidates(input: {
    name: string;
    email?: string;
    alternateEmails?: string[];
    linkedInUrl?: string;
    githubUrl?: string;
    websiteUrl?: string;
    orcidUrl?: string;
  }): Promise<AtsCandidateMatch[]>;

  createCandidate(candidate: AtsCandidateDraft): Promise<{
    externalCandidateId: string;
    externalUrl?: string;
  }>;

  attachCandidateToJob(input: {
    externalCandidateId: string;
    externalJobId: string;
  }): Promise<AtsApplicationResult>;

  addEvidence(input: {
    externalCandidateId: string;
    externalApplicationId?: string;
    evidence: AtsEvidencePayload;
  }): Promise<{
    writtenAs: AtsEvidenceWrittenAs;
    warnings: string[];
  }>;

  uploadResume?(input: {
    externalCandidateId: string;
    file: {
      filename: string;
      mimeType: string;
      bytes: Buffer;
    };
  }): Promise<void>;

  listStages?(externalJobId: string): Promise<AtsStage[]>;

  moveApplication?(input: {
    externalApplicationId: string;
    externalStageId: string;
  }): Promise<void>;
}
