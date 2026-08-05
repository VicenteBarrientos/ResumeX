import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Non-secret billing health check for operators and the upgrade UI.
 * Never returns key material — only booleans.
 */
export async function GET() {
  return NextResponse.json({
    stripeSecretConfigured: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    stripeWebhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
    stripeProPriceConfigured: Boolean(process.env.STRIPE_PRO_PRICE_ID?.trim()),
  });
}
