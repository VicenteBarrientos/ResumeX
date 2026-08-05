import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-options";
import { RESUMEX_URL } from "@/lib/constants";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

const BASE_URL = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "") || RESUMEX_URL;

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stripe = getStripe();
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user?.stripeCustomerId) return NextResponse.json({ error: "No billing account" }, { status: 404 });

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${BASE_URL}/upgrade`,
  });

  return NextResponse.json({ url: portalSession.url });
}
