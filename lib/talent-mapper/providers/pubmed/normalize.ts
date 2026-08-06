import { computeCanonicalKey } from "@/lib/talent-mapper/normalization/canonical-work";
import { normalizeDoi } from "@/lib/talent-mapper/normalization/doi";
import { normalizeOrcid } from "@/lib/talent-mapper/normalization/orcid";
import {
  normalizePmcid,
  normalizePmid,
  pubmedUrlForPmid,
} from "@/lib/talent-mapper/normalization/pmid";
import { provisionalPubmedAuthorId } from "@/lib/talent-mapper/normalization/authors";
import type { PubmedParsedArticle } from "@/lib/talent-mapper/providers/pubmed/parse-pubmed-xml";
import type {
  QueryMatchReference,
  ScholarlyWork,
  ScholarlyWorkAuthor,
} from "@/lib/talent-mapper/types";

export type NormalizePubmedOptions = {
  queryMatches?: QueryMatchReference[];
};

/**
 * Convert a parsed PubMed article into the shared ScholarlyWork model.
 */
export function normalizePubmedArticle(
  article: PubmedParsedArticle,
  options: NormalizePubmedOptions = {},
): ScholarlyWork | null {
  const pmid = normalizePmid(article.pmid);
  if (!pmid) return null;

  const doi = normalizeDoi(article.doi) ?? undefined;
  const pmcid = normalizePmcid(article.pmcid) ?? undefined;
  const authorships = article.authors.map((author, index, arr) =>
    toAuthorship(author, index, arr.length),
  );

  const isRetracted =
    article.retractionStatus === "retracted" ||
    article.retractionStatus === "retraction-notice";

  const work: ScholarlyWork = {
    id: `pmid:${pmid}`,
    title: article.title || "Untitled work",
    year: article.publicationYear,
    publicationDate: article.publicationDate,
    doi,
    pmid,
    pmcid,
    pubmedUrl: pubmedUrlForPmid(pmid),
    sourceName: article.journal,
    abstract: article.abstract,
    topics: [],
    keywords: article.keywords,
    meshTerms: article.meshTerms,
    publicationTypes: article.publicationTypes,
    isRetracted,
    retractionStatus: article.retractionStatus,
    sources: ["pubmed"],
    sourceRefs: [
      {
        source: "pubmed",
        sourceId: pmid,
        url: pubmedUrlForPmid(pmid),
      },
    ],
    queryMatches: options.queryMatches,
    authorships,
  };

  work.canonicalKey = computeCanonicalKey(work);
  return work;
}

function toAuthorship(
  author: PubmedParsedArticle["authors"][number],
  index: number,
  total: number,
): ScholarlyWorkAuthor {
  const isCollective = Boolean(author.collectiveName);
  const displayName = isCollective
    ? author.collectiveName!
    : [author.foreName, author.lastName, author.suffix]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      author.lastName ||
      "Unknown researcher";

  const orcid = normalizeOrcid(author.orcid);
  const affiliationTexts = author.affiliations
    .map((a) => a.text)
    .filter(Boolean);
  const institutions = author.affiliations
    .map((a) => {
      const ror = a.identifiers.find((i) => i.source.toLowerCase() === "ror");
      return {
        name: a.text,
        id: ror?.value,
        type: "publication_affiliation",
      };
    })
    .filter((i) => i.name);

  const authorId = isCollective
    ? `pubmed-collective:${displayName.toLowerCase().replace(/\s+/g, "-").slice(0, 60)}`
    : provisionalPubmedAuthorId({
        displayName,
        affiliation: affiliationTexts[0],
        orcid: orcid ?? undefined,
      });

  return {
    authorId,
    name: displayName,
    lastName: author.lastName,
    foreName: author.foreName,
    initials: author.initials,
    orcid: orcid ? `https://orcid.org/${orcid}` : undefined,
    authorPosition: index === 0 ? "first" : index === total - 1 ? "last" : "middle",
    isFirstAuthor: index === 0,
    isLastAuthor: index === total - 1,
    isCollectiveAuthor: isCollective,
    identityConfidence: orcid
      ? "verified-orcid"
      : affiliationTexts[0]
        ? "name-affiliation-cluster"
        : "unresolved",
    institutions,
    affiliationTexts,
  };
}
