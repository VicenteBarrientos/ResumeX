"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/LocaleProvider";

export default function AppNav() {
  const { t } = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const links = [
    { href: "/cv", label: t.nav.cvFormatter },
    { href: "/analyzer", label: t.nav.analyzer },
    { href: "/jobs", label: "Job Search" },
    { href: "/cover-letter", label: "Cover Letter" },
    { href: "/autoapply", label: "AutoApply" },
    { href: "/tracker", label: "Tracker" },
  ];

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className="relative flex items-center gap-3">
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

      {/* Dropdown */}
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
  );
}
