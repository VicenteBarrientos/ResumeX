import "server-only";

import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import {
  assertZohoAccountsServer,
  assertZohoApiDomain,
  zohoAccountsServerForLocation,
  zohoApiDomainForLocation,
  zohoScopeString,
} from "@/lib/ats/providers/zoho/domains";
import { AtsAuthenticationError, AtsConfigurationError } from "@/lib/ats/errors";
import { encryptIntegrationCredential } from "@/lib/ats/encryption";
import type { ZohoCredentials, ZohoMetadata } from "@/lib/ats/types";

const STATE_TTL_MS = 10 * 60 * 1000;

export function getZohoOAuthConfig() {
  const clientId = process.env.ZOHO_RECRUIT_CLIENT_ID;
  const clientSecret = process.env.ZOHO_RECRUIT_CLIENT_SECRET;
  const redirectUri = process.env.ZOHO_RECRUIT_REDIRECT_URI;
  const defaultAccounts =
    process.env.ZOHO_RECRUIT_DEFAULT_ACCOUNTS_URL || "https://accounts.zoho.com";

  if (!clientId || !clientSecret || !redirectUri) {
    throw new AtsConfigurationError(
      "zoho-recruit",
      "Zoho OAuth is not configured. Set ZOHO_RECRUIT_CLIENT_ID, ZOHO_RECRUIT_CLIENT_SECRET, and ZOHO_RECRUIT_REDIRECT_URI."
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    defaultAccounts: assertZohoAccountsServer(defaultAccounts),
  };
}

export async function createZohoOAuthState(input: {
  userId: string;
  redirectTo?: string;
}): Promise<{ nonce: string; authorizeUrl: string }> {
  const config = getZohoOAuthConfig();
  const nonce = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + STATE_TTL_MS);

  await db.atsOauthState.create({
    data: {
      userId: input.userId,
      provider: "ZOHO_RECRUIT",
      nonce,
      redirectTo: input.redirectTo || "/talent/integrations",
      expiresAt,
    },
  });

  const url = new URL(`${config.defaultAccounts}/oauth/v2/auth`);
  url.searchParams.set("scope", zohoScopeString());
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", nonce);

  return { nonce, authorizeUrl: url.toString() };
}

export async function consumeZohoOAuthState(input: {
  nonce: string;
  userId: string;
}): Promise<{ redirectTo: string }> {
  const row = await db.atsOauthState.findFirst({
    where: {
      nonce: input.nonce,
      provider: "ZOHO_RECRUIT",
      userId: input.userId,
    },
  });

  if (!row) {
    throw new AtsAuthenticationError("zoho-recruit", "Invalid OAuth state.");
  }
  if (row.consumedAt) {
    throw new AtsAuthenticationError("zoho-recruit", "OAuth state was already used.");
  }
  if (row.expiresAt.getTime() < Date.now()) {
    throw new AtsAuthenticationError("zoho-recruit", "OAuth state expired.");
  }

  await db.atsOauthState.update({
    where: { id: row.id },
    data: { consumedAt: new Date() },
  });

  return { redirectTo: row.redirectTo || "/talent/integrations" };
}

export type ZohoTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  api_domain?: string;
  token_type?: string;
};

