import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import { assertAiQuota, recordUsage } from "@/lib/entitlements";
import { quotaDenialResponse } from "@/lib/quota";
import { extractSourcingCriteria } from "@/lib/talent-mapper/ai";
import { SCIENTIFIC_DEMO_JD, getDemoCriteria } from "@/lib/talent-mapper/criteria";
import { buildSearchQueries } from "@/lib/talent-mapper/query-builder";
import { buildPubmedQueries } from "@/lib/talent-mapper/providers/pubmed/query-builder";
import { extractCriteriaRequestSchema } from "@/lib/talent-mapper/schemas";
import { requireSession } from "@/lib/require-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const { userId, error: authError } = await requireSession();
  if (authError) return authError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body.", {
      status: 400,
      action: "Send a JSON payload with jobDescription.",
    });
  }

  const parsed = extractCriteriaRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Empty job description.", {
      status: 400,
      action: "Paste a role description, or load the scientific sourcing demo.",
    });
  }

  const { jobDescription, roleTitle } = parsed.data;

  // Fast path for the interview demo JD
  if (
    jobDescription.includes("Scientific sourcing demo inspired by a real-world") ||
    jobDescription.trim() === SCIENTIFIC_DEMO_JD.trim()
  ) {
    const criteria = getDemoCriteria();
    if (roleTitle?.trim()) criteria.roleTitle = roleTitle.trim();
    return NextResponse.json({
      criteria,
      queries: buildSearchQueries(criteria),
      pubmedQueries: buildPubmedQueries(criteria),
      usedAi: false,
      demo: true,
    });
  }

  const denial = await assertAiQuota(userId, "extract_criteria");
  if (denial) return quotaDenialResponse(denial);

  const result = await extractSourcingCriteria({ jobDescription, roleTitle });
  await recordUsage(userId, "extract_criteria");
  return NextResponse.json({
    ...result,
    pubmedQueries: buildPubmedQueries(result.criteria),
  });
}
