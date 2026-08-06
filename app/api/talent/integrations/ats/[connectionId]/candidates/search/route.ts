import { requireSession } from "@/lib/require-auth";
import { apiError } from "@/lib/api/response";
import { atsErrorResponse, atsJson } from "@/lib/ats/http-response";
import { getAtsAdapter } from "@/lib/ats/registry";
import { candidateSearchSchema } from "@/lib/ats/schemas";

type Ctx = { params: Promise<{ connectionId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await requireSession();
    if (auth.error) return auth.error;
    const { connectionId } = await ctx.params;
    const body = await req.json();
    const parsed = candidateSearchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid search payload.", { status: 400 });
    }

    const adapter = await getAtsAdapter(connectionId, auth.userId);
    const matches = await adapter.searchCandidates(parsed.data);
    return atsJson({ matches });
  } catch (error) {
    return atsErrorResponse(error);
  }
}
