import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { getUserIdFromBearer } from "@/lib/extension-auth";

async function resolveUserId(req: Request): Promise<string | null> {
  const fromBearer = await getUserIdFromBearer(req);
  if (fromBearer) return fromBearer;
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

/**
 * `profileJson` is JSON inside a `String` column, so a malformed value is a
 * real possibility rather than a type error. Returning null degrades the
 * AutoApply structured profile to empty — which the client already handles —
 * instead of failing the whole profile fetch with a 500.
 */
function parseProfileJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    console.error("[ResumeX] Malformed Profile.profileJson; returning null.");
    return null;
  }
}

export async function GET(req: Request) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile) return NextResponse.json({});

  return NextResponse.json({
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    linkedinUrl: profile.linkedinUrl,
    resumeText: profile.resumeText,
    resumePdfUrl: profile.resumePdfUrl,
    profileJson: parseProfileJson(profile.profileJson),
  });
}

export async function PUT(req: Request) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const fullName = body.fullName as string | undefined;
  const email = body.email as string | undefined;
  const phone = body.phone as string | undefined;
  const location = body.location as string | undefined;
  const linkedinUrl = body.linkedinUrl as string | undefined;
  const resumeText = body.resumeText as string | undefined;
  const hasProfileJson = Object.prototype.hasOwnProperty.call(body, "profileJson");
  const profileJson = hasProfileJson ? body.profileJson : undefined;
  const profileJsonValue =
    profileJson == null || profileJson === ""
      ? null
      : typeof profileJson === "string"
        ? profileJson
        : JSON.stringify(profileJson);

  const profile = await db.profile.upsert({
    where: { userId },
    create: {
      userId,
      fullName,
      email,
      phone,
      location,
      linkedinUrl,
      resumeText,
      profileJson: hasProfileJson ? profileJsonValue : null,
    },
    update: {
      fullName,
      email,
      phone,
      location,
      linkedinUrl,
      resumeText,
      // Only touch profileJson when the client sent the key — otherwise a
      // tracker/onboarding save would wipe the AutoApply structured profile.
      ...(hasProfileJson ? { profileJson: profileJsonValue } : {}),
    },
  });

  return NextResponse.json({ success: true, id: profile.id });
}
