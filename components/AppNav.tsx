"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useLocale } from "@/components/LocaleProvider";
import { CAREER, otherProduct, productForPath } from "@/lib/products";

export default function AppNav() {
  const { t } = useLocale();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  // The wordmark only names a product when we are actually inside one — the
  // landing and the auth pages stay plain "ResumeX".
  const activeProduct = productForPath(pathname);
  // Shared surfaces (/upgrade, /extension-auth) fall back to Career for the menu:
  // it leads the funnel and owns most of the tool surface.
  const product = activeProduct ?? CAREER;
  const sibling = otherProduct(product);

  const links = session
    ? [
        ...product.nav.map((link) => ({
          href: link.href,
          label: link.localeKey ? t.nav[link.localeKey] : link.label,
        })),
        { href: sibling.home, label: `${sibling.name} →` },
      ]
    : [
        { href: "/login", label: "Sign in" },
        { href: "/register", label: "Create account" },
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
      <Link
        href={activeProduct ? activeProduct.home : "/"}
        className="flex items-center gap-2 select-none"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
          RX
        </div>
        <span className="hidden text-sm font-bold text-zinc-900 sm:block">
          Resume<span className="text-brand-600">X</span>
          {activeProduct && (
            <span className="ml-1 font-semibold text-zinc-500">
              {activeProduct.suffix}
            </span>
          )}
        </span>
      </Link>

      {/* Menu button */}
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Navigation menu"
          aria-expanded={open}
          className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm transition hover:border-brand-300 hover:text-brand-700"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="1" y1="3.5" x2="13" y2="3.5" />
            <line x1="1" y1="7" x2="13" y2="7" />
            <line x1="1" y1="10.5" x2="13" y2="10.5" />
          </svg>
          Menu
        </button>

        {open && (
          <div className="absolute left-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
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
                        ? "bg-brand-50 font-semibold text-brand-700"
                        : "text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />}
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
            className="flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 shadow-sm transition hover:bg-brand-100"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
              {displayName.charAt(0).toUpperCase()}
            </span>
            <span className="hidden max-w-[120px] truncate sm:block">{displayName}</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
          </button>

          {accountOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
              <div className="border-b border-zinc-100 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Signed in as</p>
                <p className="mt-0.5 truncate text-sm font-medium text-zinc-800">{displayName}</p>
              </div>
              <div className="p-1">
                <Link href="/career/tracker/profile" onClick={() => setAccountOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
                  Profile
                </Link>
                <button
                  onClick={() => {
                    try {
                      localStorage.removeItem("resumex-talent-mapper-v1");
                      localStorage.removeItem("resumex-talent-mapper-imported");
                    } catch {
                      // ignore
                    }
                    void signOut({ callbackUrl: "/" });
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
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
            className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm transition hover:border-brand-300 hover:text-brand-700"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-full border border-brand-500 bg-brand-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-brand-500"
          >
            Create account
          </Link>
        </div>
      )}
    </div>
  );
}
