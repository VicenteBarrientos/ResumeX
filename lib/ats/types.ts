/**
 * Provider-neutral ATS domain model for ResumeX Talent.
 * ResumeX discovers and evaluates talent; the ATS remains the system of record.
 */

export type AtsProvider = "recruitee" | "zoho-recruit" | "ashby";

export type AtsConnectionMode = "live" | "sandbox" | "demo";

export type AtsConnectionStatus =
  | "connected"
  | "needs_reauthentication"
  | "permission_error"
  | "configuration_error"
  | "temporarily_unavailable"
  | "disconnected";

export type AtsCapability =
  | "list_jobs"
  | "search_candidates"
  | "create_candidate"
  | "associate_candidate_to_job"
  | "create_application"
  | "add_note"
  | "write_custom_fields"
  | "upload_resume"
  | "list_stages"
  | "move_application"
  | "receive_webhooks"
  | "incremental_sync";

export type AtsJobStatus =
  | "draft"
  | "open"
  | "closed"
  | "archived"
  | "unknown";

export type AtsDuplicateConfidence =
  | "exact_email"
  | "existing_mapping"
  | "strong_profile_match"
  | "name_only"
  | "unknown";

export type AtsTransferStatus =
  | "success"
  | "partial_success"
  | "failed"
  | "duplicate_review_required"
  | "pending"
  | "in_progress";

export type AtsPlannedOperation =
  | "reuse_candidate"
  | "create_candidate"
  | "associate_candidate_to_job"
  | "create_application"
  | "add_evidence"
  | "upload_resume"
  | "set_source"
  | "set_custom_fields";

export type AtsEvidenceWrittenAs =
  | "note"
  | "custom_fields"
  | "candidate_profile_fields"
  | "unsupported";

export type AtsEvidenceSourceProduct =
  | "ResumeX Talent Mapper"
  | "ResumeX Sourcing Copilot"
  | "ResumeX Candidate Analyzer";

export interface AtsConnectionSummary {
  id: string;
  provider: AtsProvider;
  mode: AtsConnectionMode;
  displayName: string;
  status: AtsConnectionStatus;
  capabilities: AtsCapability[];
  lastTestedAt?: string;
  lastSuccessfulSyncAt?: string;
  configurationWarnings: string[];
}

export interface AtsJob {
  id: string;
  provider: AtsProvider;
  title: string;
  status: AtsJobStatus;
  department?: string;
  location?: string;
  remoteStatus?: string;
  externalUrl?: string;
  requisitionId?: string;
  updatedAt?: string;
}

export interface AtsEvidenceItem {
  criterion: string;
  explanation: string;
  sourceTitle?: string;
  sourceUrl?: string;
  sourceYear?: number;
}

export interface AtsEvidencePayload {
  generatedAt: string;
  sourceProduct: AtsEvidenceSourceProduct;
  searchProjectId?: string;
  searchProjectTitle?: string;
  localCandidateUrl?: string;
  relevanceLabel: string;
  relevanceScore?: number;
  directEvidence: AtsEvidenceItem[];
  adjacentEvidence: AtsEvidenceItem[];
  unknowns: string[];
  recruiterNotes?: string;
  publicProfileUrls: string[];
  likelyInstitution?: string;
}

export interface AtsCandidateDraft {
  localCandidateKey: string;
  name: string;
  email?: string;
  alternateEmails?: string[];
  phone?: string;
  location?: {
    city?: string;
    region?: string;
    country?: string;
  };
  linkedInUrl?: string;
  githubUrl?: string;
  websiteUrl?: string;
  openAlexUrl?: string;
  orcidUrl?: string;
  pubmedUrl?: string;
  resumeFile?: {
    localFileReference: string;
    filename: string;
    mimeType: string;
    size: number;
  };
  sourceLabel: string;
  evidence: AtsEvidencePayload;
}

export interface AtsCandidateMatch {
  externalCandidateId: string;
  name: string;
  emails: string[];
  phone?: string;
  externalUrl?: string;
  confidence: AtsDuplicateConfidence;
  reasons: string[];
  existingJobAssociations: {
    externalJobId: string;
    jobTitle?: string;
    externalApplicationId?: string;
    stage?: string;
  }[];
}

export interface AtsApplicationResult {
  externalCandidateId: string;
  externalApplicationId?: string;
  externalJobId: string;
  stage?: string;
  candidateUrl?: string;
  applicationUrl?: string;
}

export interface AtsTransferPreview {
  connectionId: string;
  provider: AtsProvider;
  candidate: AtsCandidateDraft;
  job: AtsJob;
  possibleDuplicates: AtsCandidateMatch[];
  plannedOperations: {
    operation: AtsPlannedOperation;
    supported: boolean;
    required: boolean;
    description: string;
    warning?: string;
  }[];
  providerPayloadPreview: {
    label: string;
    value: string;
  }[];
  confirmationRequired: true;
  warnings: string[];
}

export interface AtsTransferResult {
  transferId: string;
  status: AtsTransferStatus;
  provider: AtsProvider;
  connectionId: string;
  externalCandidateId?: string;
  externalApplicationId?: string;
  externalJobId?: string;
  candidateUrl?: string;
  applicationUrl?: string;
  completedOperations: string[];
  failedOperation?: string;
  warnings: string[];
  retryable: boolean;
}

export interface AtsStage {
  id: string;
  name: string;
  category?: string;
}

export interface AtsConnectionTestResult {
  ok: boolean;
  status: AtsConnectionStatus;
  accountName?: string;
  warnings: string[];
  missingPermissions: string[];
}

/** Recruitee credentials — encrypted at rest. */
export type RecruiteeCredentials = {
  token: string;
  webhookSecret?: string;
};

export type RecruiteeMetadata = {
  companyIdOrSubdomain: string;
};

/** Zoho Recruit credentials — encrypted at rest. */
export type ZohoCredentials = {
  accessToken?: string;
  accessTokenExpiresAt?: string;
  refreshToken: string;
};

export type ZohoMetadata = {
  accountsServer: string;
  apiDomain: string;
  dataCenter: string;
  scope: string[];
};

/** Ashby credentials — encrypted at rest. */
export type AshbyCredentials = {
  apiKey: string;
};

export type AshbyMetadata = {
  actingUserId?: string;
  sourceId?: string;
  /** Maps ResumeX evidence keys to existing Ashby custom field IDs. */
  customFieldMap?: Partial<{
    source: string;
    relevance: string;
    candidateUrl: string;
    matchedCriteria: string;
    recentPublicationYear: string;
  }>;
};

export type AtsProviderCredentials =
  | RecruiteeCredentials
  | ZohoCredentials
  | AshbyCredentials;
