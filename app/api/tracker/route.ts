import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const applications = await db.application.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(applications);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { company, role, jobUrl, status, matchScore, notes } = await request.json();

    if (!company?.trim() || !role?.trim()) {
      return NextResponse.json({ error: "Company and role are required." }, { status: 400 });
    }

    const app = await db.application.create({
      data: {
        userId: session.user.id,
        company: company.trim(),
        role: role.trim(),
        jobUrl: jobUrl?.trim() || null,
        status: status || "Applied",
        matchScore: matchScore != null ? Number(matchScore) : null,
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json(app, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
