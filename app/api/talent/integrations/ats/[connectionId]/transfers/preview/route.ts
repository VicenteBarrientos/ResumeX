import { requireSession } from "@/lib/require-auth";
import { apiError } from "@/lib/api/response";
import { atsErrorResponse, atsJson } from "@/lib/ats/http-response";
import { requireOwnedTalentSearch } from "@/lib/ats/ownership";
import { transferPreviewSchema } from "@/lib/ats/schemas";
import { previewAtsTransfer } from "@/lib/ats/transfer";

type Ctx = { params: Promise<{ connectionId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await requireSession();
    if (auth.error) return auth.error;
    const { connectionId } = await ctx.params;
    const body = await req.json();
    const parsed = transferPreviewSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid preview payload.", { status: 400, details: parsed.error.flatten() });
    }

    if (parsed.data.searchProjectId) {
      await requireOwnedTalentSearch(auth.userId, parsed.data.searchProjectId);
    }

    // Preview is read-only — no ATS mutations.
    const preview = await previewAtsTransfer({
      userId: auth.userId,
      connectionId,
      candidate: parsed.data.candidate,
      externalJobId: parsed.data.externalJobId,
    });

    return atsJson({ preview });
  } catch (error) {
    return atsErrorResponse(error);
  }
}
