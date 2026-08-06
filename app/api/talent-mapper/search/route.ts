import { NextResponse } from "next/server";
import { normalizeUnknownError } from "@/lib/talent-mapper/errors";
import { enabledQueries } from "@/lib/talent-mapper/query-builder";
import { buildPubmedQueries } from "@/lib/talent-mapper/providers/pubmed/query-builder";
import { runTalentMapperSearch } from "@/lib/talent-mapper/search-orchestrator";
import { searchRequestSchema } from "@/lib/talent-mapper/schemas";
import type { ResearchSource, SearchMode } from "@/lib/talent-mapper/types";
import {
  isOpenAlexConfigured,
} from "@/lib/talent-mapper/openalex";
import { isPubmedConfigured } from "@/lib/talent-mapper/providers/pubmed";
import { requireSession } from "@/lib/require-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { error: authError } = await requireSession();
  if (authError) return authError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON body.",
        action: "Retry the search from the Talent Mapper UI.",
      },
      { status: 400 },
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
      { status: 400 },
    );
  }

  let mode: SearchMode = parsed.data.mode;
  const criteria = parsed.data.criteria;
  const sources = (parsed.data.sources ?? [
    "openalex",
    "pubmed",
  ]) as ResearchSource[];

  const openAlexQueries = enabledQueries(parsed.data.queries ?? []);
  const pubmedQueries = enabledQueries(
    parsed.data.pubmedQueries?.length
      ? parsed.data.pubmedQueries
      : buildPubmedQueries(criteria),
  );

  const needsOpenAlex = sources.includes("openalex");
  const needsPubmed = sources.includes("pubmed");

  if (needsOpenAlex && openAlexQueries.length === 0 && needsPubmed && pubmedQueries.length === 0) {
    return NextResponse.json(
      {
        error: "No enabled queries.",
        action: "Enable or add at least one OpenAlex or PubMed query before running the search.",
      },
      { status: 400 },
    );
  }

  if (needsOpenAlex && openAlexQueries.length === 0 && !needsPubmed) {
    return NextResponse.json(
      {
        error: "No enabled OpenAlex queries.",
        action: "Enable or add at least one OpenAlex query before searching.",
      },
      { status: 400 },
    );
  }

  if (needsPubmed && pubmedQueries.length === 0 && !needsOpenAlex) {
    return NextResponse.json(
      {
        error: "No enabled PubMed queries.",
        action: "Enable or add at least one PubMed query before searching.",
      },
      { status: 400 },
    );
  }

  // Live mode may fall back to demo when no source is configured
  if (mode === "live") {
    const openAlexOk = !needsOpenAlex || isOpenAlexConfigured();
    const pubmedOk = !needsPubmed || isPubmedConfigured();
    if (!openAlexOk && !pubmedOk) {
      mode = "demo";
    }
  }

  try {
    const controller = new AbortController();
    const deadlineMs = 55_000;
    const deadline = setTimeout(() => controller.abort(), deadlineMs);

    let result;
    try {
      result = await runTalentMapperSearch({
        criteria,
        mode,
        sources,
        openAlexQueries:
          needsOpenAlex && openAlexQueries.length > 0
            ? openAlexQueries
            : needsOpenAlex
              ? parsed.data.queries.filter((q) => q.enabled)
              : [],
        pubmedQueries: needsPubmed ? pubmedQueries : [],
        limitPerQuery: parsed.data.limits?.perQuery ?? parsed.data.perPage ?? 25,
        totalPerSource: parsed.data.limits?.totalPerSource ?? 150,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(deadline);
    }

    if (parsed.data.mode === "live" && mode === "demo") {
      result.meta.warnings = [
        "Live search is not fully configured for the selected sources. Showing the demo snapshot instead.",
        ...result.meta.warnings,
      ];
    }

    if (result.candidates.length === 0) {
      return NextResponse.json(
        {
          error: "Works found but no author metadata matched the criteria.",
          action:
            "Broaden required techniques, enable adjacent queries, or lower specificity, then search again.",
          warnings: result.meta.warnings,
          diagnostics: result.meta.diagnostics,
        },
        { status: 404 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    const normalized = normalizeUnknownError(error);
    const code = (error as { code?: string }).code || normalized.code;
    const action =
      (error as { action?: string }).action || normalized.action;

    const status =
      code === "missing_openalex_key" ||
      code === "invalid_openalex_key" ||
      code === "PUBMED_NOT_CONFIGURED"
        ? 503
        : code === "openalex_rate_limit" || code === "PUBMED_RATE_LIMITED"
          ? 429
          : code === "no_works"
            ? 404
            : 502;

    return NextResponse.json(
      {
        error: normalized.message,
        action,
        code,
      },
      { status },
    );
  }
}
