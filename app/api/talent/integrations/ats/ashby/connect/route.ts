import { requireSession } from "@/lib/require-auth";
import { db } from "@/lib/db";
import { getProviderCapabilities } from "@/lib/ats/capabilities";
import { encryptIntegrationCredential } from "@/lib/ats/encryption";
import { atsErrorResponse, atsJson } from "@/lib/ats/http-response";
import { createAshbyAdapter } from "@/lib/ats/providers/ashby/adapter";
import { createDemoAshbyAdapter } from "@/lib/ats/providers/ashby/demo-adapter";
import { ashbyConnectSchema, ashbyDemoConnectSchema } from "@/lib/ats/schemas";
import { connectionToSummary } from "@/lib/ats/mapping";

export async function POST(req: Request) {
  try {
    const auth = await requireSession();
    if (auth.error) return auth.error;

    const body = await req.json();

    if (body?.demo === true) {
      const parsed = ashbyDemoConnectSchema.safeParse(body);
      if (!parsed.success) {
        return atsJson({ error: { message: "Invalid demo payload." } }, 400);
      }

      const adapter = createDemoAshbyAdapter();
      const test = await adapter.testConnection();

      const row = await db.atsConnection.create({
        data: {
          userId: auth.userId,
          provider: "ASHBY",
          mode: "DEMO",
          displayName: parsed.data.displayName,
          status: "CONNECTED",
          encryptedCredentials: null,
          metadata: { demo: true },
          capabilities: adapter.getCapabilities(),
          lastTestedAt: new Date(),
          lastErrorMessage: "Ashby Demo Mode — No external ATS data was modified.",
        },
      });

      return atsJson({
        connection: connectionToSummary({
          id: row.id,
          provider: "ASHBY",
          mode: "DEMO",
          displayName: row.displayName,
          status: row.status,
          capabilities: row.capabilities,
          lastTestedAt: row.lastTestedAt,
          lastSuccessfulSyncAt: row.lastSuccessfulSyncAt,
          lastErrorMessage: row.lastErrorMessage,
          metadata: row.metadata,
        }),
        test,
      });
    }

    const parsed = ashbyConnectSchema.safeParse(body);
    if (!parsed.success) {
      return atsJson({ error: { message: "Invalid connection payload.", details: parsed.error.flatten() } }, 400);
    }

    const { displayName, apiKey, sourceId, actingUserId, mode } = parsed.data;
    const adapter = createAshbyAdapter({
      credentials: { apiKey },
      metadata: { sourceId, actingUserId },
    });
    const test = await adapter.testConnection();

    const row = await db.atsConnection.create({
      data: {
        userId: auth.userId,
        provider: "ASHBY",
        mode: mode === "sandbox" ? "SANDBOX" : "LIVE",
        displayName,
        status: test.ok ? "CONNECTED" : "PERMISSION_ERROR",
        encryptedCredentials: encryptIntegrationCredential({ apiKey }),
        encryptionKeyVersion: Number(
          process.env.ATS_CREDENTIAL_ENCRYPTION_KEY_VERSION || "1"
        ),
        metadata: { sourceId, actingUserId },
        capabilities: getProviderCapabilities("ashby"),
        lastTestedAt: new Date(),
        lastErrorMessage: test.warnings.join("; ") || null,
      },
    });

    return atsJson({
      connection: connectionToSummary({
        id: row.id,
        provider: "ASHBY",
        mode: row.mode as "LIVE" | "SANDBOX" | "DEMO",
        displayName: row.displayName,
        status: row.status,
        capabilities: row.capabilities,
        lastTestedAt: row.lastTestedAt,
        lastSuccessfulSyncAt: row.lastSuccessfulSyncAt,
        lastErrorMessage: row.lastErrorMessage,
        metadata: row.metadata,
      }),
      test,
      apiKeyHint: `••••${apiKey.slice(-4)}`,
    });
  } catch (error) {
    return atsErrorResponse(error);
  }
}
