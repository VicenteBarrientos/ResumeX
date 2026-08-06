import "server-only";

import { createHash } from "crypto";
import { db } from "@/lib/db";

export type NormalizedAtsEvent =
  | { type: "candidate_created"; externalCandidateId: string }
  | {
      type: "candidate_assigned";
      externalCandidateId: string;
      externalJobId: string;
      externalApplicationId?: string;
    }
  | {
      type: "application_stage_changed";
      externalCandidateId: string;
      externalApplicationId?: string;
      externalJobId?: string;
      previousStage?: string;
      currentStage?: string;
    }
  | {
      type: "candidate_hired";
      externalCandidateId: string;
      externalApplicationId?: string;
      externalJobId?: string;
    }
  | { type: "candidate_deleted"; externalCandidateId: string }
  | {
      type: "candidate_merged";
      deletedExternalCandidateId: string;
      survivingExternalCandidateId: string;
    }
  | { type: "ping" }
  | { type: "ignored"; reason: string };

/**
 * Common webhook processing:
 * signature already verified → normalize → idempotency → persist → mapping update.
 * No queue required for MVP — processing is small and deterministic.
 */
export async function processAtsWebhookEvent(input: {
  connectionId: string;
  providerEventId: string;
  eventType: string;
  payloadHash: string;
  normalized: NormalizedAtsEvent;
}): Promise<{ duplicate: boolean; status: string }> {
  const existing = await db.atsWebhookEvent.findUnique({
    where: {
      connectionId_providerEventId: {
        connectionId: input.connectionId,
        providerEventId: input.providerEventId,
      },
    },
  });
  if (existing) {
    return { duplicate: true, status: existing.status };
  }

  const event = await db.atsWebhookEvent.create({
    data: {
      connectionId: input.connectionId,
      providerEventId: input.providerEventId,
      eventType: input.eventType,
      payloadHash: input.payloadHash,
      status: "processing",
    },
  });

  try {
    await applyNormalizedEvent(input.connectionId, input.normalized);
    await db.atsWebhookEvent.update({
      where: { id: event.id },
      data: { status: "processed", processedAt: new Date() },
    });
    return { duplicate: false, status: "processed" };
  } catch (error) {
    await db.atsWebhookEvent.update({
      where: { id: event.id },
      data: {
        status: "failed",
        processedAt: new Date(),
        safeErrorMessage:
          error instanceof Error ? error.message.slice(0, 300) : "Webhook processing failed",
      },
    });
    return { duplicate: false, status: "failed" };
  }
}

async function applyNormalizedEvent(
  connectionId: string,
  event: NormalizedAtsEvent
): Promise<void> {
  switch (event.type) {
    case "ping":
    case "ignored":
      return;
    case "candidate_deleted":
      // Do not delete ResumeX evidence; only mark mapping metadata.
      await db.atsExternalMapping.updateMany({
        where: {
          connectionId,
          externalEntityType: "candidate",
          externalEntityId: event.externalCandidateId,
        },
        data: {
          metadata: { deletedInAts: true, deletedAt: new Date().toISOString() },
        },
      });
      return;
    case "candidate_merged":
      await db.atsExternalMapping.updateMany({
        where: {
          connectionId,
          externalEntityType: "candidate",
          externalEntityId: event.deletedExternalCandidateId,
        },
        data: {
          externalEntityId: event.survivingExternalCandidateId,
          metadata: {
            merged: true,
            previousExternalId: event.deletedExternalCandidateId,
          },
        },
      });
      return;
    case "application_stage_changed":
    case "candidate_assigned":
    case "candidate_hired":
    case "candidate_created":
      // Conservative: update transfer status metadata only when we have a mapping.
      if ("externalCandidateId" in event && event.externalCandidateId) {
        await db.atsTransfer.updateMany({
          where: {
            connectionId,
            externalCandidateId: event.externalCandidateId,
          },
          data: {
            resultSummary: {
              lastWebhookEvent: event.type,
              at: new Date().toISOString(),
              ...(event.type === "application_stage_changed"
                ? { stage: event.currentStage }
                : {}),
            },
          },
        });
      }
      return;
  }
}

