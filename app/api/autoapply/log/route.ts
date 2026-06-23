import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// POST /api/autoapply/log
// Called by the Chrome extension after each successful application
// Since we use localStorage on the client, this endpoint just validates
// and echoes back — the extension stores data in ResumeX via window.postMessage
// when the user has the dashboard open, or localStorage sync on next visit.
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

    return NextResponse.json({ ok: true, application });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
