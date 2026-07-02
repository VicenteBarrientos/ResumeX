import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getUserIdFromBearer } from "@/lib/extension-auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

async function resolveUserId(req: Request): Promise<string | null> {
  const fromBearer = await getUserIdFromBearer(req);
  if (fromBearer) return fromBearer;
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function GET(req: Request) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const answers = await db.answer.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(answers);
}

export async function POST(req: Request) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { question, answer } = await req.json();
  if (!question?.trim() || !answer?.trim()) {
    return NextResponse.json({ error: "Question and answer are required" }, { status: 400 });
  }

  // Upsert — update existing answer if same question already saved
  const existing = await db.answer.findFirst({ where: { userId, question: question.trim() } });
  if (existing) {
    const updated = await db.answer.update({
      where: { id: existing.id },
      data: { answer: answer.trim() },
    });
    return NextResponse.json(updated);
  }

  const created = await db.answer.create({
    data: { userId, question: question.trim(), answer: answer.trim() },
  });
  return NextResponse.json(created, { status: 201 });
}
