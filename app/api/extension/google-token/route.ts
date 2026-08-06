import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { apiError } from "@/lib/api/response";
import { authOptions } from "@/lib/auth-options";
import { signExtensionToken } from "@/lib/extension-token";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return apiError("Not authenticated.", { status: 401 });
  }

  const token = await signExtensionToken(session.user.id);

  return NextResponse.json({ token, name: session.user.name });
}
