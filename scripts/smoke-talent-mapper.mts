import { getDemoCriteria } from "../lib/talent-mapper/criteria";
import { buildSearchQueries } from "../lib/talent-mapper/query-builder";
import { aggregateAuthors } from "../lib/talent-mapper/aggregate-authors";
import snapshot from "../data/talent-mapper-demo.json";

const criteria = getDemoCriteria();
const queries = buildSearchQueries(criteria);
const works = snapshot.works;
const candidates = aggregateAuthors(works as never[], criteria, { limit: 50 });

console.log(
  JSON.stringify(
    {
      queries: queries.map((q) => q.query),
      works: works.length,
      candidates: candidates.length,
      top: candidates.slice(0, 5).map((c) => ({
        name: c.name,
        score: c.score,
        works: c.relevantWorkCount,
        required: c.matchedRequiredCriteria.map((m) => m.criterion).slice(0, 3),
        institution: c.likelyInstitution?.name,
      })),
    },
    null,
    2,
  ),
);
