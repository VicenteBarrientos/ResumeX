import { NextResponse } from "next/server";
import { z } from "zod";
import type { AnalyticsEventName } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EVENT_NAMES = [
  "home_talent_cta_click",
  "talent_landing_mapper_cta",
  "talent_landing_assess_cta",
  "talent_search_saved",
] as const satisfies readonly AnalyticsEventName[];

const analyticsBodySchema = z.object({
  name: z.enum(EVENT_NAMES),
  path: z.string().max(200).optional(),
  props: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  ts: z.number().optional(),
});

/**
 * Fire-and-forget product analytics. Accepts only known event names; caps payload size.
 */
export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const parsed = analyticsBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const propsJson = JSON.stringify(parsed.data.props ?? {});
    if (propsJson.length > 2_000) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    console.info(
      "[analytics]",
      JSON.stringify({
        name: parsed.data.name,
        path: parsed.data.path,
        props: parsed.data.props ?? {},
      }),
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
