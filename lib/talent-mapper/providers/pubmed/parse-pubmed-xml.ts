import { XMLParser } from "fast-xml-parser";

export type PubmedParsedAuthor = {
  lastName?: string;
  foreName?: string;
  initials?: string;
  suffix?: string;
  collectiveName?: string;
  orcid?: string;
  affiliations: Array<{
    text: string;
    identifiers: Array<{ source: string; value: string }>;
  }>;
};

export type PubmedParsedArticle = {
  pmid: string;
  title: string;
  abstract?: string;
  journal?: string;
  publicationYear?: number;
  publicationDate?: string;
  doi?: string;
  pmcid?: string;
  authors: PubmedParsedAuthor[];
  meshTerms: string[];
  keywords: string[];
  publicationTypes: string[];
  retractionStatus: "none" | "retracted" | "retraction-notice" | "corrected" | "unknown";
  parseWarnings: string[];
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  trimValues: true,
  // Do not resolve external entities (XXE).
  processEntities: true,
  htmlEntities: true,
});

/**
 * Parse PubMed EFetch XML into article records.
 * Malformed individual articles are skipped with warnings — batch continues.
 */
export function parsePubmedXml(xml: string): {
  articles: PubmedParsedArticle[];
  warnings: string[];
} {
  const warnings: string[] = [];
  if (!xml || !xml.trim()) {
    return { articles: [], warnings: ["Empty PubMed XML response."] };
  }

  let parsed: unknown;
  try {
    parsed = parser.parse(xml);
  } catch {
    return {
      articles: [],
      warnings: ["PubMed XML could not be parsed."],
    };
  }

  const articlesNode = dig(parsed, ["PubmedArticleSet", "PubmedArticle"]);
  const rawArticles = asArray(articlesNode);
  const articles: PubmedParsedArticle[] = [];

  for (const raw of rawArticles) {
    try {
      const article = parseOneArticle(raw);
      if (article) {
        articles.push(article);
        warnings.push(...article.parseWarnings);
      }
    } catch {
      warnings.push("One PubMed record could not be normalized.");
    }
  }

  return { articles, warnings };
}

function parseOneArticle(raw: unknown): PubmedParsedArticle | null {
  if (!raw || typeof raw !== "object") return null;
  const node = raw as Record<string, unknown>;
  const medline = asRecord(node.MedlineCitation);
  const pubmedData = asRecord(node.PubmedData);
  if (!medline) return null;

  const pmid = textContent(medline.PMID);
  if (!pmid || !/^\d+$/.test(pmid)) return null;

  const article = asRecord(medline.Article) || {};
  const parseWarnings: string[] = [];

  const title = parseArticleTitle(article.ArticleTitle) || "Untitled work";
  const abstract = parseStructuredAbstract(article.Abstract);
  const journal =
    textContent(dig(article, ["Journal", "Title"])) ||
    textContent(dig(article, ["Journal", "ISOAbbreviation"])) ||
    undefined;

  const { year, date } = parsePublicationDate(article, medline);
  const ids = parseArticleIds(pubmedData, medline);
  const authors = parseAuthors(article.AuthorList);
  const meshTerms = parseMeshHeadings(medline.MeshHeadingList);
  const keywords = parseKeywords(medline.KeywordList);
  const publicationTypes = parsePublicationTypes(article.PublicationTypeList);
  const retractionStatus = parseCommentsCorrections(
    medline.CommentsCorrectionsList,
    publicationTypes,
  );

  if (!abstract) {
    parseWarnings.push(`PMID ${pmid}: abstract missing.`);
  }

  return {
    pmid,
    title,
    abstract,
    journal,
    publicationYear: year,
    publicationDate: date,
    doi: ids.doi,
    pmcid: ids.pmcid,
    authors,
    meshTerms,
    keywords,
    publicationTypes,
    retractionStatus,
    parseWarnings: [],
  };
}

export function asArray<T = unknown>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

export function textContent(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("#text" in obj) return textContent(obj["#text"]);
    // Inline formatting: concatenate child text nodes
    return Object.values(obj)
      .map((v) => textContent(v))
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return "";
}

