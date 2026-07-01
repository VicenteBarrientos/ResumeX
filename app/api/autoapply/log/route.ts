import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// POST /api/autoapply/log
// Called by the Chrome extension after each successful application.
// If the user is logged in, also writes the application to the DB tracker.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { platform, company, role, jobUrl, jobDescription, answers } = body;

    if (!platform || !role) {
      return NextResponse.json({ error: "platform and role are required" }, { status: 400 });
    }

    const application = {
      id: `app_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      platform: platform ?? "unknown",
      company: company ?? "Unknown Company",
      role,
      jobUrl: jobUrl ?? "",
      jobDescription: jobDescription ?? "",
      appliedAt: new Date().toISOString(),
      status: "applied",
      answers: answers ?? {},
    };

    // Also write to DB tracker if the user is authenticated
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await db.application.create({
        data: {
          userId: session.user.id,
          company: company ?? "Unknown Company",
          role,
          jobUrl: jobUrl || null,
          status: "Applied",
          notes: jobDescription ? `Applied via ${platform}\n\n${jobDescription.slice(0, 500)}` : `Applied via ${platform}`,
        },
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, application }, { headers: CORS_HEADERS });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
