import { NextResponse } from "next/server";
import { assertAiQuota, recordUsage } from "@/lib/entitlements";
import { quotaDenialResponse } from "@/lib/quota";
import { generateOutreach } from "@/lib/talent-mapper/ai";
import { outreachRequestSchema } from "@/lib/talent-mapper/schemas";
import { requireSession } from "@/lib/require-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const { userId, error: authError } = await requireSession();
  if (authError) return authError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON body.",
        action: "Retry drafting outreach from the researcher panel.",
      },
      { status: 400 },
    );
  }

  const parsed = outreachRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid outreach request.",
        action: "Open a researcher and try Draft personalized outreach again.",
      },
      { status: 400 },
    );
  }

  const denial = await assertAiQuota(userId, "outreach");
  if (denial) return quotaDenialResponse(denial);

  try {
    const result = await generateOutreach({
      candidate: {
        name: parsed.data.candidate.name,
        authorId: parsed.data.candidate.authorId,
        likelyInstitution: parsed.data.candidate.likelyInstitution,
        evidenceSummary: parsed.data.candidate.evidenceSummary ?? "",
        outreachAngle: parsed.data.candidate.outreachAngle ?? "",
        matchedRequiredCriteria:
          parsed.data.candidate.matchedRequiredCriteria ?? [],
        relevantWorks: (parsed.data.candidate.relevantWorks ?? []).map((w) => ({
          id: "outreach",
          title: w.title,
          year: w.year,
          matchedCriteria: [],
        })),
      },
      roleTitle: parsed.data.roleTitle,
      tone: parsed.data.tone,
    });
    await recordUsage(userId, "outreach");
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        error: "Outreach generation failed.",
        action:
          "You can still copy a manual note. Check OPENAI_API_KEY or try again in a moment.",
      },
      { status: 502 },
    );
  }
}
