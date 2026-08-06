import { requireSession } from "@/lib/require-auth";
import { db } from "@/lib/db";
import { atsErrorResponse, atsJson } from "@/lib/ats/http-response";
import { requireOwnedAtsConnection } from "@/lib/ats/ownership";
import { getAtsAdapter } from "@/lib/ats/registry";
import { toPrismaStatus } from "@/lib/ats/mapping";
import { atsCacheInvalidate } from "@/lib/ats/cache";

type Ctx = { params: Promise<{ connectionId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  try {
    const auth = await requireSession();
    if (auth.error) return auth.error;
    const { connectionId } = await ctx.params;

    await requireOwnedAtsConnection(auth.userId, connectionId, {
      allowDisconnected: true,
    });
    const adapter = await getAtsAdapter(connectionId, auth.userId);
    const test = await adapter.testConnection();

    await db.atsConnection.update({
      where: { id: connectionId },
      data: {
        status: toPrismaStatus(test.status),
        lastTestedAt: new Date(),
        lastErrorMessage: test.warnings.join("; ") || null,
        capabilities: adapter.getCapabilities(),
      },
    });

    atsCacheInvalidate(`jobs:${connectionId}`);
    return atsJson({ test });
  } catch (error) {
    return atsErrorResponse(error);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const auth = await requireSession();
    if (auth.error) return auth.error;
    const { connectionId } = await ctx.params;

    await requireOwnedAtsConnection(auth.userId, connectionId, {
      allowDisconnected: true,
    });

    await db.atsConnection.update({
      where: { id: connectionId },
      data: {
        status: "DISCONNECTED",
        encryptedCredentials: null,
        lastErrorMessage: "Disconnected — local credentials removed.",
      },
    });

    atsCacheInvalidate(`jobs:${connectionId}`);
    return atsJson({ ok: true });
  } catch (error) {
    return atsErrorResponse(error);
  }
}
