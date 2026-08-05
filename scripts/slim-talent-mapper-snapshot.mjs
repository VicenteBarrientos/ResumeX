import fs from "node:fs";
import path from "node:path";

function reconstructAbstract(index) {
  if (!index || typeof index !== "object") return "";
  try {
    const positions = [];
    for (const [word, idxs] of Object.entries(index)) {
      if (!Array.isArray(idxs)) continue;
      for (const i of idxs) {
        if (typeof i === "number" && Number.isFinite(i)) {
          positions.push([i, word]);
        }
      }
    }
    positions.sort((a, b) => a[0] - b[0]);
    return positions
      .map(([, w]) => w)
      .join(" ")
      .slice(0, 1200);
  } catch {
    return "";
  }
}

function slimAuthorship(a) {
  return {
    author_position: a.author_position,
    author: a.author
      ? {
          id: a.author.id,
          display_name: a.author.display_name,
          orcid: a.author.orcid ?? null,
        }
      : null,
    institutions: (a.institutions || []).slice(0, 2).map((inst) => ({
      id: inst.id,
      display_name: inst.display_name,
      country_code: inst.country_code,
      type: inst.type,
    })),
  };
}

function slimWork(w) {
  const title = w.display_name || w.title || "";
  const abstract = reconstructAbstract(w.abstract_inverted_index);
  return {
    id: w.id,
    doi: w.doi ?? null,
    display_name: title,
    publication_year: w.publication_year ?? null,
    publication_date: w.publication_date ?? null,
    cited_by_count: w.cited_by_count ?? 0,
    is_retracted: Boolean(w.is_retracted),
    authorships: (w.authorships || []).slice(0, 12).map(slimAuthorship),
    primary_topic: w.primary_topic
      ? { display_name: w.primary_topic.display_name }
      : null,
    topics: (w.topics || []).slice(0, 4).map((t) => ({
      display_name: t.display_name,
    })),
    keywords: (w.keywords || []).slice(0, 8).map((k) => ({
      display_name: k.display_name || k.keyword || k,
    })),
    abstract_text: abstract,
    primary_location: w.primary_location
      ? {
          source: w.primary_location.source
            ? { display_name: w.primary_location.source.display_name }
            : null,
          landing_page_url: w.primary_location.landing_page_url ?? null,
        }
      : null,
  };
}

const rawPath = path.join(process.cwd(), "data", "talent-mapper-demo.json");
const raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));
const slimmed = {
  ...raw,
  works: (raw.works || []).map(slimWork),
};
fs.writeFileSync(rawPath, JSON.stringify(slimmed, null, 0));
console.log(
  "slimmed works:",
  slimmed.works.length,
  "bytes:",
  fs.statSync(rawPath).size
);
