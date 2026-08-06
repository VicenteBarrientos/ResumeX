import { NextResponse } from "next/server";
import { requireSession } from "@/lib/require-auth";
import { db } from "@/lib/db";
import { getProviderCapabilities } from "@/lib/ats/capabilities";
import { encryptIntegrationCredential } from "@/lib/ats/encryption";
import {
  consumeZohoOAuthState,
  exchangeZohoAuthorizationCode,
} from "@/lib/ats/providers/zoho/oauth";
import { createZohoAdapter } from "@/lib/ats/providers/zoho/adapter";

export async function GET(req: Request) {
  try {
    const auth = await requireSession();
    if (auth.error) return auth.error;

    const url = new URL(req.url);
    const error = url.searchParams.get("error");
    if (error) {
      const dest = new URL("/talent/integrations", url.origin);
      dest.searchParams.set("zoho", "denied");
      return NextResponse.redirect(dest);
    }

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const location = url.searchParams.get("location") || undefined;
    const accountsServer = url.searchParams.get("accounts-server") || undefined;

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/talent/integrations?zoho=missing_code", url.origin)
      );
    }

    const { redirectTo } = await consumeZohoOAuthState({
      nonce: state,
      userId: auth.userId,
    });

    const { credentials, metadata } = await exchangeZohoAuthorizationCode({
      code,
      accountsServer,
      location,
    });

    const row = await db.atsConnection.create({
      data: {
        userId: auth.userId,
        provider: "ZOHO_RECRUIT",
        mode: "LIVE",
        displayName: `Zoho Recruit (${metadata.dataCenter})`,
        status: "CONNECTED",
        encryptedCredentials: encryptIntegrationCredential(credentials),
        encryptionKeyVersion: Number(
          process.env.ATS_CREDENTIAL_ENCRYPTION_KEY_VERSION || "1"
        ),
        metadata,
        capabilities: getProviderCapabilities("zoho-recruit"),
        lastTestedAt: new Date(),
      },
    });

    try {
      const adapter = createZohoAdapter({
        connectionId: row.id,
        metadata,
      });
      await adapter.testConnection();
    } catch {
      await db.atsConnection.update({
        where: { id: row.id },
        data: {
          status: "PERMISSION_ERROR",
          lastErrorMessage: "Connected but connection test reported permission issues.",
        },
      });
    }

    const dest = new URL(redirectTo, url.origin);
    dest.searchParams.set("zoho", "connected");
    return NextResponse.redirect(dest);
  } catch (error) {
    const url = new URL(req.url);
    const dest = new URL("/talent/integrations", url.origin);
    dest.searchParams.set("zoho", "error");
    // Do not leak secrets in redirect.
    console.error("[ats/zoho/callback]", error instanceof Error ? error.name : "error");
    return NextResponse.redirect(dest);
  }
}
