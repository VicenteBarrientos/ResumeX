import { requireSession } from "@/lib/require-auth";
import { apiError } from "@/lib/api/response";
import { atsErrorResponse, atsJson } from "@/lib/ats/http-response";
import { getAtsAdapter } from "@/lib/ats/registry";
import { providerSupports } from "@/lib/ats/capabilities";
import { stageChangeSchema } from "@/lib/ats/schemas";

type Ctx = {
  params: Promise<{ connectionId: string; applicationId: string }>;
};

export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await requireSession();
    if (auth.error) return auth.error;
    const { connectionId, applicationId } = await ctx.params;
    const body = await req.json();
    const parsed = stageChangeSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Stage change requires confirmed=true.", { status: 400 });
    }

    const adapter = await getAtsAdapter(connectionId, auth.userId);
    if (
      !providerSupports(adapter.provider, "move_application") ||
      !adapter.moveApplication
    ) {
      return apiError("Moving applications is not supported for this ATS.", { status: 400 });
    }

    await adapter.moveApplication({
      externalApplicationId: applicationId,
      externalStageId: parsed.data.externalStageId,
    });

    return atsJson({ ok: true });
  } catch (error) {
    return atsErrorResponse(error);
  }
}
