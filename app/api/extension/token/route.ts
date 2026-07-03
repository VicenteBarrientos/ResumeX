import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signExtensionToken } from "@/lib/extension-token";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required." }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const token = await signExtensionToken(user.id);

    return NextResponse.json({ token, name: user.username });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
