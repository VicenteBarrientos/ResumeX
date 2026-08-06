import { requireSession } from "@/lib/require-auth";
import { createZohoOAuthState } from "@/lib/ats/providers/zoho/oauth";
import { atsErrorResponse } from "@/lib/ats/http-response";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const auth = await requireSession();
    if (auth.error) return auth.error;

    const url = new URL(req.url);
    const redirectTo = url.searchParams.get("redirectTo") || "/talent/integrations";

    const { authorizeUrl } = await createZohoOAuthState({
      userId: auth.userId,
      redirectTo,
    });

    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    return atsErrorResponse(error);
  }
}
