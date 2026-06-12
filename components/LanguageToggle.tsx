"use client";

import { useLocale } from "@/components/LocaleProvider";

const buttonClass =
  "inline-flex min-w-[2.25rem] items-center justify-center px-2 py-1 text-xs font-semibold transition";

export default function LanguageToggle() {
  const { locale, setLocale, t, mounted } = useLocale();

  return (
    <div
      className="inline-flex h-9 items-center rounded-full border border-zinc-200 bg-white p-1 text-zinc-600 shadow-sm dark:border-white/15 dark:bg-white/5 dark:text-zinc-300"
      role="group"
      aria-label={locale === "en" ? t.nav.language.switchToSpanish : t.nav.language.switchToEnglish}
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        className={`${buttonClass} rounded-full ${
          mounted && locale === "en"
            ? "bg-indigo-600 text-white dark:bg-cyan-400 dark:text-[#050816]"
            : "hover:text-indigo-700 dark:hover:text-cyan-200"
        }`}
      >
        {t.nav.language.english}
      </button>
      <button
        type="button"
        onClick={() => setLocale("es")}
        aria-pressed={locale === "es"}
        className={`${buttonClass} rounded-full ${
          mounted && locale === "es"
            ? "bg-indigo-600 text-white dark:bg-cyan-400 dark:text-[#050816]"
            : "hover:text-indigo-700 dark:hover:text-cyan-200"
        }`}
      >
        {t.nav.language.spanish}
      </button>
    </div>
  );
}
