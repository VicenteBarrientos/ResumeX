import { NextResponse } from "next/server";
import { isOpenAlexConfigured } from "@/lib/talent-mapper/openalex";
import {
  getPubmedConfig,
  isPubmedConfigured,
  isPubmedEnabled,
} from "@/lib/talent-mapper/providers/pubmed";
import { isOpenAiApiKeyConfigured } from "@/lib/env";
import { requireSession } from "@/lib/require-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight config probe for the Talent Mapper UI (no secrets returned). */
export async function GET() {
  const { error: authError } = await requireSession();
  if (authError) return authError;

  const pubmedCfg = getPubmedConfig();
  const pubmedConfigured = isPubmedConfigured();
  const pubmedEnabled = isPubmedEnabled();

  let pubmedStatus:
    | "connected"
    | "available_without_key"
    | "not_configured"
    | "disabled" = "not_configured";

  if (!pubmedEnabled) {
    pubmedStatus = "disabled";
  } else if (pubmedConfigured && pubmedCfg.apiKey) {
    pubmedStatus = "connected";
  } else if (pubmedConfigured) {
    pubmedStatus = "available_without_key";
  }

  return NextResponse.json({
    openAlexConfigured: isOpenAlexConfigured(),
    pubmedConfigured,
    pubmedEnabled,
    pubmedStatus,
    openAiConfigured: isOpenAiApiKeyConfigured(),
    defaultMode:
      isOpenAlexConfigured() || pubmedConfigured ? "live" : "demo",
    defaultSources: ["openalex", "pubmed"],
  });
}
