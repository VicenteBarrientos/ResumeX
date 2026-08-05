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

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  async function startCheckout(type: "pro" | "donation") {
    setLoading(type);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, donationAmount }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  }

  async function openPortal() {
    setLoading("portal");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600 dark:border-white/10 dark:border-t-cyan-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      {/* Success banners */}
      {success === "pro" && (
        <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
          🎉 <strong>You&apos;re now a ResumeX Pro member!</strong> Thank you — enjoy all features.
        </div>
      )}
      {success === "donation" && (
        <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
          ❤️ <strong>Thank you so much for your support!</strong> It means the world to us.
        </div>
      )}

      <div className="mb-8 text-center">
        <p className="mb-1 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-cyan-300">
          ResumeX
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Support ResumeX
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Built by a recruiter, for job seekers. Your support keeps this running.
        </p>
      </div>

      <div className="space-y-4">
        {/* Pro plan */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-indigo-500 bg-white p-6 shadow-sm dark:border-cyan-400/60 dark:bg-white/[0.03]">
          <div className="absolute right-4 top-4 rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-bold text-white dark:bg-cyan-400 dark:text-zinc-900">
            MOST POPULAR
          </div>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">ResumeX Pro</h2>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-zinc-900 dark:text-white">$5</span>
              <span className="text-sm text-zinc-500">/month</span>
            </div>
            <p className="mt-1 text-xs text-indigo-600 dark:text-cyan-400 font-medium">
              Founding member price — locked in forever
            </p>
          </div>
          <ul className="mb-6 space-y-2">
            {[
              "Unlimited job tracking",
              "AI match scoring on every job",
              "Chrome extension auto-fill & auto-save",
              "Resume parsing & profile auto-fill",
              "Answer learning across applications",
              "Job search with 200+ sources",
              "Export to CSV",
              "Priority support",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <span className="text-emerald-500">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => startCheckout("pro")}
            disabled={loading !== null}
            className="w-full rounded-full bg-indigo-600 py-3 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-60 dark:bg-gradient-to-r dark:from-cyan-400 dark:to-blue-500 dark:text-[#050816]"
          >
            {loading === "pro" ? "Redirecting…" : "Get Pro — $5/month"}
          </button>
        </div>

        {/* Donation */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          <h2 className="mb-1 text-lg font-bold text-zinc-900 dark:text-white">Make a Donation ❤️</h2>
          <p className="mb-4 text-sm text-zinc-500">
            Love what we&apos;re building? A one-time contribution goes a long way.
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            {[3, 5, 10, 25].map((amt) => (
              <button
                key={amt}
                onClick={() => setDonationAmount(amt)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  donationAmount === amt
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-cyan-400 dark:bg-cyan-400/10 dark:text-cyan-300"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300"
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>
          <button
            onClick={() => startCheckout("donation")}
            disabled={loading !== null}
            className="w-full rounded-full border-2 border-rose-400 py-3 text-sm font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60 dark:border-rose-400/60 dark:text-rose-400 dark:hover:bg-rose-400/10"
          >
            {loading === "donation" ? "Redirecting…" : `Donate $${donationAmount} ❤️`}
          </button>
        </div>

        {/* Manage billing */}
        {session?.user && (
          <div className="text-center">
            <button
              onClick={openPortal}
              disabled={loading !== null}
              className="text-xs text-zinc-400 underline hover:text-zinc-600 disabled:opacity-50 dark:hover:text-zinc-200"
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
        <Link href="/career/tracker" className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
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
