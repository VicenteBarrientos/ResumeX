import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const app = await db.application.findFirst({ where: { id, userId: session.user.id } });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(app);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.application.findFirst({ where: { id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { company, role, jobUrl, status, matchScore, notes } = await request.json();

  const updated = await db.application.update({
    where: { id },
    data: {
      company: company?.trim() || existing.company,
      role: role?.trim() || existing.role,
      jobUrl: jobUrl?.trim() || null,
      status: status || existing.status,
      matchScore: matchScore != null ? Number(matchScore) : null,
      notes: notes?.trim() || null,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.application.findFirst({ where: { id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.application.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
