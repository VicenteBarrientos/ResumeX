import { requireSession } from "@/lib/require-auth";
import { atsErrorResponse, atsJson } from "@/lib/ats/http-response";
import { resumeAtsTransfer } from "@/lib/ats/transfer";

type Ctx = { params: Promise<{ connectionId: string; transferId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  try {
    const auth = await requireSession();
    if (auth.error) return auth.error;
    const { connectionId, transferId } = await ctx.params;
    const result = await resumeAtsTransfer({
      userId: auth.userId,
      connectionId,
      transferId,
    });
    return atsJson({ result });
  } catch (error) {
    return atsErrorResponse(error);
  }
}
