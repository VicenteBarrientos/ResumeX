"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";

export default function ExtensionAuthPage() {
  const { data: session, status } = useSession();
  const [token, setToken] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/extension/google-token", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (d.token) {
          setToken(d.token);
          // Send token to extension via URL hash — popup detects this
          window.location.hash = `rx-token=${d.token}`;
          setDone(true);
        }
      });
  }, [status]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0d1117] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0d1117] border border-white/10 text-cyan-400 font-bold text-lg">
          RX
        </div>
        <h1 className="mb-2 text-xl font-bold text-white">ResumeX Extension</h1>

        {status === "loading" && (
          <p className="text-zinc-400 text-sm">Loading…</p>
        )}

        {status === "unauthenticated" && (
          <>
            <p className="mb-6 text-sm text-zinc-400">Sign in to connect the extension to your account.</p>
            <button
              onClick={() => signIn("google")}
              className="flex w-full items-center justify-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
              </svg>
              Continue with Google
            </button>
          </>
        )}

        {status === "authenticated" && !done && (
          <p className="text-sm text-zinc-400">Connecting your extension…</p>
        )}

        {done && (
          <>
            <div className="mb-4 flex items-center justify-center gap-2 text-emerald-400">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-semibold">Extension connected!</span>
            </div>
            <p className="text-sm text-zinc-400">You can close this tab and return to the extension.</p>
          </>
        )}
      </div>
    </div>
  );
}
