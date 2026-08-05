import { NextResponse } from "next/server";
import { isOpenAlexConfigured } from "@/lib/talent-mapper/openalex";
import { isOpenAiApiKeyConfigured } from "@/lib/env";
import { requireSession } from "@/lib/require-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight config probe for the Talent Mapper UI (no secrets returned). */
export async function GET() {
  const { error: authError } = await requireSession();
  if (authError) return authError;

  return NextResponse.json({
    openAlexConfigured: isOpenAlexConfigured(),
    openAiConfigured: isOpenAiApiKeyConfigured(),
    defaultMode: isOpenAlexConfigured() ? "live" : "demo",
  });
}
