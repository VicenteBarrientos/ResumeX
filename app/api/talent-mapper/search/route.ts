import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import { assertAiQuota, recordUsage } from "@/lib/entitlements";
import { quotaDenialResponse } from "@/lib/quota";
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
  const { userId, error: authError } = await requireSession();
  if (authError) return authError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body.", {
      status: 400,
      action: "Retry the search from the Talent Mapper UI.",
    });
  }

  const parsed = searchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid search request.", {
      status: 400,
      action: "Review criteria and enable at least one search query.",
      details: parsed.error.flatten(),
    });
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
    return apiError("No enabled queries.", {
      status: 400,
      action: "Enable or add at least one OpenAlex or PubMed query before running the search.",
    });
  }

  if (needsOpenAlex && openAlexQueries.length === 0 && !needsPubmed) {
    return apiError("No enabled OpenAlex queries.", {
      status: 400,
      action: "Enable or add at least one OpenAlex query before searching.",
    });
  }

  if (needsPubmed && pubmedQueries.length === 0 && !needsOpenAlex) {
    return apiError("No enabled PubMed queries.", {
      status: 400,
      action: "Enable or add at least one PubMed query before searching.",
    });
  }

  // Live mode may fall back to demo when no source is configured
  if (mode === "live") {
    const openAlexOk = !needsOpenAlex || isOpenAlexConfigured();
    const pubmedOk = !needsPubmed || isPubmedConfigured();
    if (!openAlexOk && !pubmedOk) {
      mode = "demo";
    }
  }

  // Demo snapshot / config fallback does not burn live-search quota.
  if (mode !== "demo") {
    const denial = await assertAiQuota(userId, "talent_mapper_search");
    if (denial) return quotaDenialResponse(denial);
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
      return apiError("Works found but no author metadata matched the criteria.", {
        status: 404,
        action:
          "Broaden required techniques, enable adjacent queries, or lower specificity, then search again.",
        extra: {
          warnings: result.meta.warnings,
          diagnostics: result.meta.diagnostics,
        },
      });
    }

    if (mode !== "demo") {
      await recordUsage(userId, "talent_mapper_search");
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

    return apiError(normalized.message, {
      status,
      action,
      code,
    });
  }
}
