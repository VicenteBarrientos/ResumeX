import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/require-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const { userId, error: authError } = await requireSession();
  if (authError) return authError;

  const { id } = await context.params;
  const search = await db.talentSearch.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!search) {
    return apiError("Search not found.", { status: 404 });
  }

  let body: { authorId?: string; shortlisted?: boolean };
  try {
    body = (await request.json()) as { authorId?: string; shortlisted?: boolean };
  } catch {
    return apiError("Invalid JSON body.", { status: 400 });
  }

  const authorId = body.authorId?.trim();
  if (!authorId) {
    return apiError("authorId is required.", { status: 400 });
  }

  const shortlisted = body.shortlisted !== false;

  if (shortlisted) {
    await db.shortlistEntry.upsert({
      where: {
        searchId_authorId: { searchId: search.id, authorId },
      },
      create: { searchId: search.id, authorId },
      update: {},
    });
  } else {
    await db.shortlistEntry.deleteMany({
      where: { searchId: search.id, authorId },
    });
  }

  const entries = await db.shortlistEntry.findMany({
    where: { searchId: search.id },
    select: { authorId: true },
  });

  return NextResponse.json({
    shortlist: entries.map((entry) => entry.authorId),
  });
}
