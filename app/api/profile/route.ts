import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.profile.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json(profile ?? {});
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { fullName, email, phone, location, linkedinUrl, resumeText } = body;

  const profile = await db.profile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, fullName, email, phone, location, linkedinUrl, resumeText },
    update: { fullName, email, phone, location, linkedinUrl, resumeText },
  });

  return NextResponse.json(profile);
}
