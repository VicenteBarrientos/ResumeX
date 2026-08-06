import { requireSession } from "@/lib/require-auth";
import { db } from "@/lib/db";
import { getProviderCapabilities } from "@/lib/ats/capabilities";
import { encryptIntegrationCredential } from "@/lib/ats/encryption";
import { apiError } from "@/lib/api/response";
import { atsErrorResponse, atsJson } from "@/lib/ats/http-response";
import { atsCacheInvalidate } from "@/lib/ats/cache";
import { createRecruiteeAdapter } from "@/lib/ats/providers/recruitee/adapter";
import { recruiteeConnectSchema } from "@/lib/ats/schemas";
import { connectionToSummary } from "@/lib/ats/mapping";

export async function POST(req: Request) {
  try {
    const auth = await requireSession();
    if (auth.error) return auth.error;

    const body = await req.json();
    const parsed = recruiteeConnectSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid connection payload.", { status: 400, details: parsed.error.flatten() });
    }

    const { displayName, companyIdOrSubdomain, token, webhookSecret } = parsed.data;

    const adapter = createRecruiteeAdapter({
      credentials: { token, webhookSecret },
      metadata: { companyIdOrSubdomain },
    });
    const test = await adapter.testConnection();

    const row = await db.atsConnection.create({
      data: {
        userId: auth.userId,
        provider: "RECRUITEE",
        mode: "LIVE",
        displayName,
        status: test.ok ? "CONNECTED" : "CONFIGURATION_ERROR",
        encryptedCredentials: encryptIntegrationCredential({
          token,
          webhookSecret,
        }),
        encryptionKeyVersion: Number(
          process.env.ATS_CREDENTIAL_ENCRYPTION_KEY_VERSION || "1"
        ),
        metadata: { companyIdOrSubdomain },
        capabilities: getProviderCapabilities("recruitee"),
        lastTestedAt: new Date(),
        lastErrorMessage: test.warnings.join("; ") || null,
      },
    });

    atsCacheInvalidate(`jobs:${row.id}`);

    return atsJson({
      connection: connectionToSummary({
        id: row.id,
        provider: "RECRUITEE",
        mode: "LIVE",
        displayName: row.displayName,
        status: row.status,
        capabilities: row.capabilities,
        lastTestedAt: row.lastTestedAt,
        lastSuccessfulSyncAt: row.lastSuccessfulSyncAt,
        lastErrorMessage: row.lastErrorMessage,
        metadata: row.metadata,
      }),
      test,
      tokenHint: `••••${token.slice(-4)}`,
    });
  } catch (error) {
    return atsErrorResponse(error);
  }
}
