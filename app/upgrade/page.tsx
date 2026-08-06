"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";

function UpgradeContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const success = params.get("success");

  const [loading, setLoading] = useState<"pro" | "donation" | "portal" | null>(null);
  const [donationAmount, setDonationAmount] = useState(5);
  const [billingError, setBillingError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  async function startCheckout(type: "pro" | "donation") {
    setLoading(type);
    setBillingError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, donationAmount }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setBillingError(
        data.error ||
          "Checkout is unavailable right now. Billing may not be configured in this environment.",
      );
    } catch {
      setBillingError("Checkout failed. Please try again in a moment.");
    } finally {
      setLoading(null);
    }
  }

  async function openPortal() {
    setLoading("portal");
    setBillingError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setBillingError(data.error || "Billing portal is unavailable right now.");
    } catch {
      setBillingError("Could not open the billing portal.");
    } finally {
      setLoading(null);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-brand-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      {/* Success banners */}
      {success === "pro" && (
        <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          <strong>Pro is active.</strong> Unlimited analyzer and cover-letter runs are unlocked.
        </div>
      )}
      {success === "donation" && (
        <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          <strong>Thanks</strong> — donation received.
        </div>
      )}

      <div className="mb-8 text-center">
        <p className="mb-1 text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
          ResumeX
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          Pro &amp; billing
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Optional. Free tier covers light personal use; Pro raises the AI limits.
        </p>
      </div>

      {billingError && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
          {billingError}
        </div>
      )}

      <div className="space-y-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-zinc-900">Pro</h2>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-zinc-900">$5</span>
              <span className="text-sm text-zinc-500">/month</span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Raises free-tier AI limits (analyzer and cover letters).
            </p>
          </div>
          <ul className="mb-6 space-y-2">
            {[
              "Unlimited resume analysis",
              "Unlimited cover letters",
              "AutoApply Chrome extension",
              "PDF resume storage",
              "Weekly job digest emails",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-zinc-700">
                <span className="text-emerald-500">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => startCheckout("pro")}
            disabled={loading !== null}
            className="w-full rounded-full bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:opacity-60"
          >
            {loading === "pro" ? "Redirecting…" : "Subscribe to Pro"}
          </button>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-bold text-zinc-900">One-time donation</h2>
          <p className="mb-4 text-sm text-zinc-500">
            Optional. Helps cover hosting and API costs.
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            {[3, 5, 10, 25].map((amt) => (
              <button
                key={amt}
                onClick={() => setDonationAmount(amt)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  donationAmount === amt
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>
          <button
            onClick={() => startCheckout("donation")}
            disabled={loading !== null}
            className="w-full rounded-full border border-zinc-300 py-3 text-sm font-semibold text-zinc-700 transition hover:border-brand-400 hover:text-brand-700 disabled:opacity-60"
          >
            {loading === "donation" ? "Redirecting…" : `Donate $${donationAmount}`}
          </button>
        </div>

        {/* Manage billing */}
        {session?.user && (
          <div className="text-center">
            <button
              onClick={openPortal}
              disabled={loading !== null}
              className="text-xs text-zinc-400 underline hover:text-zinc-600 disabled:opacity-50"
            >
              {loading === "portal" ? "Opening…" : "Manage billing & cancel subscription"}
            </button>
          </div>
        )}

        <p className="text-center text-xs text-zinc-400">
          Secured by Stripe · Cancel anytime · No hidden fees
        </p>
      </div>

      <div className="mt-8 text-center">
        <Link href="/career/tracker" className="text-sm text-zinc-400 hover:text-zinc-600">
          ← Back to tracker
        </Link>
      </div>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <Suspense>
      <UpgradeContent />
    </Suspense>
  );
}
