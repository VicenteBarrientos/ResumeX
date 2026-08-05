"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useLocale } from "@/components/LocaleProvider";

export default function AppNav() {
  const { t } = useLocale();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  const links = session
    ? [
        { href: "/cv", label: t.nav.cvFormatter },
        { href: "/analyzer", label: t.nav.analyzer },
        { href: "/talent-mapper", label: "Talent Mapper" },
        { href: "/jobs", label: "Job Search" },
        { href: "/cover-letter", label: "Cover Letter" },
        { href: "/autoapply", label: "AutoApply" },
        { href: "/tracker", label: "Tracker" },
        { href: "/upgrade", label: "⭐ Go Pro — $5/mo" },
      ]
    : [
        { href: "/login", label: "Sign in" },
        { href: "/register", label: "Get started" },
      ];

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const displayName = session?.user?.name ?? session?.user?.email ?? "";

  return (
    <div className="flex items-center gap-3">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 select-none">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0d1117] text-xs font-bold text-cyan-400 dark:bg-white/10">
          RX
        </div>
        <span className="hidden text-sm font-bold text-zinc-900 dark:text-white sm:block">
          Resume<span className="text-indigo-600 dark:text-cyan-400">X</span>
        </span>
      </Link>

      {/* Menu button */}
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Navigation menu"
          aria-expanded={open}
          className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700 dark:border-white/15 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-cyan-400/40 dark:hover:text-cyan-200"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="1" y1="3.5" x2="13" y2="3.5" />
            <line x1="1" y1="7" x2="13" y2="7" />
            <line x1="1" y1="10.5" x2="13" y2="10.5" />
          </svg>
          Menu
        </button>

        {open && (
          <div className="absolute left-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-white/10 dark:bg-zinc-900">
            <div className="p-1">
              {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition ${
                      isActive
                        ? "bg-indigo-50 font-semibold text-indigo-700 dark:bg-cyan-400/10 dark:text-cyan-300"
                        : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-white/5"
                    }`}
                  >
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-cyan-400" />}
                    {!isActive && <span className="h-1.5 w-1.5" />}
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Account area */}
      {session ? (
        <div ref={accountRef} className="relative ml-auto">
          <button
            onClick={() => setAccountOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-sm transition hover:bg-indigo-100 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-300 dark:hover:bg-cyan-400/15"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white dark:bg-cyan-400 dark:text-zinc-900">
              {displayName.charAt(0).toUpperCase()}
            </span>
            <span className="hidden max-w-[120px] truncate sm:block">{displayName}</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
          </button>

          {accountOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-white/10 dark:bg-zinc-900">
              <div className="border-b border-zinc-100 px-3 py-2.5 dark:border-white/10">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Signed in as</p>
                <p className="mt-0.5 truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">{displayName}</p>
              </div>
              <div className="p-1">
                <Link href="/tracker/profile" onClick={() => setAccountOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-white/5">
                  Profile
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-400/10"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700 dark:border-white/15 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-cyan-400/40 dark:hover:text-cyan-200"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-full border border-indigo-500 bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-500 dark:border-cyan-400/50 dark:bg-cyan-500/20 dark:text-cyan-100 dark:hover:bg-cyan-400/30"
          >
            Get started
          </Link>
        </div>
      )}
    </div>
  );
}
