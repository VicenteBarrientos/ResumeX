import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signExtensionToken } from "@/lib/extension-token";
import { consumeRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const ipLimit = consumeRateLimit(`ext-token:ip:${ip}`, 20, 60_000);
    if (!ipLimit.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(ipLimit.retryAfterSec) },
        },
      );
    }

    const body = await req.json();
    const email =
      typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required." },
        { status: 400 },
      );
    }

    const emailLimit = consumeRateLimit(`ext-token:email:${email}`, 5, 60_000);
    if (!emailLimit.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(emailLimit.retryAfterSec) },
        },
      );
    }

    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const token = await signExtensionToken(user.id);

    return NextResponse.json({ token, name: user.username });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
