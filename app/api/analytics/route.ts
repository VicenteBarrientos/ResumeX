import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Fire-and-forget product analytics. No cookies, no user ids — path + event only.
 */
export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      name?: string;
      path?: string;
      props?: Record<string, unknown>;
    };

    if (!payload?.name || typeof payload.name !== "string") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    console.info(
      "[analytics]",
      JSON.stringify({
        name: payload.name.slice(0, 80),
        path: typeof payload.path === "string" ? payload.path.slice(0, 200) : undefined,
        props: payload.props ?? {},
      }),
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
