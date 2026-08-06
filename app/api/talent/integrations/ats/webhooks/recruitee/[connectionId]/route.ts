import { db } from "@/lib/db";
import { decryptIntegrationCredential } from "@/lib/ats/encryption";
import {
  hashWebhookPayload,
  normalizeRecruiteeWebhookPayload,
  processAtsWebhookEvent,
} from "@/lib/ats/webhooks/process";
import { verifyRecruiteeSignature } from "@/lib/ats/providers/recruitee/webhook";
import type { RecruiteeCredentials } from "@/lib/ats/types";

type Ctx = { params: Promise<{ connectionId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { connectionId } = await ctx.params;
  const rawBody = await req.text();

  const connection = await db.atsConnection.findFirst({
    where: { id: connectionId, provider: "RECRUITEE" },
  });
  if (!connection) {
    return new Response("Not found", { status: 404 });
  }

  const secret =
    connection.encryptedCredentials
      ? decryptIntegrationCredential<RecruiteeCredentials>(
          connection.encryptedCredentials
        ).webhookSecret
      : undefined;

  if (!secret) {
    return new Response("Webhook secret not configured", { status: 401 });
  }

  const signature = req.headers.get("x-recruitee-signature");
  if (!verifyRecruiteeSignature({ rawBody, signatureHeader: signature, secret })) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const normalized = normalizeRecruiteeWebhookPayload(payload);
  await processAtsWebhookEvent({
    connectionId,
    providerEventId: normalized.providerEventId,
    eventType: normalized.eventType,
    payloadHash: hashWebhookPayload(rawBody),
    normalized: normalized.normalized,
  });

  // Respond quickly after durable recording.
  return new Response("ok", { status: 200 });
}
