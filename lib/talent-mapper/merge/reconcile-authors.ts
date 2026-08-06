import {
  namesCompatible,
  normalizeAuthorName,
  provisionalPubmedAuthorId,
} from "@/lib/talent-mapper/normalization/authors";
import { normalizeOrcid } from "@/lib/talent-mapper/normalization/orcid";
import type {
  AuthorIdentityConfidence,
  ScholarlyWork,
  ScholarlyWorkAuthor,
} from "@/lib/talent-mapper/types";

/**
 * Conservatively reconcile author identities across OpenAlex and PubMed
 * authorships on already-merged canonical works.
 *
 * Strong merges only: ORCID, or unique name match on the same work.
 * Ambiguous common names stay separate and may be flagged as possible duplicates.
 */
export function reconcileAuthorsOnWorks(
  works: ScholarlyWork[],
): ScholarlyWork[] {
  const orcidToId = new Map<string, string>();

  // Pass 1: register ORCID → preferred author id
  for (const work of works) {
    for (const author of work.authorships) {
      const orcid = normalizeOrcid(author.orcid);
      if (!orcid) continue;
      const preferred = preferAuthorId(author.authorId);
      const existing = orcidToId.get(orcid);
      if (!existing || isOpenAlexAuthorId(preferred)) {
        orcidToId.set(orcid, preferred);
      }
    }
  }

  // Pass 2: rewrite authorships with reconciled ids
  return works.map((work) => {
    const rewritten = work.authorships.map((author, index) =>
      reconcileAuthorship(author, index, work.authorships, orcidToId),
    );

    // Same-work unique name merge between OpenAlex and PubMed provisional ids
    const byNormName = new Map<string, ScholarlyWorkAuthor[]>();
    for (const author of rewritten) {
      if (author.isCollectiveAuthor) continue;
      const key = normalizeAuthorName(author.name);
      if (!key) continue;
      if (!byNormName.has(key)) byNormName.set(key, []);
      byNormName.get(key)!.push(author);
    }

    for (const group of byNormName.values()) {
      if (group.length !== 2) continue;
      const [a, b] = group;
      const aIsOa = isOpenAlexAuthorId(a.authorId);
      const bIsOa = isOpenAlexAuthorId(b.authorId);
      if (aIsOa === bIsOa) continue;
      if (!namesCompatible(
        {
          displayName: a.name,
          lastName: a.lastName,
          foreName: a.foreName,
          initials: a.initials,
        },
        {
          displayName: b.name,
          lastName: b.lastName,
          foreName: b.foreName,
          initials: b.initials,
        },
      )) continue;

      const keeper = aIsOa ? a : b;
      const other = aIsOa ? b : a;
      other.authorId = keeper.authorId;
      other.identityConfidence = "cross-source-work-match";
      if (!keeper.orcid && other.orcid) keeper.orcid = other.orcid;
      if (!other.orcid && keeper.orcid) other.orcid = keeper.orcid;
    }

    return { ...work, authorships: rewritten };
  });
}

function reconcileAuthorship(
  author: ScholarlyWorkAuthor,
  index: number,
  all: ScholarlyWorkAuthor[],
  orcidToId: Map<string, string>,
): ScholarlyWorkAuthor {
  const orcid = normalizeOrcid(author.orcid) ?? undefined;
  const isLast = index === all.length - 1;
  const isFirst =
    author.authorPosition === "first" ||
    index === 0 ||
    Boolean(author.isFirstAuthor);

  let authorId = author.authorId;
  let confidence: AuthorIdentityConfidence =
    author.identityConfidence ?? "unresolved";

  if (orcid && orcidToId.has(orcid)) {
    authorId = orcidToId.get(orcid)!;
    confidence = "verified-orcid";
  } else if (isOpenAlexAuthorId(authorId)) {
    confidence = author.identityConfidence ?? "unresolved";
  } else if (!authorId || authorId.startsWith("pubmed-provisional:")) {
    authorId = provisionalPubmedAuthorId({
      displayName: author.name,
      affiliation: author.affiliationTexts?.[0] || author.institutions[0]?.name,
      orcid,
    });
    confidence = orcid
      ? "verified-orcid"
      : author.affiliationTexts?.[0] || author.institutions[0]?.name
        ? "name-affiliation-cluster"
        : "unresolved";
  }

  return {
    ...author,
    authorId,
    orcid: orcid ? `https://orcid.org/${orcid}` : author.orcid,
    isFirstAuthor: isFirst,
    isLastAuthor: author.isLastAuthor ?? isLast,
    identityConfidence: confidence,
  };
}

function preferAuthorId(id: string): string {
  if (isOpenAlexAuthorId(id)) return extractOpenAlexAuthorId(id)!;
  return id;
}

function isOpenAlexAuthorId(id: string): boolean {
  return Boolean(extractOpenAlexAuthorId(id));
}

function extractOpenAlexAuthorId(id: string): string | null {
  const match = id.trim().match(/A\d+/i);
  return match ? match[0].toUpperCase() : null;
}

/**
 * Flag researchers that share a normalized name but different IDs
 * within the candidate set (possible duplicates — do not auto-merge).
 */
export function findPossibleDuplicateAuthorIds(
  authors: Array<{ authorId: string; name: string }>,
): Set<string> {
  const byName = new Map<string, string[]>();
  for (const a of authors) {
    const key = normalizeAuthorName(a.name);
    if (!key) continue;
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key)!.push(a.authorId);
  }
  const flagged = new Set<string>();
  for (const ids of byName.values()) {
    const unique = [...new Set(ids)];
    if (unique.length > 1) {
      for (const id of unique) flagged.add(id);
    }
  }
  return flagged;
}
