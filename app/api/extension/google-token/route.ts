import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { SignJWT } from "jose";

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "");

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const token = await new SignJWT({ sub: session.user.id, type: "extension" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("90d")
    .sign(SECRET);

  return NextResponse.json({ token, name: session.user.name });
}
