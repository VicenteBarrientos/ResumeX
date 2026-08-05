import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is required for billing routes.");
  }

  stripeClient ??= new Stripe(apiKey, {
    apiVersion: "2026-06-24.dahlia",
  });

  return stripeClient;
}

export function getStripeProPriceId() {
  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!priceId) {
    throw new Error("STRIPE_PRO_PRICE_ID is required for Pro checkout.");
  }

  return priceId;
}

export const PLANS = {
  pro: {
    name: "ResumeX Pro",
    amount: 500, // $5.00 in cents — single source of truth for display copy
  },
} as const;

/** Display string for Career Pro pricing (B-1). */
export function formatProPriceLabel(): string {
  return `$${PLANS.pro.amount / 100}/mo`;
}
