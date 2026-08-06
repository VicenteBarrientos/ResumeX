import "server-only";

import type { AtsAdapter } from "@/lib/ats/adapter";
import { decryptIntegrationCredential } from "@/lib/ats/encryption";
import { AtsConfigurationError } from "@/lib/ats/errors";
import { requireOwnedAtsConnection } from "@/lib/ats/ownership";
import { createAshbyAdapter } from "@/lib/ats/providers/ashby/adapter";
import { createDemoAshbyAdapter } from "@/lib/ats/providers/ashby/demo-adapter";
import { createRecruiteeAdapter } from "@/lib/ats/providers/recruitee/adapter";
import { createZohoAdapter } from "@/lib/ats/providers/zoho/adapter";
import type {
  AshbyCredentials,
  AshbyMetadata,
  RecruiteeCredentials,
  RecruiteeMetadata,
  ZohoMetadata,
} from "@/lib/ats/types";

/**
 * Resolve a provider adapter for an owned connection.
 * No frontend component should instantiate provider clients directly.
 */
export async function getAtsAdapter(
  connectionId: string,
  userId: string
): Promise<AtsAdapter> {
  const connection = await requireOwnedAtsConnection(userId, connectionId);

  if (connection.provider === "ashby" && connection.mode === "demo") {
    return createDemoAshbyAdapter();
  }

  if (!connection.encryptedCredentials && connection.mode !== "demo") {
    throw new AtsConfigurationError(
      connection.provider,
      "ATS connection has no credentials. Reconnect the account."
    );
  }

  switch (connection.provider) {
    case "recruitee": {
      const credentials = decryptIntegrationCredential<RecruiteeCredentials>(
        connection.encryptedCredentials!
      );
      const metadata = (connection.metadata || {}) as RecruiteeMetadata;
      return createRecruiteeAdapter({ credentials, metadata });
    }
    case "zoho-recruit": {
      const metadata = (connection.metadata || {}) as ZohoMetadata;
      if (!metadata.apiDomain) {
        throw new AtsConfigurationError(
          "zoho-recruit",
          "Zoho API domain missing. Reconnect the account."
        );
      }
      return createZohoAdapter({ connectionId: connection.id, metadata });
    }
    case "ashby": {
      const credentials = decryptIntegrationCredential<AshbyCredentials>(
        connection.encryptedCredentials!
      );
      const metadata = (connection.metadata || {}) as AshbyMetadata;
      return createAshbyAdapter({ credentials, metadata });
    }
    default:
      throw new AtsConfigurationError(
        "ashby",
        `Unsupported ATS provider.`
      );
  }
}

/** Demo adapter without DB — for contract tests. */
export function getDemoAshbyAdapter(): AtsAdapter {
  return createDemoAshbyAdapter();
}
