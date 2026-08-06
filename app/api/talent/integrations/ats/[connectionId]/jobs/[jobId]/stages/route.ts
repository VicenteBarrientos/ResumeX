import { requireSession } from "@/lib/require-auth";
import { atsErrorResponse, atsJson } from "@/lib/ats/http-response";
import { getAtsAdapter } from "@/lib/ats/registry";
import { providerSupports } from "@/lib/ats/capabilities";

type Ctx = { params: Promise<{ connectionId: string; jobId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const auth = await requireSession();
    if (auth.error) return auth.error;
    const { connectionId, jobId } = await ctx.params;
    const adapter = await getAtsAdapter(connectionId, auth.userId);
    if (!providerSupports(adapter.provider, "list_stages") || !adapter.listStages) {
      return atsJson({ error: { message: "Listing stages is not supported for this ATS." } }, 400);
    }
    const stages = await adapter.listStages(jobId);
    return atsJson({ stages });
  } catch (error) {
    return atsErrorResponse(error);
  }
}
