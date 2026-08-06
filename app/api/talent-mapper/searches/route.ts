import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/require-auth";
import {
  candidateCountFromResult,
  toCriteriaJson,
  toQueriesJson,
  toSearchSummary,
  worksReviewedFromResult,
  type TalentSearchWriteInput,
} from "@/lib/talent-mapper/search-store";
import type { SearchMode, TalentSearchResult } from "@/lib/talent-mapper/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId, error: authError } = await requireSession();
  if (authError) return authError;

  const rows = await db.talentSearch.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { shortlist: true } },
    },
  });

  return NextResponse.json({
    searches: rows.map(toSearchSummary),
  });
}

export async function POST(request: Request) {
  const { userId, error: authError } = await requireSession();
  if (authError) return authError;

  let body: TalentSearchWriteInput;
  try {
    body = (await request.json()) as TalentSearchWriteInput;
  } catch {
    return apiError("Invalid JSON body.", { status: 400 });
  }

  const roleTitle = body.roleTitle?.trim();
  if (!roleTitle) {
    return apiError("roleTitle is required.", { status: 400 });
  }

  const mode: SearchMode = body.mode === "live" ? "live" : "demo";
  const result: TalentSearchResult | null = body.result ?? null;
  const shortlist = Array.isArray(body.shortlist)
    ? [...new Set(body.shortlist.filter(Boolean))]
    : [];
  const notes = body.notes && typeof body.notes === "object" ? body.notes : {};

  const created = await db.talentSearch.create({
    data: {
      userId,
      roleTitle,
      jobDescription: body.jobDescription?.trim() || "",
      criteriaJson: toCriteriaJson(body.criteria ?? null, body.extractedCriteria ?? null),
      queriesJson: toQueriesJson(body.queries, body.pubmedQueries, body.sources),
      mode,
      resultJson: result ?? undefined,
      worksReviewed: worksReviewedFromResult(result),
      uiStep: body.uiStep ?? null,
      shortlist: {
        create: shortlist.map((authorId) => ({ authorId })),
      },
      notes: {
        create: Object.entries(notes)
          .filter(([, bodyText]) => typeof bodyText === "string" && bodyText.trim())
          .map(([authorId, bodyText]) => ({
            authorId,
            body: bodyText.trim(),
          })),
      },
    },
    include: {
      shortlist: true,
      notes: true,
      _count: { select: { shortlist: true } },
    },
  });

  return NextResponse.json(
    {
      search: toSearchSummary(created),
      candidateCount: candidateCountFromResult(result),
    },
    { status: 201 },
  );
}
