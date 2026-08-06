import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/require-auth";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// POST /api/autoapply/log
// Called by the Chrome extension after each successful application.
// Requires session or extension Bearer token; writes to DB tracker when possible.
export async function POST(req: NextRequest) {
  try {
    const { userId, error: authError } = await requireUserId(req);
    if (authError) {
      return apiError("Unauthorized", { status: 401, headers: CORS_HEADERS });
    }

    const body = await req.json();
    const { platform, company, role, jobUrl, jobDescription, answers } = body;

    if (!platform || !role) {
      return apiError("platform and role are required", {
        status: 400,
        headers: CORS_HEADERS,
      });
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

    await db.application.create({
      data: {
        userId,
        company: company ?? "Unknown Company",
        role,
        jobUrl: jobUrl || null,
        status: "Applied",
        notes: jobDescription
          ? `Applied via ${platform}\n\n${jobDescription.slice(0, 500)}`
          : `Applied via ${platform}`,
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true, application }, { headers: CORS_HEADERS });
  } catch {
    return apiError("Invalid request body", { status: 400, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
