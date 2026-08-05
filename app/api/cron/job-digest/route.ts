import { NextResponse } from "next/server";
import { Resend } from "resend";
import { RESUMEX_URL } from "@/lib/constants";
import { db } from "@/lib/db";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function GET(req: Request) {
  // Vercel cron passes the Authorization header. Fail closed when unset —
  // otherwise the expected value becomes the literal "Bearer undefined".
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "Cron is not configured." },
      { status: 500 },
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!resend) return NextResponse.json({ skipped: "No Resend key" });

  // Get all users who have an email and a profile with job search keywords
  const profiles = await db.profile.findMany({
    where: { email: { not: null } },
    include: { user: true },
  });

  let sent = 0;
  for (const profile of profiles) {
    if (!profile.email) continue;

    // Extract a search query from their profile
    const query = profile.fullName
      ? `jobs for ${profile.location ?? "remote"}`
      : "software engineer";

    // Fetch a few jobs
    let jobs: Array<{ title: string; company: string; location: string; url: string }> = [];
    try {
      const appId = process.env.ADZUNA_APP_ID;
      const appKey = process.env.ADZUNA_APP_KEY;
      if (appId && appKey) {
        const res = await fetch(
          `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=5&what=${encodeURIComponent(query)}&content-type=application/json`
        );
        if (res.ok) {
          const data = await res.json();
          jobs = (data.results ?? []).slice(0, 5).map((j: Record<string, unknown>) => ({
            title: j.title,
            company: (j.company as Record<string, string>)?.display_name,
            location: (j.location as Record<string, string>)?.display_name,
            url: j.redirect_url,
          }));
        }
      }
    } catch { /* skip */ }

    if (jobs.length === 0) continue;

    const jobRows = jobs
      .map(
        (j) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0">
            <a href="${j.url}" style="font-weight:600;color:#1d3559;text-decoration:none">${j.title}</a><br/>
            <span style="color:#6b7280;font-size:13px">${j.company} · ${j.location}</span>
          </td>
        </tr>`
      )
      .join("");

    await resend.emails.send({
      from: "ResumeX <onboarding@resend.dev>",
      to: profile.email,
      subject: `Your weekly job digest — ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#18181b">
          <h2 style="margin:0 0 4px;font-size:20px">Hi ${profile.fullName ?? profile.user.username} 👋</h2>
          <p style="color:#6b7280;margin:0 0 24px">Here are this week's top job picks for you:</p>
          <table style="width:100%;border-collapse:collapse">${jobRows}</table>
          <a href="${RESUMEX_URL}/career/jobs" style="display:inline-block;margin-top:24px;background:#1d3559;color:#fff;padding:12px 24px;border-radius:9999px;text-decoration:none;font-weight:600">
            See all jobs →
          </a>
          <p style="color:#a1a1aa;font-size:12px;margin:32px 0 0">
            ResumeX · <a href="${RESUMEX_URL}" style="color:#a1a1aa">${RESUMEX_URL.replace(/^https?:\/\//, "")}</a>
          </p>
        </div>
      `,
    }).catch(() => null);

    sent++;
  }

  return NextResponse.json({ sent });
}
