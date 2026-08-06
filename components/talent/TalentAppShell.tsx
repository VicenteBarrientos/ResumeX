"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import LanguageToggle from "@/components/LanguageToggle";
import { CAREER, TALENT } from "@/lib/products";

function NavIcon({ name }: { name: string }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "mapper":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="2.5" />
          <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2" />
        </svg>
      );
    case "assess":
      return (
        <svg {...common}>
          <path d="M3 3.5h10v9H3z" />
          <path d="M5.5 7l1.5 1.5L10.5 5" />
        </svg>
      );
    case "searches":
      return (
        <svg {...common}>
          <circle cx="7" cy="7" r="3.5" />
          <path d="M10 10l3 3" />
        </svg>
      );
    case "integrations":
      return (
        <svg {...common}>
          <path d="M6 3v3H3v4h3v3h4v-3h3V6h-3V3H6z" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="5" />
        </svg>
      );
  }
}

function iconForHref(href: string): string {
  if (href.includes("/mapper")) return "mapper";
  if (href.includes("/assess")) return "assess";
  if (href.includes("/searches")) return "searches";
  if (href.includes("/integrations")) return "integrations";
  return "default";
}

/**
 * Ashby-like app chrome for ResumeX Talent: left sidebar + dense main canvas.
 * Palette stays ResumeX navy / emerald (R-020); only the layout pattern changes.
 */
export default function TalentAppShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const displayName = session?.user?.name ?? session?.user?.email ?? "";

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 border-b border-[var(--talent-panel-border)] px-4 py-3.5">
        <Link
          href={TALENT.home}
          className="flex items-center gap-2.5 select-none"
          onClick={() => setMobileOpen(false)}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-[10px] font-bold text-white">
            RX
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-zinc-900">
              Resume<span className="text-brand-600">X</span>
            </p>
            <p className="text-[11px] font-medium text-zinc-500">{TALENT.suffix}</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-3" aria-label={`${TALENT.name} navigation`}>
        {TALENT.nav.map((link) => {
          const isActive =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition ${
                isActive
                  ? "bg-brand-50 font-semibold text-brand-700"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              <span className={isActive ? "text-brand-600" : "text-zinc-400"}>
                <NavIcon name={iconForHref(link.href)} />
              </span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-[var(--talent-panel-border)] px-3 py-3">
        <Link
          href={CAREER.home}
          onClick={() => setMobileOpen(false)}
          className="block rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
        >
          {CAREER.name} →
        </Link>

        {session ? (
          <div ref={accountRef} className="relative">
            <button
              type="button"
              onClick={() => setAccountOpen((o) => !o)}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-600 text-[10px] font-bold text-white">
                {displayName.charAt(0).toUpperCase() || "?"}
              </span>
              <span className="min-w-0 flex-1 truncate">{displayName || "Account"}</span>
            </button>
            {accountOpen && (
              <div className="absolute bottom-full left-0 z-50 mb-1 w-full overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
                <div className="border-b border-zinc-100 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    Signed in as
                  </p>
                  <p className="mt-0.5 truncate text-sm font-medium text-zinc-800">
                    {displayName}
                  </p>
                </div>
                <div className="p-1">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        localStorage.removeItem("resumex-talent-mapper-v1");
                        localStorage.removeItem("resumex-talent-mapper-imported");
                      } catch {
                        // ignore
                      }
                      void signOut({ callbackUrl: "/" });
                    }}
                    className="flex w-full items-center rounded-md px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1 px-1">
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(TALENT.home)}`}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-brand-600 px-2.5 py-1.5 text-center text-xs font-medium text-white hover:bg-brand-500"
            >
              Create account
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[var(--talent-canvas)] text-zinc-900">
      {/* Desktop sidebar */}
      <aside
        className="sticky top-0 hidden h-screen w-[220px] shrink-0 border-r border-[var(--talent-panel-border)] bg-[var(--talent-sidebar)] lg:block"
        aria-label="Talent sidebar"
      >
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-900/40"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[240px] bg-[var(--talent-sidebar)] shadow-xl">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-12 items-center gap-3 border-b border-[var(--talent-panel-border)] bg-white/90 px-3 backdrop-blur-sm sm:px-5">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50 lg:hidden"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="1" y1="3.5" x2="13" y2="3.5" />
              <line x1="1" y1="7" x2="13" y2="7" />
              <line x1="1" y1="10.5" x2="13" y2="10.5" />
            </svg>
          </button>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-800">
            {TALENT.name}
          </p>
          <LanguageToggle />
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