export function getAttribute(
  value: unknown,
  name: string,
): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const obj = value as Record<string, unknown>;
  const attr = obj[`@_${name}`] ?? obj[name];
  return attr == null ? undefined : String(attr);
}

export function parseArticleTitle(value: unknown): string {
  return textContent(value);
}

export function parseStructuredAbstract(abstractNode: unknown): string | undefined {
  if (!abstractNode || typeof abstractNode !== "object") return undefined;
  const node = abstractNode as Record<string, unknown>;
  const texts = asArray(node.AbstractText);
  if (texts.length === 0) return undefined;

  const parts: string[] = [];
  for (const block of texts) {
    const label =
      getAttribute(block, "Label") ||
      getAttribute(block, "NlmCategory") ||
      "";
    const body = textContent(block);
    if (!body) continue;
    if (label) {
      parts.push(`${label.toUpperCase()}: ${body}`);
    } else {
      parts.push(body);
    }
  }
  const joined = parts.join("\n").trim();
  return joined || undefined;
}

export function parseAuthors(authorList: unknown): PubmedParsedAuthor[] {
  if (!authorList || typeof authorList !== "object") return [];
  const list = asRecord(authorList);
  const authors = asArray(list?.Author);
  return authors.map((raw) => {
    const a = asRecord(raw) || {};
    const collectiveName = textContent(a.CollectiveName) || undefined;
    const affiliations = asArray(a.AffiliationInfo).map((info) => {
      const infoRec = asRecord(info) || {};
      const text = textContent(infoRec.Affiliation);
      const identifiers = asArray(infoRec.Identifier)
        .map((id) => {
          const source = getAttribute(id, "Source") || "unknown";
          const value = textContent(id);
          if (!value) return null;
          return { source, value };
        })
        .filter((x): x is { source: string; value: string } => x != null);

      // Some records put ROR inline
      const rorMatch = text.match(/https?:\/\/ror\.org\/[^\s]+/i);
      if (rorMatch && !identifiers.some((i) => i.source.toLowerCase() === "ror")) {
        identifiers.push({ source: "ROR", value: rorMatch[0] });
      }

      return { text, identifiers };
    }).filter((aff) => aff.text);

    const identifiers = asArray(a.Identifier);
    let orcid: string | undefined;
    for (const id of identifiers) {
      const source = (getAttribute(id, "Source") || "").toUpperCase();
      if (source === "ORCID") {
        orcid = textContent(id);
      }
    }

    return {
      lastName: textContent(a.LastName) || undefined,
      foreName: textContent(a.ForeName) || undefined,
      initials: textContent(a.Initials) || undefined,
      suffix: textContent(a.Suffix) || undefined,
      collectiveName,
      orcid,
      affiliations,
    };
  });
}

export function parsePublicationDate(
  article: Record<string, unknown>,
  medline: Record<string, unknown>,
): { year?: number; date?: string } {
  // 1. Electronic ArticleDate
  const articleDates = asArray(article.ArticleDate);
  for (const ad of articleDates) {
    const rec = asRecord(ad);
    if (!rec) continue;
    const year = parseYear(textContent(rec.Year));
    const month = textContent(rec.Month);
    const day = textContent(rec.Day);
    if (year && month && day) {
      return {
        year,
        date: `${year}-${pad2(month)}-${pad2(day)}`,
      };
    }
    if (year && month) {
      return { year, date: `${year}-${pad2(month)}` };
    }
    if (year) return { year };
  }

  // 2–3. Journal issue PubDate
  const pubDate = asRecord(dig(article, ["Journal", "JournalIssue", "PubDate"]));
  if (pubDate) {
    const year = parseYear(textContent(pubDate.Year));
    const month = textContent(pubDate.Month);
    const day = textContent(pubDate.Day);
    if (year && month && day) {
      return { year, date: `${year}-${pad2(month)}-${pad2(day)}` };
    }
    if (year && month) {
      return { year, date: `${year}-${pad2(month)}` };
    }
    if (year) return { year };

    // 4. MedlineDate free text
    const medlineDate = textContent(pubDate.MedlineDate);
    const fromMedline = extractYearFromMedlineDate(medlineDate);
    if (fromMedline) return { year: fromMedline };
  }

  // DateRevised / DateCompleted as last resort year only
  const completed = asRecord(medline.DateCompleted);
  const year = parseYear(textContent(completed?.Year));
  if (year) return { year };

  return {};
}

