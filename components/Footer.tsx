"use client";

import ThemedExternalLink from "@/components/ThemedExternalLink";
import { useLocale } from "@/components/LocaleProvider";
import {
  BENJAMIN_LINKEDIN,
  TALENTX_URL,
  VICENTE_LINKEDIN,
} from "@/lib/constants";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

const linkClass =
  "inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700";

export default function Footer() {
  const { t } = useLocale();

  return (
    <footer className="relative z-10 mt-auto border-t border-zinc-200/80 bg-white/60 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="text-sm font-semibold tracking-tight text-zinc-900">
              ResumeX
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {t.footer.builtBy}
            </p>
            <ThemedExternalLink
              href={TALENTX_URL}
              theme="light"
              className="mt-2 inline-block text-sm text-zinc-500 transition hover:text-brand-600"
            >
              {t.footer.talentX}
            </ThemedExternalLink>
          </div>

          <div className="flex flex-col items-center gap-3 sm:items-end">
            <nav
              className="flex flex-wrap items-center justify-center gap-2 sm:justify-end"
              aria-label={t.footer.partnerLinksAria}
            >
              <a
                href={VICENTE_LINKEDIN}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
                aria-label={t.footer.vicenteLinkedInAria}
              >
                {t.footer.vicenteLinkedIn}
              </a>
              <a
                href={BENJAMIN_LINKEDIN}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
                aria-label={t.footer.benjaminLinkedInAria}
              >
                {t.footer.benjaminLinkedIn}
              </a>
            </nav>
            <a
              href="https://github.com/VicenteBarrientos"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t.footer.github}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
            >
              <GitHubIcon className="h-4 w-4" />
            </a>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400 sm:text-left">
          {t.footer.copyright}
        </p>
      </div>
    </footer>
  );
}
