/**
 * ResumeX Talent Mapper — shared domain types.
 * Scores prioritize investigation; they are not hiring decisions.
 */

export type SearchMode = "live" | "demo";

export type EvidenceMatchType = "exact" | "adjacent" | "inferred";
export type EvidenceConfidence =
  | "direct"
  | "strong_adjacent"
  | "possible";

/** @deprecated Prefer EvidenceConfidence */
export type MatchConfidence = EvidenceConfidence;
/** @deprecated Prefer EvidenceMatchType */
export type MatchType = EvidenceMatchType;

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

export type SearchQueryGroup = "core" | "adjacent";

export type SearchQuery = {
  id: string;
  label: string;
  group: SearchQueryGroup;
  query: string;
  enabled: boolean;
};

export type EvidenceMatch = {
  criterion: string;
  matchType: EvidenceMatchType;
  workTitle: string;
  year?: number;
  snippet: string;
  doi?: string;
  openAlexUrl?: string;
  confidence: EvidenceConfidence;
  workId: string;
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
  openAlexUrl?: string;
  citedByCount?: number;
  sourceName?: string;
  abstractSnippet?: string;
  isRetracted?: boolean;
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
  likelyInstitution?: LikelyInstitution;
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

export type SearchMeta = {
  roleTitle: string;
  worksReviewed: number;
  uniqueResearchers: number;
  shortlistedCount?: number;
  mode: SearchMode;
  queriesUsed: string[];
  searchedAt: string;
  disclaimer: string;
  warnings: string[];
};

export type TalentSearchResult = {
  candidates: ResearcherCandidate[];
  meta: SearchMeta;
};

/** Normalized scholarly work used by evidence, scoring, and aggregation. */
export type ScholarlyWorkAuthor = {
  authorId: string;
  name: string;
  orcid?: string;
  authorPosition?: string;
  institutions: LikelyInstitution[];
};

export type ScholarlyWork = {
  id: string;
  title: string;
  year?: number;
  publicationDate?: string;
  doi?: string;
  openAlexUrl?: string;
  citedByCount?: number;
  sourceName?: string;
  abstract?: string;
  topics: string[];
  keywords: string[];
  isRetracted: boolean;
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
