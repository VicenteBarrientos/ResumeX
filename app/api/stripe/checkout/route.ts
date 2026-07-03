import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { getStripe, getStripeProPriceId } from "@/lib/stripe";
import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXTAUTH_URL || "https://resumex.talentxrecruiting.com";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stripe = getStripe();
  const { type } = await req.json(); // "pro" | "donation"
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Get or create Stripe customer
  let customerId = user.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: user.username,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await db.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  if (type === "donation") {
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Support ResumeX ❤️", description: "One-time donation — thank you so much!" },
            unit_amount: 500, // default $5, user can adjust
          },
          quantity: 1,
        },
      ],
      payment_intent_data: { metadata: { userId: user.id, type: "donation" } },
      submit_type: "donate",
      success_url: `${BASE_URL}/upgrade?success=donation`,
      cancel_url: `${BASE_URL}/upgrade`,
    });
    return NextResponse.json({ url: checkoutSession.url });
  }

  // Pro subscription
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: getStripeProPriceId(), quantity: 1 }],
    subscription_data: { metadata: { userId: user.id } },
    success_url: `${BASE_URL}/upgrade?success=pro`,
    cancel_url: `${BASE_URL}/upgrade`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
