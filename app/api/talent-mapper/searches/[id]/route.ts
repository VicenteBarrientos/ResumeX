import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/require-auth";
import {
  toCriteriaJson,
  toQueriesJson,
  toSearchDetail,
  worksReviewedFromResult,
  type TalentSearchUiStep,
  type TalentSearchWriteInput,
} from "@/lib/talent-mapper/search-store";
import type { SearchMode, TalentSearchResult } from "@/lib/talent-mapper/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function loadOwnedSearch(id: string, userId: string) {
  return db.talentSearch.findFirst({
    where: { id, userId },
    include: { shortlist: true, notes: true },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const { userId, error: authError } = await requireSession();
  if (authError) return authError;

  const { id } = await context.params;
  const row = await loadOwnedSearch(id, userId);
  if (!row) {
    return NextResponse.json({ error: "Search not found." }, { status: 404 });
  }

  return NextResponse.json({ search: toSearchDetail(row) });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { userId, error: authError } = await requireSession();
  if (authError) return authError;

  const { id } = await context.params;
  const existing = await loadOwnedSearch(id, userId);
  if (!existing) {
    return NextResponse.json({ error: "Search not found." }, { status: 404 });
  }

  let body: TalentSearchWriteInput;
  try {
    body = (await request.json()) as TalentSearchWriteInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const data: {
    roleTitle?: string;
    jobDescription?: string;
    criteriaJson?: ReturnType<typeof toCriteriaJson>;
    queriesJson?: ReturnType<typeof toQueriesJson>;
    mode?: SearchMode;
    resultJson?: TalentSearchResult | typeof Prisma.JsonNull;
    worksReviewed?: number;
    uiStep?: TalentSearchUiStep | null;
  } = {};

  if (typeof body.roleTitle === "string" && body.roleTitle.trim()) {
    data.roleTitle = body.roleTitle.trim();
  }
  if (typeof body.jobDescription === "string") {
    data.jobDescription = body.jobDescription;
  }
  if ("criteria" in body || "extractedCriteria" in body) {
    data.criteriaJson = toCriteriaJson(
      body.criteria ?? null,
      body.extractedCriteria ?? null,
    );
  }
  if (
    Array.isArray(body.queries) ||
    Array.isArray(body.pubmedQueries) ||
    Array.isArray(body.sources)
  ) {
    data.queriesJson = toQueriesJson(
      body.queries,
      body.pubmedQueries,
      body.sources,
    );
  }
  if (body.mode === "live" || body.mode === "demo") {
    data.mode = body.mode;
  }
  if ("result" in body) {
    data.resultJson = body.result ?? Prisma.JsonNull;
    data.worksReviewed = worksReviewedFromResult(body.result ?? null);
  }
  if ("uiStep" in body) {
    data.uiStep = body.uiStep ?? null;
  }

  await db.talentSearch.update({
    where: { id: existing.id },
    data,
  });

  if (Array.isArray(body.shortlist)) {
    const next = [...new Set(body.shortlist.filter(Boolean))];
    await db.shortlistEntry.deleteMany({ where: { searchId: existing.id } });
    if (next.length > 0) {
      await db.shortlistEntry.createMany({
        data: next.map((authorId) => ({ searchId: existing.id, authorId })),
      });
    }
  }

  if (body.notes && typeof body.notes === "object") {
    await db.candidateNote.deleteMany({ where: { searchId: existing.id } });
    const entries = Object.entries(body.notes).filter(
      ([, text]) => typeof text === "string" && text.trim(),
    );
    if (entries.length > 0) {
      await db.candidateNote.createMany({
        data: entries.map(([authorId, text]) => ({
          searchId: existing.id,
          authorId,
          body: text.trim(),
        })),
      });
    }
  }

  const refreshed = await loadOwnedSearch(existing.id, userId);
  return NextResponse.json({ search: toSearchDetail(refreshed!) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { userId, error: authError } = await requireSession();
  if (authError) return authError;

  const { id } = await context.params;
  const existing = await db.talentSearch.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Search not found." }, { status: 404 });
  }

  await db.talentSearch.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
