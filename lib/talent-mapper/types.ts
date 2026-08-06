/**
 * ResumeX Talent Mapper — shared domain types.
 * Scores prioritize investigation; they are not hiring decisions.
 */

export type SearchMode = "live" | "demo";

export type ResearchSource = "openalex" | "pubmed";

export type EvidenceMatchType = "exact" | "adjacent" | "inferred";
export type EvidenceConfidence =
  | "direct"
  | "strong_adjacent"
  | "possible"
  | "topical";

export type EvidenceField =
  | "title"
  | "abstract"
  | "keyword"
  | "mesh"
  | "topic"
  | "publication_type"
  | "journal";

export type RetractionStatus =
  | "none"
  | "retracted"
  | "retraction-notice"
  | "corrected"
  | "unknown";

export type AuthorIdentityConfidence =
  | "verified-orcid"
  | "cross-source-work-match"
  | "name-affiliation-cluster"
  | "unresolved";

export type ResearchSourceReference = {
  source: ResearchSource;
  sourceId: string;
  url: string;
};

export type QueryMatchReference = {
  source: ResearchSource;
  queryId: string;
  rank: number;
};

export type LocationCriteria = {
  city?: string;
  region?: string;
  country?: string;
  remoteAllowed?: boolean;
};

export type SourcingCriteria = {
  roleTitle: string;
  roleSummary: string;
  requiredTechniques: string[];
  preferredTechniques: string[];
  researchAreas: string[];
  organismsOrSystems: string[];
  adjacentTerms: string[];
  senioritySignals: string[];
  location: LocationCriteria;
  publicationYearFrom?: number;
  exclusions: string[];
  recruiterNotes: string[];
};

export type SearchQueryGroup = "core" | "adjacent" | "broadening";

export type SearchQuery = {
  id: string;
  label: string;
  group: SearchQueryGroup;
  query: string;
  enabled: boolean;
  /** Human-readable reason this query exists (source-specific strategy). */
  purpose?: string;
};

export type EvidenceMatch = {
  criterion: string;
  matchType: EvidenceMatchType;
  workTitle: string;
  year?: number;
  snippet: string;
  doi?: string;
  pmid?: string;
  openAlexUrl?: string;
  pubmedUrl?: string;
  confidence: EvidenceConfidence;
  workId: string;
  evidenceField?: EvidenceField;
  sources?: ResearchSource[];
};

/**
 * Research relevance score breakdown (0–100 total).
 * Maxes: requiredTechniques 40, researchArea 20, recency 15,
 * repeatedEvidence 10, geography 10, seniority 5.
 */
export type ScoreBreakdown = {
  /** Max 40 — direct / adjacent / possible required-technique evidence */
  requiredTechniques: number;
  /** Max 20 — research-area and organism/system overlap */
  researchArea: number;
  /** Max 15 — recency of most recent relevant work */
  recency: number;
  /** Max 10 — multiple relevant publications */
  repeatedEvidence: number;
  /** Max 10 — modest geographic / institution signal */
  geography: number;
  /** Max 5 — seniority or ownership signals in public evidence */
  seniority: number;
  /** Sum of components, clamped 0–100 */
  total: number;
};

export type RelevantWork = {
  id: string;
  title: string;
  year?: number;
  doi?: string;
  pmid?: string;
  pmcid?: string;
  openAlexUrl?: string;
  pubmedUrl?: string;
  citedByCount?: number;
  sourceName?: string;
  abstractSnippet?: string;
  isRetracted?: boolean;
  publicationTypes?: string[];
  meshTerms?: string[];
  authorPosition?: string;
  publicationAffiliations?: string[];
  sources?: ResearchSource[];
  matchedCriteria: string[];
};

export type LikelyInstitution = {
  name: string;
  id?: string;
  countryCode?: string;
  type?: string;
};

/** Alias used by some Talent Mapper modules */
export type InstitutionSignal = LikelyInstitution;

export type ResearcherCandidate = {
  authorId: string;
  name: string;
  orcid?: string;
  openAlexUrl: string;
  pubmedUrl?: string;
  identityConfidence?: AuthorIdentityConfidence;
  possibleDuplicate?: boolean;
  likelyInstitution?: LikelyInstitution;
  /** Publication affiliation wording — not current employment. */
  publicationAffiliationNote?: string;
  relevantWorks: RelevantWork[];
  matchedRequiredCriteria: EvidenceMatch[];
  matchedPreferredCriteria: EvidenceMatch[];
  matchedResearchAreas: EvidenceMatch[];
  matchedOrganismsOrSystems: EvidenceMatch[];
  publicationYears: number[];
  mostRecentRelevantYear?: number;
  relevantWorkCount: number;
  totalCitationCountForRelevantWorks: number;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  evidenceSummary: string;
  outreachAngle: string;
  possibleConcerns: string[];
  unknowns: string[];
  screeningQuestions?: string[];
  recruiterNotes?: string;
};

