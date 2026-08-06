import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
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
      return apiError("Too many attempts. Try again shortly.", {
        status: 429,
        retryAfterSec: ipLimit.retryAfterSec,
      });
    }

    const body = await req.json();
    const email =
      typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email || !password) {
      return apiError("Email and password required.", { status: 400 });
    }

    const emailLimit = consumeRateLimit(`ext-token:email:${email}`, 5, 60_000);
    if (!emailLimit.ok) {
      return apiError("Too many attempts. Try again shortly.", {
        status: 429,
        retryAfterSec: emailLimit.retryAfterSec,
      });
    }

    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      return apiError("Invalid email or password.", { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return apiError("Invalid email or password.", { status: 401 });
    }

    const token = await signExtensionToken(user.id);

    return NextResponse.json({ token, name: user.username });
  } catch {
    return apiError("Server error.", { status: 500 });
  }
}
