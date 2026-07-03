import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
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
