import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.profile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return NextResponse.json({});

  return NextResponse.json({
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    linkedinUrl: profile.linkedinUrl,
    resumeText: profile.resumeText,
    profileJson: profile.profileJson ? JSON.parse(profile.profileJson) : null,
  });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { fullName, email, phone, location, linkedinUrl, resumeText, profileJson } = body;

  const profile = await db.profile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      fullName,
      email,
      phone,
      location,
      linkedinUrl,
      resumeText,
      profileJson: profileJson ? JSON.stringify(profileJson) : null,
    },
    update: {
      fullName,
      email,
      phone,
      location,
      linkedinUrl,
      resumeText,
      profileJson: profileJson ? JSON.stringify(profileJson) : null,
    },
  });

  return NextResponse.json({ success: true, id: profile.id });
}