export async function exchangeZohoAuthorizationCode(input: {
  code: string;
  accountsServer?: string;
  location?: string;
}): Promise<{ credentials: ZohoCredentials; metadata: ZohoMetadata }> {
  const config = getZohoOAuthConfig();
  const accounts = assertZohoAccountsServer(
    input.accountsServer ||
      zohoAccountsServerForLocation(input.location) ||
      config.defaultAccounts
  );

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    code: input.code,
  });

  const response = await fetch(`${accounts}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new AtsAuthenticationError(
      "zoho-recruit",
      "Failed to exchange Zoho authorization code."
    );
  }

  const data = (await response.json()) as ZohoTokenResponse & { error?: string };
  if (data.error || !data.access_token) {
    throw new AtsAuthenticationError(
      "zoho-recruit",
      "Zoho authorization code exchange failed."
    );
  }

  const apiDomain = assertZohoApiDomain(
    data.api_domain || zohoApiDomainForLocation(input.location)
  );

  if (!data.refresh_token) {
    throw new AtsAuthenticationError(
      "zoho-recruit",
      "Zoho did not return a refresh token. Reconnect with prompt=consent."
    );
  }

  const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();

  return {
    credentials: {
      accessToken: data.access_token,
      accessTokenExpiresAt: expiresAt,
      refreshToken: data.refresh_token,
    },
    metadata: {
      accountsServer: accounts,
      apiDomain,
      dataCenter: (input.location || "us").toLowerCase(),
      scope: zohoScopeString().split(","),
    },
  };
}

/** In-process refresh locks keyed by connection id. */
const refreshLocks = new Map<string, Promise<string>>();

export async function getValidZohoAccessToken(connectionId: string): Promise<string> {
  const existing = refreshLocks.get(connectionId);
  if (existing) return existing;

  const task = (async () => {
    const { decryptIntegrationCredential } = await import("@/lib/ats/encryption");
    const row = await db.atsConnection.findUnique({ where: { id: connectionId } });
    if (!row?.encryptedCredentials) {
      throw new AtsConfigurationError("zoho-recruit", "Zoho connection has no credentials.");
    }

    let credentials = decryptIntegrationCredential<ZohoCredentials>(
      row.encryptedCredentials
    );
    const metadata = (row.metadata || {}) as ZohoMetadata;

    const expiresAt = credentials.accessTokenExpiresAt
      ? Date.parse(credentials.accessTokenExpiresAt)
      : 0;
    const bufferMs = 60_000;
    if (credentials.accessToken && expiresAt - bufferMs > Date.now()) {
      return credentials.accessToken;
    }

    const accounts = assertZohoAccountsServer(
      metadata.accountsServer ||
        process.env.ZOHO_RECRUIT_DEFAULT_ACCOUNTS_URL ||
        "https://accounts.zoho.com"
    );
    const config = getZohoOAuthConfig();

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: credentials.refreshToken,
    });

    const response = await fetch(`${accounts}/oauth/v2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok) {
      await db.atsConnection.update({
        where: { id: connectionId },
        data: {
          status: "NEEDS_REAUTHENTICATION",
          lastErrorCode: "authentication",
          lastErrorMessage: "Zoho refresh token is invalid. Reconnect the account.",
        },
      });
      throw new AtsAuthenticationError(
        "zoho-recruit",
        "Zoho refresh token is invalid. Reconnect the account."
      );
    }

    const data = (await response.json()) as ZohoTokenResponse & { error?: string };
    if (data.error || !data.access_token) {
      await db.atsConnection.update({
        where: { id: connectionId },
        data: {
          status: "NEEDS_REAUTHENTICATION",
          lastErrorCode: "authentication",
          lastErrorMessage: "Zoho token refresh failed.",
        },
      });
      throw new AtsAuthenticationError("zoho-recruit", "Zoho token refresh failed.");
    }

    credentials = {
      ...credentials,
      accessToken: data.access_token,
      accessTokenExpiresAt: new Date(
        Date.now() + (data.expires_in || 3600) * 1000
      ).toISOString(),
    };

    await db.atsConnection.update({
      where: { id: connectionId },
      data: {
        encryptedCredentials: encryptIntegrationCredential(credentials),
        status: "CONNECTED",
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    });

    return credentials.accessToken!;
  })();

  refreshLocks.set(connectionId, task);
  try {
    return await task;
  } finally {
    refreshLocks.delete(connectionId);
  }
}

/** Exported for unit tests of state validation without DB when needed. */
export function isOauthStateExpired(expiresAt: Date, now = Date.now()): boolean {
  return expiresAt.getTime() < now;
}
