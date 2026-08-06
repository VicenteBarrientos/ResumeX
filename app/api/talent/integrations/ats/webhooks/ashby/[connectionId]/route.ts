import { db } from "@/lib/db";
import {
  hashWebhookPayload,
  normalizeAshbyWebhookPayload,
  processAtsWebhookEvent,
} from "@/lib/ats/webhooks/process";
import { verifyAshbySignature } from "@/lib/ats/providers/ashby/webhook";

type Ctx = { params: Promise<{ connectionId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { connectionId } = await ctx.params;
  const rawBody = await req.text();

  const connection = await db.atsConnection.findFirst({
    where: { id: connectionId, provider: "ASHBY" },
  });
  if (!connection) {
    return new Response("Not found", { status: 404 });
  }

  const metadata = (connection.metadata || {}) as { webhookSecret?: string };
  const secret = metadata.webhookSecret;
  // Demo mode accepts unsigned ping-only for local testing when no secret.
  if (secret) {
    const signature = req.headers.get("ashby-signature");
    if (!verifyAshbySignature({ rawBody, signatureHeader: signature, secret })) {
      return new Response("Invalid signature", { status: 401 });
    }
  } else if (connection.mode !== "DEMO") {
    return new Response("Webhook secret not configured", { status: 401 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const normalized = normalizeAshbyWebhookPayload(payload);
  await processAtsWebhookEvent({
    connectionId,
    providerEventId: normalized.providerEventId,
    eventType: normalized.eventType,
    payloadHash: hashWebhookPayload(rawBody),
    normalized: normalized.normalized,
  });

  return new Response("ok", { status: 200 });
}
