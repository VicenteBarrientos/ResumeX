import { requireSession } from "@/lib/require-auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api/response";
import { atsErrorResponse, atsJson } from "@/lib/ats/http-response";
import { requireOwnedAtsConnection, requireOwnedTalentSearch } from "@/lib/ats/ownership";
import { transferExecuteSchema } from "@/lib/ats/schemas";
import { executeAtsTransfer } from "@/lib/ats/transfer";

type Ctx = { params: Promise<{ connectionId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await requireSession();
    if (auth.error) return auth.error;
    const { connectionId } = await ctx.params;
    const body = await req.json();
    const parsed = transferExecuteSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "Transfer requires confirmed=true and confirmProcessingBasis=true.",
        { status: 400, details: parsed.error.flatten() },
      );
    }

    if (parsed.data.searchProjectId) {
      await requireOwnedTalentSearch(auth.userId, parsed.data.searchProjectId);
    }

    const result = await executeAtsTransfer({
      userId: auth.userId,
      connectionId,
      candidate: parsed.data.candidate,
      externalJobId: parsed.data.externalJobId,
      searchProjectId: parsed.data.searchProjectId,
      reuseExternalCandidateId: parsed.data.reuseExternalCandidateId,
      createDespiteNameOnly: parsed.data.createDespiteNameOnly,
      uploadResume: parsed.data.uploadResume,
      confirmed: true,
    });

    return atsJson({ result });
  } catch (error) {
    return atsErrorResponse(error);
  }
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const auth = await requireSession();
    if (auth.error) return auth.error;
    const { connectionId } = await ctx.params;
    await requireOwnedAtsConnection(auth.userId, connectionId, {
      allowDisconnected: true,
    });

    const transfers = await db.atsTransfer.findMany({
      where: { connectionId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        localCandidateKey: true,
        localSearchProjectId: true,
        externalJobId: true,
        status: true,
        externalCandidateId: true,
        externalApplicationId: true,
        completedOperations: true,
        failedOperation: true,
        safeErrorMessage: true,
        resultSummary: true,
        createdAt: true,
        updatedAt: true,
        candidateSnapshot: true,
      },
    });

    // Strip excess PII from history listing.
    const safe = transfers.map((t) => {
      const snap = t.candidateSnapshot as { name?: string } | null;
      return {
        id: t.id,
        candidateName: snap?.name || t.localCandidateKey,
        localCandidateKey: t.localCandidateKey,
        localSearchProjectId: t.localSearchProjectId,
        externalJobId: t.externalJobId,
        status: t.status,
        externalCandidateId: t.externalCandidateId,
        externalApplicationId: t.externalApplicationId,
        completedOperations: t.completedOperations,
        failedOperation: t.failedOperation,
        safeErrorMessage: t.safeErrorMessage,
        resultSummary: t.resultSummary,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      };
    });

    return atsJson({ transfers: safe });
  } catch (error) {
    return atsErrorResponse(error);
  }
}
