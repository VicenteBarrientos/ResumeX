import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/require-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; authorId: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const { userId, error: authError } = await requireSession();
  if (authError) return authError;

  const { id, authorId: rawAuthorId } = await context.params;
  const authorId = decodeURIComponent(rawAuthorId).trim();
  if (!authorId) {
    return NextResponse.json({ error: "authorId is required." }, { status: 400 });
  }

  const search = await db.talentSearch.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!search) {
    return NextResponse.json({ error: "Search not found." }, { status: 404 });
  }

  let body: { body?: string };
  try {
    body = (await request.json()) as { body?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = typeof body.body === "string" ? body.body.trim() : "";

  if (!text) {
    await db.candidateNote.deleteMany({
      where: { searchId: search.id, authorId },
    });
    return NextResponse.json({ authorId, body: "" });
  }

  const note = await db.candidateNote.upsert({
    where: {
      searchId_authorId: { searchId: search.id, authorId },
    },
    create: { searchId: search.id, authorId, body: text },
    update: { body: text },
  });

  return NextResponse.json({ authorId: note.authorId, body: note.body });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { userId, error: authError } = await requireSession();
  if (authError) return authError;

  const { id, authorId: rawAuthorId } = await context.params;
  const authorId = decodeURIComponent(rawAuthorId).trim();

  const search = await db.talentSearch.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!search) {
    return NextResponse.json({ error: "Search not found." }, { status: 404 });
  }

  await db.candidateNote.deleteMany({
    where: { searchId: search.id, authorId },
  });

  return NextResponse.json({ ok: true });
}
