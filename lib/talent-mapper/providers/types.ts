import type {
  ResearchSource,
  SearchQuery,
  SourcingCriteria,
  ScholarlyWork,
  SourceDiagnostics,
} from "@/lib/talent-mapper/types";

export type SourceSearchInput = {
  queries: SearchQuery[];
  criteria: SourcingCriteria;
  limitPerQuery: number;
  totalResultLimit: number;
  signal?: AbortSignal;
};

export type SourceSearchResult = {
  source: ResearchSource;
  records: ScholarlyWork[];
  diagnostics: SourceDiagnostics;
  warnings: string[];
};

export interface ResearchSearchProvider {
  id: ResearchSource;
  displayName: string;
  isConfigured(): boolean;
  search(input: SourceSearchInput): Promise<SourceSearchResult>;
}
