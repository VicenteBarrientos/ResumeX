import { requireSession } from "@/lib/require-auth";
import { atsErrorResponse, atsJson } from "@/lib/ats/http-response";
import {
  ATS_JOB_CACHE_TTL_MS,
  atsCacheGet,
  atsCacheSet,
} from "@/lib/ats/cache";
import { getAtsAdapter } from "@/lib/ats/registry";
import type { AtsJob } from "@/lib/ats/types";

type Ctx = { params: Promise<{ connectionId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const auth = await requireSession();
    if (auth.error) return auth.error;
    const { connectionId } = await ctx.params;
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || undefined;
    const refresh = url.searchParams.get("refresh") === "1";

    const cacheKey = `jobs:${connectionId}:${search || ""}`;
    if (!refresh) {
      const cached = atsCacheGet<{ jobs: AtsJob[]; nextCursor?: string }>(cacheKey);
      if (cached) return atsJson({ ...cached, cached: true });
    }

    const adapter = await getAtsAdapter(connectionId, auth.userId);
    const result = await adapter.listJobs({ search });
    atsCacheSet(cacheKey, result, ATS_JOB_CACHE_TTL_MS);
    return atsJson({ ...result, cached: false });
  } catch (error) {
    return atsErrorResponse(error);
  }
}