export function parseArticleIds(
  pubmedData: Record<string, unknown> | null,
  medline: Record<string, unknown>,
): { doi?: string; pmcid?: string } {
  const ids = [
    ...asArray(pubmedData?.ArticleIdList && asRecord(pubmedData.ArticleIdList)?.ArticleId),
    ...asArray(asRecord(medline.Article)?.ELocationID),
  ];

  let doi: string | undefined;
  let pmcid: string | undefined;

  for (const id of ids) {
    const idType = (getAttribute(id, "IdType") || getAttribute(id, "EIdType") || "").toLowerCase();
    const value = textContent(id);
    if (!value) continue;
    if (idType === "doi") doi = value;
    if (idType === "pmc") pmcid = value.toUpperCase().startsWith("PMC")
      ? value.toUpperCase()
      : `PMC${value}`;
  }

  return { doi, pmcid };
}

export function parseMeshHeadings(meshList: unknown): string[] {
  const headings = asArray(asRecord(meshList)?.MeshHeading);
  const terms: string[] = [];
  for (const h of headings) {
    const rec = asRecord(h);
    const descriptor = textContent(rec?.DescriptorName);
    if (descriptor) terms.push(descriptor);
  }
  return unique(terms);
}

export function parseKeywords(keywordList: unknown): string[] {
  const lists = asArray(keywordList);
  const terms: string[] = [];
  for (const list of lists) {
    for (const kw of asArray(asRecord(list)?.Keyword)) {
      const text = textContent(kw);
      if (text) terms.push(text);
    }
  }
  return unique(terms);
}

export function parsePublicationTypes(list: unknown): string[] {
  const types = asArray(asRecord(list)?.PublicationType);
  return unique(types.map((t) => textContent(t)).filter(Boolean));
}

export function parseCommentsCorrections(
  list: unknown,
  publicationTypes: string[],
): PubmedParsedArticle["retractionStatus"] {
  const typesLower = publicationTypes.map((t) => t.toLowerCase());
  if (typesLower.some((t) => t.includes("retraction of publication"))) {
    return "retraction-notice";
  }
  if (typesLower.some((t) => t.includes("retracted publication"))) {
    return "retracted";
  }
  if (typesLower.some((t) => t.includes("published erratum") || t.includes("corrected"))) {
    return "corrected";
  }

  const items = asArray(asRecord(list)?.CommentsCorrections);
  for (const item of items) {
    const refType = (getAttribute(item, "RefType") || "").toLowerCase();
    if (refType.includes("retractionin") || refType.includes("retractionof")) {
      return "retracted";
    }
    if (refType.includes("erratumin") || refType.includes("corrigendum")) {
      return "corrected";
    }
  }
  return "none";
}

function dig(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseYear(value: string): number | undefined {
  const match = value.match(/^(19|20)\d{2}$/);
  return match ? Number(match[0]) : undefined;
}

function extractYearFromMedlineDate(value: string): number | undefined {
  if (!value) return undefined;
  const match = value.match(/\b((?:19|20)\d{2})\b/);
  return match ? Number(match[1]) : undefined;
}

function pad2(value: string): string {
  const months: Record<string, string> = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };
  const lower = value.toLowerCase().slice(0, 3);
  if (months[lower]) return months[lower];
  const num = Number(value);
  if (Number.isFinite(num) && num >= 1 && num <= 12) {
    return String(num).padStart(2, "0");
  }
  if (/^\d{2}$/.test(value)) return value;
  if (/^\d$/.test(value)) return `0${value}`;
  return "01";
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}
