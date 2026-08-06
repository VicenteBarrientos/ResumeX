import { requireSession } from "@/lib/require-auth";
import { db } from "@/lib/db";
import { atsErrorResponse, atsJson } from "@/lib/ats/http-response";
import { requireOwnedAtsConnection } from "@/lib/ats/ownership";

type Ctx = { params: Promise<{ connectionId: string }> };

/** DELETE handler lives on /test route as well; dedicated disconnect alias. */
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
    return atsJson({ ok: true });
  } catch (error) {
    return atsErrorResponse(error);
  }
}
