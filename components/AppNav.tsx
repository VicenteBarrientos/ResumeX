"use client";

import Link from "next/link";
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

  const links = [
    { href: "/", label: t.nav.cvFormatter },
    { href: "/analyzer", label: t.nav.analyzer },
    { href: "/autoapply", label: "AutoApply" },
  ];

  return (
    <nav className="flex items-center gap-2" aria-label={t.nav.appNavAria}>
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
  );
}
