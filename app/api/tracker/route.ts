import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { apiError } from "@/lib/api/response";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { getUserIdFromBearer } from "@/lib/extension-auth";

async function resolveUserId(req: Request): Promise<string | null> {
  const fromBearer = await getUserIdFromBearer(req);
  if (fromBearer) return fromBearer;
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function GET(req: Request) {
  const userId = await resolveUserId(req);
  if (!userId) return apiError("Unauthorized", { status: 401 });

  const applications = await db.application.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(applications);
}

export async function POST(req: Request) {
  const userId = await resolveUserId(req);
  if (!userId) return apiError("Unauthorized", { status: 401 });

  try {
    const { company, role, jobUrl, status, matchScore, notes } = await req.json();

    if (!company?.trim() || !role?.trim()) {
      return apiError("Company and role are required.", { status: 400 });
    }

    const app = await db.application.create({
      data: {
        userId,
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
    return apiError("Something went wrong.", { status: 500 });
  }
}
