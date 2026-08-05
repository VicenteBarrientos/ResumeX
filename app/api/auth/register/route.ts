import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { Resend } from "resend";
import { RESUMEX_URL } from "@/lib/constants";
import { db } from "@/lib/db";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: Request) {
  try {
    const { username, password, email } = await request.json();

    if (!username?.trim() || !password) {
      return NextResponse.json({ error: "Username and password required." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { username: username.trim() } });
    if (existing) {
      return NextResponse.json({ error: "Username already taken." }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);
    const user = await db.user.create({
      data: { username: username.trim(), passwordHash, email: email?.trim() || null },
    });

    if (resend && email?.trim()) {
      await resend.emails.send({
        from: "ResumeX <onboarding@resend.dev>",
        to: email.trim(),
        subject: "Welcome to ResumeX!",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#18181b">
            <h1 style="font-size:24px;font-weight:700;margin:0 0 8px">Welcome to ResumeX, ${username}!</h1>
            <p style="color:#52525b;margin:0 0 24px">Your account is ready. Here's what you can do:</p>
            <ul style="color:#52525b;padding-left:20px;margin:0 0 24px">
              <li>Upload your resume and save your profile once</li>
              <li>Analyze job fit with AI match scores</li>
              <li>Generate tailored cover letters in seconds</li>
              <li>Track every application in one dashboard</li>
            </ul>
            <a href="${RESUMEX_URL}/career/tracker" style="display:inline-block;background:#1d3559;color:#fff;padding:12px 24px;border-radius:9999px;text-decoration:none;font-weight:600">Go to my dashboard →</a>
            <p style="color:#a1a1aa;font-size:12px;margin:32px 0 0">ResumeX — AI-Powered Job Search Platform</p>
          </div>
        `,
      }).catch(() => null);
    }

    return NextResponse.json({ id: user.id, username: user.username }, { status: 201 });
  } catch (error) {
    console.error("[register] failed", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
