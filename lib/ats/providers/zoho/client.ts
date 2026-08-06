import "server-only";

import { atsFetch } from "@/lib/ats/http";
import {
  assertZohoApiDomain,
  escapeZohoCriteriaValue,
} from "@/lib/ats/providers/zoho/domains";
import { getValidZohoAccessToken } from "@/lib/ats/providers/zoho/oauth";
import { AtsAuthenticationError, isAtsError } from "@/lib/ats/errors";
import type { AtsProvider } from "@/lib/ats/types";

export { escapeZohoCriteriaValue };

const PROVIDER: AtsProvider = "zoho-recruit";

export async function zohoRequest<T>(input: {
  connectionId: string;
  apiDomain: string;
  path: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  retrySafe?: boolean;
}): Promise<T> {
  const apiDomain = assertZohoApiDomain(input.apiDomain);
  const accessToken = await getValidZohoAccessToken(input.connectionId);

  try {
    const result = await atsFetch<T>({
      provider: PROVIDER,
      baseUrl: apiDomain,
      path: input.path.startsWith("/") ? input.path : `/${input.path}`,
      method: input.method ?? "GET",
      body: input.body,
      query: input.query,
      retrySafe: input.retrySafe ?? (input.method === undefined || input.method === "GET"),
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    });
    return result.data;
  } catch (error) {
    if (isAtsError(error) && error.httpStatus === 401) {
      const { db } = await import("@/lib/db");
      const { decryptIntegrationCredential, encryptIntegrationCredential } = await import(
        "@/lib/ats/encryption"
      );
      const row = await db.atsConnection.findUnique({ where: { id: input.connectionId } });
      if (row?.encryptedCredentials) {
        const creds = decryptIntegrationCredential<{
          accessToken?: string;
          accessTokenExpiresAt?: string;
          refreshToken: string;
        }>(row.encryptedCredentials);
        await db.atsConnection.update({
          where: { id: input.connectionId },
          data: {
            encryptedCredentials: encryptIntegrationCredential({
              ...creds,
              accessTokenExpiresAt: new Date(0).toISOString(),
            }),
          },
        });
      }

      const fresh = await getValidZohoAccessToken(input.connectionId);
      const result = await atsFetch<T>({
        provider: PROVIDER,
        baseUrl: apiDomain,
        path: input.path.startsWith("/") ? input.path : `/${input.path}`,
        method: input.method ?? "GET",
        body: input.body,
        query: input.query,
        retrySafe: false,
        headers: {
          Authorization: `Zoho-oauthtoken ${fresh}`,
        },
      });
      return result.data;
    }
    if (isAtsError(error) && error.code === "authentication") {
      throw new AtsAuthenticationError(PROVIDER, error.message);
    }
    throw error;
  }
}