export function hashWebhookPayload(rawBody: string | Buffer): string {
  const buf = typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody;
  return createHash("sha256").update(buf).digest("hex");
}

export function normalizeRecruiteeWebhookPayload(
  payload: Record<string, unknown>
): { eventType: string; providerEventId: string; normalized: NormalizedAtsEvent } {
  const eventType = String(payload.event || payload.type || "unknown");
  const providerEventId = String(
    payload.id || payload.event_id || `${eventType}-${payload.created_at || Date.now()}`
  );

  if (eventType === "test" || eventType === "ping") {
    return {
      eventType,
      providerEventId,
      normalized: { type: "ping" },
    };
  }

  const candidate = payload.candidate as { id?: string | number } | undefined;
  const candidateId = candidate?.id != null ? String(candidate.id) : undefined;

  if (eventType === "candidate_created" && candidateId) {
    return {
      eventType,
      providerEventId,
      normalized: { type: "candidate_created", externalCandidateId: candidateId },
    };
  }

  if (eventType === "candidate_assigned" && candidateId) {
    const offer = payload.offer as { id?: string | number } | undefined;
    return {
      eventType,
      providerEventId,
      normalized: {
        type: "candidate_assigned",
        externalCandidateId: candidateId,
        externalJobId: offer?.id != null ? String(offer.id) : "",
      },
    };
  }

  if (eventType === "candidate_moved" && candidateId) {
    const stage = payload.stage as { name?: string } | undefined;
    const prev = payload.previous_stage as { name?: string } | undefined;
    return {
      eventType,
      providerEventId,
      normalized: {
        type: "application_stage_changed",
        externalCandidateId: candidateId,
        previousStage: prev?.name,
        currentStage: stage?.name,
      },
    };
  }

  return {
    eventType,
    providerEventId,
    normalized: { type: "ignored", reason: `Unhandled Recruitee event ${eventType}` },
  };
}

export function normalizeAshbyWebhookPayload(
  payload: Record<string, unknown>
): { eventType: string; providerEventId: string; normalized: NormalizedAtsEvent } {
  const eventType = String(payload.action || payload.type || "unknown");
  const providerEventId = String(
    payload.webhookId || payload.id || `${eventType}-${Date.now()}`
  );

  if (eventType === "ping") {
    return { eventType, providerEventId, normalized: { type: "ping" } };
  }

  const data = (payload.data || payload) as Record<string, unknown>;
  const candidateId =
    data.candidateId != null
      ? String(data.candidateId)
      : data.candidate && typeof data.candidate === "object"
        ? String((data.candidate as { id?: string }).id || "")
        : "";

  switch (eventType) {
    case "applicationUpdate":
    case "candidateStageChange":
      return {
        eventType,
        providerEventId,
        normalized: {
          type: "application_stage_changed",
          externalCandidateId: candidateId,
          externalApplicationId:
            data.applicationId != null ? String(data.applicationId) : undefined,
          currentStage:
            data.stage != null
              ? String(data.stage)
              : data.interviewStageId != null
                ? String(data.interviewStageId)
                : undefined,
        },
      };
    case "candidateHire":
      return {
        eventType,
        providerEventId,
        normalized: {
          type: "candidate_hired",
          externalCandidateId: candidateId,
          externalApplicationId:
            data.applicationId != null ? String(data.applicationId) : undefined,
        },
      };
    case "candidateDelete":
      return {
        eventType,
        providerEventId,
        normalized: {
          type: "candidate_deleted",
          externalCandidateId: candidateId,
        },
      };
    case "candidateMerge":
      return {
        eventType,
        providerEventId,
        normalized: {
          type: "candidate_merged",
          deletedExternalCandidateId: String(data.deletedCandidateId || ""),
          survivingExternalCandidateId: String(
            data.survivingCandidateId || candidateId
          ),
        },
      };
    default:
      return {
        eventType,
        providerEventId,
        normalized: { type: "ignored", reason: `Unhandled Ashby event ${eventType}` },
      };
  }
}
