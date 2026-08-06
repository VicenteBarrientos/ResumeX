import { getServerSession } from "next-auth";
import type { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import { authOptions } from "@/lib/auth-options";
import { getUserIdFromBearer } from "@/lib/extension-auth";

/**
 * Require a NextAuth session (web app).
 */
export async function requireSession(): Promise<
  { userId: string; error: null } | { userId: null; error: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      userId: null,
      error: apiError("Unauthorized", { status: 401 }),
    };
  }
  return { userId: session.user.id, error: null };
}

/**
 * Require session cookie or extension Bearer token.
 */
export async function requireUserId(req: Request): Promise<
  { userId: string; error: null } | { userId: null; error: NextResponse }
> {
  const fromBearer = await getUserIdFromBearer(req);
  if (fromBearer) return { userId: fromBearer, error: null };

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      userId: null,
      error: apiError("Unauthorized", { status: 401 }),
    };
  }
  return { userId: session.user.id, error: null };
}
