import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildPubmedQueries, validatePubmedQuery } from "../query-builder";
import {
  parseEsearchResponse,
  prioritizePmidsByRrf,
} from "../parse-esearch";
import { parsePubmedXml } from "../parse-pubmed-xml";
import { normalizePubmedArticle } from "../normalize";
import { getDemoCriteria } from "@/lib/talent-mapper/criteria";

describe("buildPubmedQueries", () => {
  const criteria = getDemoCriteria();

  it("uses [tiab] and optional [mh] with Boolean grouping", () => {
    const queries = buildPubmedQueries(criteria);
    expect(queries.length).toBeGreaterThanOrEqual(4);
    expect(queries.length).toBeLessThanOrEqual(8);
    expect(queries.some((q) => q.query.includes("[tiab]"))).toBe(true);
    expect(queries.some((q) => /OR|AND/.test(q.query))).toBe(true);
    for (const q of queries) {
      expect(validatePubmedQuery(q.query)).toBeNull();
      expect(q.query.length).toBeLessThanOrEqual(1200);
    }
  });

  it("applies date range and hasabstract when configured", () => {
    const queries = buildPubmedQueries({
      ...criteria,
      publicationYearFrom: 2020,
    });
    expect(queries[0].query).toMatch(/2020:\d{4}\[dp\]/);
    expect(queries[0].query).toContain("hasabstract");
  });

  it("deduplicates identical generated queries", () => {
    const queries = buildPubmedQueries(criteria);
    const set = new Set(queries.map((q) => q.query.toLowerCase()));
    expect(set.size).toBe(queries.length);
  });

  it("validates empty and unbalanced queries", () => {
    expect(validatePubmedQuery("")).toMatch(/empty/i);
    expect(validatePubmedQuery("(foo[tiab]")).toMatch(/parentheses/i);
  });
});

describe("parseEsearchResponse + RRF", () => {
  it("extracts PMIDs and count", () => {
    const parsed = parseEsearchResponse({
      esearchresult: {
        count: "3",
        idlist: ["111", "222", "333"],
        querytranslation: "viral rescue[tiab]",
      },
    });
    expect(parsed.count).toBe(3);
    expect(parsed.pmids).toEqual(["111", "222", "333"]);
    expect(parsed.queryTranslation).toContain("viral rescue");
  });

  it("handles no results and error responses", () => {
    expect(
      parseEsearchResponse({ esearchresult: { count: "0", idlist: [] } }).pmids,
    ).toEqual([]);
    expect(
      parseEsearchResponse({ esearchresult: { ERROR: "Invalid query" } }).error,
    ).toMatch(/Invalid/);
  });

  it("prioritizes PMIDs with reciprocal-rank fusion deterministically", () => {
    const ranked = prioritizePmidsByRrf(
      [
        { pmid: "A", queryId: "q1", rank: 1 },
        { pmid: "B", queryId: "q1", rank: 2 },
        { pmid: "A", queryId: "q2", rank: 3 },
        { pmid: "C", queryId: "q2", rank: 1 },
      ],
      10,
    );
    expect(ranked[0].pmid).toBe("A");
    expect(ranked.map((r) => r.pmid)).toEqual(["A", "C", "B"]);
    const again = prioritizePmidsByRrf(
      [
        { pmid: "A", queryId: "q1", rank: 1 },
        { pmid: "B", queryId: "q1", rank: 2 },
        { pmid: "A", queryId: "q2", rank: 3 },
        { pmid: "C", queryId: "q2", rank: 1 },
      ],
      10,
    );
    expect(again).toEqual(ranked);
  });
});

describe("parsePubmedXml + normalize", () => {
  const xml = readFileSync(
    join(__dirname, "..", "fixtures", "sample-efetch.xml"),
    "utf8",
  );

  it("parses structured abstracts, ORCID, affiliations, DOI/PMCID, dates, MeSH", () => {
    const { articles } = parsePubmedXml(xml);
    expect(articles.length).toBeGreaterThanOrEqual(4);
    // Malformed PMID records are skipped without aborting the batch
    expect(articles.every((a) => /^\d+$/.test(a.pmid))).toBe(true);

    const main = articles.find((a) => a.pmid === "99900001")!;
    expect(main.abstract).toContain("BACKGROUND:");
    expect(main.abstract).toContain("METHODS:");
    expect(main.authors[0].orcid).toContain("0000-0002-1825-0097");
    expect(main.authors[0].affiliations.length).toBe(2);
    expect(
      main.authors[0].affiliations[0].identifiers.some(
        (i) => i.source.toLowerCase() === "ror",
      ),
    ).toBe(true);
    expect(main.doi).toContain("10.1000/demo.influenza.rg.2023");
    expect(main.pmcid).toBe("PMC9990001");
    expect(main.publicationYear).toBe(2023);
    expect(main.meshTerms).toContain("Reverse Genetics");
    expect(main.keywords).toContain("viral rescue");
    expect(main.publicationTypes).toContain("Journal Article");

    const review = articles.find((a) => a.pmid === "99900002")!;
    expect(review.abstract).toBeUndefined();
    expect(review.publicationTypes).toContain("Review");

    const collective = articles.find((a) => a.pmid === "99900003")!;
    expect(collective.authors[0].collectiveName).toMatch(/Consortium/i);
    expect(collective.publicationYear).toBe(2020);

    const retracted = articles.find((a) => a.pmid === "99900004")!;
    expect(retracted.retractionStatus).toBe("retracted");

    const normalized = normalizePubmedArticle(main);
    expect(normalized?.pmid).toBe("99900001");
    expect(normalized?.sources).toEqual(["pubmed"]);
    expect(normalized?.authorships[0].orcid).toContain("orcid.org");
  });
});
