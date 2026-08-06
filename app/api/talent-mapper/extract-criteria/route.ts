import { NextResponse } from "next/server";
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
  const { error: authError } = await requireSession();
  if (authError) return authError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body.", action: "Send a JSON payload with jobDescription." },
      { status: 400 }
    );
  }

  const parsed = extractCriteriaRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Empty job description.",
        action: "Paste a role description, or load the scientific sourcing demo.",
      },
      { status: 400 }
    );
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

  const result = await extractSourcingCriteria({ jobDescription, roleTitle });
  return NextResponse.json({
    ...result,
    pubmedQueries: buildPubmedQueries(result.criteria),
  });
}
