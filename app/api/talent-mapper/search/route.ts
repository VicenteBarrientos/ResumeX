import { NextResponse } from "next/server";
import { aggregateAuthors } from "@/lib/talent-mapper/aggregate-authors";
import { searchDemoWorks } from "@/lib/talent-mapper/demo-data";
import { normalizeUnknownError } from "@/lib/talent-mapper/errors";
import {
  getOpenAlexApiKey,
  isOpenAlexConfigured,
  searchOpenAlexWorks,
} from "@/lib/talent-mapper/openalex";
import { enabledQueries } from "@/lib/talent-mapper/query-builder";
import { searchRequestSchema } from "@/lib/talent-mapper/schemas";
import type { SearchMode, TalentSearchResult } from "@/lib/talent-mapper/types";
import { requireSession } from "@/lib/require-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DISCLAIMER =
  "Talent Mapper prioritizes public research evidence for recruiter review. Scores reflect relevance to the search criteria, not overall candidate quality, availability or hiring eligibility.";

export async function POST(req: Request) {
  const { error: authError } = await requireSession();
  if (authError) return authError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body.", action: "Retry the search from the Talent Mapper UI." },
      { status: 400 }
    );
  }

  const parsed = searchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid search request.",
        action: "Review criteria and enable at least one search query.",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  let mode: SearchMode = parsed.data.mode;
  const criteria = parsed.data.criteria;
  const queries = enabledQueries(parsed.data.queries);

  if (queries.length === 0) {
    return NextResponse.json(
      {
        error: "No enabled queries.",
        action: "Enable or add at least one search query before running the search.",
      },
      { status: 400 }
    );
  }

  const queryTexts = queries.map((q) => q.query.trim().toLowerCase());
  if (new Set(queryTexts).size !== queryTexts.length) {
    return NextResponse.json(
      {
        error: "Duplicate query detected.",
        action: "Remove or edit duplicate queries before searching.",
      },
      { status: 400 }
    );
  }

  if (mode === "live" && !isOpenAlexConfigured()) {
    mode = "demo";
  }

  const warnings: string[] = [];
  if (parsed.data.mode === "live" && mode === "demo") {
    warnings.push(
      "Live search is not configured. Add OPENALEX_API_KEY to use current public research data, or continue with the demo snapshot."
    );
  }

  try {
    const controller = new AbortController();
    const deadlineMs = 55_000;
    const deadline = setTimeout(() => controller.abort(), deadlineMs);

    let searchOutcome;
    try {
      searchOutcome =
        mode === "live"
          ? await searchOpenAlexWorks(queries, {
              apiKey: getOpenAlexApiKey(),
              perPage: parsed.data.perPage ?? 25,
              signal: controller.signal,
              timeoutMs: 15_000,
            })
          : searchDemoWorks(queries);
    } finally {
      clearTimeout(deadline);
    }

    warnings.push(...searchOutcome.warnings);

    if (searchOutcome.works.length === 0) {
      return NextResponse.json(
        {
          error: "No works found.",
          action:
            "No strong matches were found. Try adding adjacent terminology, broadening the publication window or removing one required technique.",
          warnings,
        },
        { status: 404 }
      );
    }

    const candidates = aggregateAuthors(searchOutcome.works, criteria, {
      limit: 60,
    }).filter(
      (c) =>
        c.matchedRequiredCriteria.length > 0 ||
        c.matchedResearchAreas.length + c.matchedOrganismsOrSystems.length >= 2,
    );

    // Keep meta.uniqueResearchers aligned with returned list
    const ranked = candidates.slice(0, 50);

    if (ranked.length === 0) {
      return NextResponse.json(
        {
          error: "Works found but no author metadata matched the criteria.",
          action:
            "Broaden required techniques, enable adjacent queries, or lower specificity, then search again.",
          warnings,
        },
        { status: 404 }
      );
    }

    const result: TalentSearchResult = {
      candidates: ranked,
      meta: {
        roleTitle: criteria.roleTitle,
        worksReviewed: searchOutcome.works.length,
        uniqueResearchers: ranked.length,
        mode,
        queriesUsed: searchOutcome.queriesRun,
        searchedAt: new Date().toISOString(),
        disclaimer: DISCLAIMER,
        warnings,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    const normalized = normalizeUnknownError(error);
    const code = (error as { code?: string }).code || normalized.code;
    const action =
      (error as { action?: string }).action || normalized.action;
    const status =
      code === "missing_openalex_key" || code === "invalid_openalex_key"
        ? 503
        : code === "openalex_rate_limit"
          ? 429
          : 502;

    return NextResponse.json(
      {
        error: normalized.message,
        action,
        code,
        warnings,
      },
      { status }
    );
  }
}
