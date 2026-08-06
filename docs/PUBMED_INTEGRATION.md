# PubMed integration — ResumeX Talent Mapper

OpenAlex provides broad scholarly discovery and research-graph data. PubMed adds precise biomedical search and structured biomedical evidence. ResumeX merges both sources into one recruiter-reviewed view without counting the same publication twice.

## Architecture

```
Recruiter criteria
→ OpenAlex query builder → OpenAlex provider
→ PubMed query builder → ESearch → PMID deduplication (RRF) → EFetch → PubMed parser
→ canonical publication merge
→ conservative author reconciliation
→ evidence aggregation
→ researcher scoring
→ Talent Mapper UI
```

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `NCBI_EMAIL` | For live PubMed | Required by NCBI E-utilities policy |
| `NCBI_API_KEY` | Optional | Higher rate limit (~10 rps vs ~3) |
| `NCBI_TOOL` | Optional | Defaults to `ResumeXTalentMapper` |
| `PUBMED_ENABLED` | Optional | Defaults to `true` |
| `PUBMED_MAX_RESULTS_PER_QUERY` | Optional | Default `25` |
| `PUBMED_MAX_TOTAL_RECORDS` | Optional | Default `150` |

Create an NCBI API key at [NCBI account settings](https://www.ncbi.nlm.nih.gov/account/settings/).

Without `NCBI_EMAIL`, Talent Mapper stays up: OpenAlex and the demo snapshot continue to work, and the UI shows that PubMed live search is not configured.

Keys are server-side only. They are never returned in API responses or logged.

## ESearch and EFetch

1. **ESearch** (`esearch.fcgi`, `retmode=json`, `sort=relevance`) retrieves PMIDs per recruiter-edited PubMed query.
2. PMIDs are unioned and ranked with reciprocal-rank fusion: `score = sum(1 / (60 + rank))`.
3. **EFetch** (`efetch.fcgi`, `retmode=xml`, `rettype=abstract`) retrieves detailed records in batches of ≤100.

Requests use `URLSearchParams` POST bodies, fixed NCBI base URLs, throttling (≈380 ms without key / ≈140 ms with key), retries with jitter for 429/5xx, and `AbortSignal` support.

## Query generation

PubMed queries are **not** the same as OpenAlex queries. The PubMed builder emits 4–8 Boolean queries with `[tiab]` / `[mh]` / optional `[dp]` and configurable `hasabstract`. Recruiters can enable, edit, add, remove, and reset them in the Search Strategy step.

Publication types are **not** excluded at search time. Classification happens during normalization and scoring.

## Deduplication and authors

Canonical work matching priority: DOI → PMID → PMCID → OpenAlex/PubMed cross-id → exact title+year. No loose title similarity.

Author reconciliation is conservative: ORCID, or unique name match on the same canonical work. Ambiguous names stay separate and may show “Possible duplicate researcher.”

## Scoring

- One canonical publication contributes once, even if returned by both sources.
- Direct title/abstract evidence ranks above MeSH-only topical evidence.
- Review / editorial / letter types weaken hands-on technique weight.
- Retracted publications and retraction notices produce no positive evidence.
- Affiliation text is labeled as publication affiliation, not current employment.

## Demo mode

Demo mode works without NCBI credentials. OpenAlex uses the saved public snapshot; PubMed uses simulated PubMed-style records (including a DOI that merges with an OpenAlex work). Live NCBI search requires `NCBI_EMAIL`.

## Abstracts and copyright

Full abstracts are used transiently server-side for evidence matching. The UI shows short excerpts and links to PubMed. CSV export includes PMIDs and PubMed URLs, not full abstracts. No PMC full-text retrieval in this integration.

Persistent multi-instance PubMed caching is future work; request-level PMID deduplication is implemented.

## Attribution

PubMed / Medline data via [NCBI E-utilities](https://www.ncbi.nlm.nih.gov/books/NBK25501/). See the [NCBI disclaimer](https://www.ncbi.nlm.nih.gov/home/about/policies/).

## Testing

```bash
npm test                 # includes PubMed unit tests with fixtures
npm run test:pubmed:live # optional; requires NCBI_EMAIL; excluded from default CI intent
```

## Known limitations

- No PMC full-text, ORCID API enrichment, email scraping, or automated outreach sending.
- Author identity without ORCID remains provisional.
- Production multi-instance deployments may eventually need shared NCBI rate limiting and persistent provider caching.
