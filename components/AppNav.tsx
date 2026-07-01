"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/LocaleProvider";

const baseClass =
  "inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition";

const inactiveClass =
  "border-zinc-200 bg-white text-zinc-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-white/15 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-cyan-400/40 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-200";

const activeClass =
  "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-cyan-400/40 dark:bg-cyan-400/10 dark:text-cyan-200";

export default function AppNav() {
  const { t } = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/cv", label: t.nav.cvFormatter },
    { href: "/analyzer", label: t.nav.analyzer },
    { href: "/jobs", label: "Jobs" },
    { href: "/cover-letter", label: "Cover Letter" },
    { href: "/autoapply", label: "AutoApply" },
    { href: "/tracker", label: "Tracker" },
  ];

  const activeLink = links.find((l) => l.href === pathname);

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden items-center gap-2 sm:flex" aria-label={t.nav.appNavAria}>
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={`${baseClass} ${isActive ? activeClass : inactiveClass}`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile nav — hamburger */}
      <div className="relative sm:hidden">
        <button
          onClick={() => setOpen((o) => !o)}
          className={`${baseClass} ${inactiveClass} gap-1.5`}
          aria-label="Menu"
        >
          <span className="text-xs">{activeLink?.label ?? "Menu"}</span>
          <span className="text-zinc-400">▾</span>
        </button>

        {open && (
          <div className="absolute left-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg dark:border-white/10 dark:bg-zinc-900">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-2.5 text-sm transition ${
                    isActive
                      ? "bg-indigo-50 font-semibold text-indigo-700 dark:bg-cyan-400/10 dark:text-cyan-200"
                      : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
