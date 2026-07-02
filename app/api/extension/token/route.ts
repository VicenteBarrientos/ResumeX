import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "");

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    // Issue a long-lived JWT (90 days) for the extension
    const token = await new SignJWT({ sub: user.id, type: "extension" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("90d")
      .sign(SECRET);

    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
