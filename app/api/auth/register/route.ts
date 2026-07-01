import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username?.trim() || !password) {
      return NextResponse.json({ error: "Username and password required." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { username: username.trim() } });
    if (existing) {
      return NextResponse.json({ error: "Username already taken." }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);
    const user = await db.user.create({
      data: { username: username.trim(), passwordHash },
    });

    return NextResponse.json({ id: user.id, username: user.username }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
