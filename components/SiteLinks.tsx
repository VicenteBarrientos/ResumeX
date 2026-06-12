"use client";

import ThemedExternalLink from "@/components/ThemedExternalLink";
import { useLocale } from "@/components/LocaleProvider";
import { TALENTX_LINKEDIN, TALENTX_URL } from "@/lib/constants";

const linkClass =
  "inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-white/15 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-cyan-400/40 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-200";

export default function SiteLinks() {
  const { t } = useLocale();

  return (
    <nav
      className="flex max-w-[calc(100vw-8rem)] flex-wrap items-center gap-2 sm:max-w-none"
      aria-label={t.nav.siteLinksAria}
    >
      <ThemedExternalLink href={TALENTX_URL} fallbackTheme="light" className={linkClass}>
        {t.nav.talentX}
      </ThemedExternalLink>
      <a
        href={TALENTX_LINKEDIN}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
        aria-label={t.nav.talentXLinkedInAria}
      >
        {t.nav.talentXLinkedIn}
      </a>
    </nav>
  );
}
