import { apiError } from "@/lib/api/response";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return apiError("Stripe webhook secret is not configured", { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return apiError("Invalid signature", { status: 400 });
  }

  async function getCustomer(customerId: string) {
    return await db.user.findUnique({ where: { stripeCustomerId: customerId } });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const user = await getCustomer(sub.customer as string);
      if (user) {
        await db.user.update({
          where: { id: user.id },
          data: { isPro: sub.status === "active" },
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const user = await getCustomer(sub.customer as string);
      if (user) await db.user.update({ where: { id: user.id }, data: { isPro: false } });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
