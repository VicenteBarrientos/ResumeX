"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

const STEPS = ["Welcome", "Your Profile", "Upload Resume", "You're ready!"];

export default function OnboardingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    location: "",
    linkedinUrl: "",
  });

  async function saveProfile() {
    setSaving(true);
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setSaving(false);
  }

  async function handleNext() {
    if (step === 1) await saveProfile();
    if (step === STEPS.length - 1) {
      router.push("/tracker");
      return;
    }
    setStep((s) => s + 1);
  }

  function skip() {
    if (step === STEPS.length - 1) {
      router.push("/tracker");
      return;
    }
    setStep((s) => s + 1);
  }

  const inputClass =
    "w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20";

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="mb-2 flex justify-between text-xs text-zinc-400">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={i <= step ? "text-indigo-600 font-medium dark:text-cyan-400" : ""}
              >
                {i + 1}. {s}
              </span>
            ))}
          </div>
          <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-white/10">
            <div
              className="h-1.5 rounded-full bg-indigo-600 transition-all duration-500 dark:bg-cyan-400"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-bold text-white dark:bg-gradient-to-br dark:from-cyan-400 dark:to-blue-500 dark:text-[#050816]">
                RX
              </div>
              <h1 className="mb-3 text-2xl font-bold text-zinc-900 dark:text-white">
                Welcome to ResumeX{session?.user?.name ? `, ${session.user.name}` : ""}!
              </h1>
              <p className="mb-6 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Let&apos;s get you set up in 2 minutes. You&apos;ll upload your resume once and every tool — the analyzer, cover letter generator, and AutoApply — will use it automatically.
              </p>
              <div className="grid grid-cols-2 gap-3 text-left">
                {[
                  { icon: "◎", text: "AI job match scoring" },
                  { icon: "✉", text: "Tailored cover letters" },
                  { icon: "⚡", text: "Auto-fill applications" },
                  { icon: "◈", text: "Track every application" },
                ].map((f) => (
                  <div key={f.text} className="flex items-center gap-2 rounded-xl border border-zinc-100 p-3 dark:border-white/10">
                    <span className="text-indigo-600 dark:text-cyan-400">{f.icon}</span>
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Profile */}
          {step === 1 && (
            <div>
              <h2 className="mb-1 text-xl font-bold text-zinc-900 dark:text-white">Your profile</h2>
              <p className="mb-6 text-sm text-zinc-500">This is used to personalize your cover letters and auto-fill applications.</p>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200">Full Name</label>
                  <input
                    type="text"
                    value={profile.fullName}
                    onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
                    placeholder="e.g. Vicente Barrientos"
                    className={inputClass}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200">Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200">Location</label>
                  <input
                    type="text"
                    value={profile.location}
                    onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))}
                    placeholder="e.g. Santiago, Chile"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200">LinkedIn URL</label>
                  <input
                    type="url"
                    value={profile.linkedinUrl}
                    onChange={(e) => setProfile((p) => ({ ...p, linkedinUrl: e.target.value }))}
                    placeholder="https://linkedin.com/in/yourname"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Upload Resume */}
          {step === 2 && (
            <div className="text-center">
              <div className="mx-auto mb-4 text-4xl">📄</div>
              <h2 className="mb-2 text-xl font-bold text-zinc-900 dark:text-white">Upload your resume</h2>
              <p className="mb-6 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Upload your resume PDF once and we&apos;ll extract your information automatically. Every tool will use it from here on.
              </p>
              <Link
                href="/tracker/profile"
                className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 dark:bg-gradient-to-r dark:from-cyan-400 dark:to-blue-500 dark:text-[#050816]"
              >
                Go to profile page to upload →
              </Link>
              <p className="mt-4 text-xs text-zinc-400">You can also do this later from your profile.</p>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <div className="text-center">
              <div className="mx-auto mb-4 text-5xl">🎉</div>
              <h2 className="mb-2 text-xl font-bold text-zinc-900 dark:text-white">You&apos;re all set!</h2>
              <p className="mb-6 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Your account is ready. Start by searching for jobs, analyzing a job description, or tracking your first application.
              </p>
              <div className="grid grid-cols-1 gap-3">
                <Link
                  href="/jobs"
                  className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 dark:bg-gradient-to-r dark:from-cyan-400 dark:to-blue-500 dark:text-[#050816]"
                >
                  Search for jobs →
                </Link>
                <Link
                  href="/analyzer"
                  className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition hover:border-indigo-400 hover:text-indigo-700 dark:border-white/15 dark:text-zinc-300"
                >
                  Analyze a job description
                </Link>
                <Link
                  href="/tracker"
                  className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  Go to my tracker
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        {step < STEPS.length - 1 && (
          <div className="mt-6 flex items-center justify-between">
            {step > 0 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                ← Back
              </button>
            ) : <div />}
            <div className="flex items-center gap-3">
              {step > 0 && (
                <button onClick={skip} className="text-sm text-zinc-400 hover:text-zinc-600">
                  Skip
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={saving}
                className="rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:bg-zinc-300 disabled:text-zinc-500 dark:bg-gradient-to-r dark:from-cyan-400 dark:to-blue-500 dark:text-[#050816]"
              >
                {saving ? "Saving…" : step === 0 ? "Let's go →" : "Continue →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