export type SearchResult = {
  candidates: ResearcherCandidate[];
  worksReviewed: number;
  queriesUsed: SearchQuery[];
  searchedAt: string;
  mode: SearchMode;
  roleTitle: string;
  warnings: string[];
};

export type SourceDiagnostics = {
  status: "success" | "failed" | "skipped" | "unconfigured";
  queryCount?: number;
  rawRecordCount?: number;
  uniquePmidCount?: number;
  fetchedRecordCount?: number;
  durationMs?: number;
  warnings: string[];
  errorCode?: string;
};

export type DeduplicationDiagnostics = {
  sourceRecordCount: number;
  canonicalWorkCount: number;
  mergedDuplicateCount: number;
};

export type SearchDiagnostics = {
  sources: Partial<Record<ResearchSource, SourceDiagnostics>>;
  deduplication?: DeduplicationDiagnostics;
};

export type SearchMeta = {
  roleTitle: string;
  worksReviewed: number;
  uniqueResearchers: number;
  shortlistedCount?: number;
  mode: SearchMode;
  queriesUsed: string[];
  pubmedQueriesUsed?: string[];
  sourcesUsed?: ResearchSource[];
  searchedAt: string;
  disclaimer: string;
  warnings: string[];
  diagnostics?: SearchDiagnostics;
};

export type TalentSearchResult = {
  candidates: ResearcherCandidate[];
  meta: SearchMeta;
};

/** Normalized scholarly work used by evidence, scoring, and aggregation. */
export type ScholarlyWorkAuthor = {
  authorId: string;
  name: string;
  lastName?: string;
  foreName?: string;
  initials?: string;
  orcid?: string;
  authorPosition?: string;
  isFirstAuthor?: boolean;
  isLastAuthor?: boolean;
  isCollectiveAuthor?: boolean;
  identityConfidence?: AuthorIdentityConfidence;
  institutions: LikelyInstitution[];
  /** Raw affiliation strings at publication time (PubMed). */
  affiliationTexts?: string[];
};

export type ScholarlyWork = {
  id: string;
  /** Stable merge key (doi:, pmid:, pmcid:, openalex:, or titleyear:). */
  canonicalKey?: string;
  title: string;
  year?: number;
  publicationDate?: string;
  doi?: string;
  pmid?: string;
  pmcid?: string;
  openAlexId?: string;
  openAlexUrl?: string;
  pubmedUrl?: string;
  citedByCount?: number;
  sourceName?: string;
  /** Transient full abstract for server-side matching — trim before client persistence. */
  abstract?: string;
  topics: string[];
  keywords: string[];
  meshTerms?: string[];
  publicationTypes?: string[];
  isRetracted: boolean;
  retractionStatus?: RetractionStatus;
  sources?: ResearchSource[];
  sourceRefs?: ResearchSourceReference[];
  queryMatches?: QueryMatchReference[];
  authorships: ScholarlyWorkAuthor[];
};

export type AggregateAuthorsOptions = {
  /** When true, include retracted works with a concern flag (default: exclude). */
  includeRetracted?: boolean;
  /** Max authors returned after ranking (default: unlimited). */
  limit?: number;
};

export type ShortlistExportMeta = {
  searchMode: SearchMode;
  roleTitle?: string;
  exportedAt?: string;
  recruiterNotes?: string;
};

/** Slim OpenAlex-like work shape used by aggregation (live + demo). */
export type OpenAlexWorkLike = {
  id: string;
  doi?: string | null;
  display_name?: string | null;
  title?: string | null;
  publication_year?: number | null;
  publication_date?: string | null;
  cited_by_count?: number | null;
  is_retracted?: boolean | null;
  authorships?: OpenAlexAuthorshipLike[] | null;
  primary_topic?: { display_name?: string | null } | null;
  topics?: { display_name?: string | null }[] | null;
  keywords?: { display_name?: string | null; keyword?: string | null }[] | null;
  abstract_inverted_index?: Record<string, number[]> | null;
  /** Pre-reconstructed abstract (demo snapshot). */
  abstract_text?: string | null;
  primary_location?: {
    source?: { display_name?: string | null } | null;
    landing_page_url?: string | null;
  } | null;
};

export type OpenAlexAuthorshipLike = {
  author_position?: string | null;
  author?: {
    id?: string | null;
    display_name?: string | null;
    orcid?: string | null;
  } | null;
  institutions?: {
    id?: string | null;
    display_name?: string | null;
    country_code?: string | null;
    type?: string | null;
  }[] | null;
};

export type OutreachTone = "concise" | "conversational";

export type OutreachResult = {
  subject: string;
  body: string;
  tone: OutreachTone;
  characterCount: number;
};
