import fs from "node:fs";
import path from "node:path";

const queries = [
  '"viral rescue" "reverse genetics"',
  '"mammalian cell culture" transfection',
  '"molecular cloning" virology',
  'influenza "reverse genetics"',
  "coronavirus rescue system",
];

const select = [
  "id",
  "doi",
  "display_name",
  "title",
  "publication_year",
  "publication_date",
  "cited_by_count",
  "authorships",
  "primary_topic",
  "topics",
  "keywords",
  "abstract_inverted_index",
  "primary_location",
  "locations",
  "is_retracted",
].join(",");

const ua = "ResumeX-TalentMapper/0.1 (mailto:demo@resumex.local)";

async function fetchQuery(q) {
  const url =
    "https://api.openalex.org/works?search=" +
    encodeURIComponent(q) +
    "&per_page=25&filter=from_publication_date:2018-01-01&select=" +
    select;
  console.log("Fetching:", q);
  const res = await fetch(url, { headers: { "User-Agent": ua } });
  console.log("  status", res.status);
  if (!res.ok) {
    console.log("  body", await res.text());
    return [];
  }
  const data = await res.json();
  console.log("  got", (data.results || []).length);
  return data.results || [];
}

const all = [];
for (const q of queries) {
  all.push(...(await fetchQuery(q)));
}

const map = new Map();
for (const w of all) map.set(w.id, w);
const works = [...map.values()];
console.log("unique works:", works.length);

const outDir = path.join(process.cwd(), "data");
fs.mkdirSync(outDir, { recursive: true });
const payload = {
  mode: "demo",
  label: "Demo snapshot — saved public OpenAlex data",
  disclaimer:
    "This demonstration uses a saved public-data snapshot. Run a live search to retrieve current results.",
  fetchedAt: new Date().toISOString(),
  source: "openalex",
  queries,
  works,
};
const outPath = path.join(outDir, "talent-mapper-demo.json");
fs.writeFileSync(outPath, JSON.stringify(payload));
console.log("wrote", outPath, fs.statSync(outPath).size, "bytes");
