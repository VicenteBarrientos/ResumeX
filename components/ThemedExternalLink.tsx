"use client";

import { useLocale } from "@/components/LocaleProvider";
import { appendSyncParams } from "@/lib/sync-url";
import { type ThemeMode } from "@/lib/theme-sync";

type ThemedExternalLinkProps = React.ComponentProps<"a"> & {
  href: string;
  /** Theme handed to the destination site. ResumeX itself is dark-only. */
  theme?: ThemeMode;
};

export default function ThemedExternalLink({
  href,
  theme = "light",
  children,
  ...props
}: ThemedExternalLinkProps) {
  const { locale, mounted: localeMounted } = useLocale();

  const syncedLocale = localeMounted ? locale : "en";
  let syncedHref = href || "#";

  if (localeMounted) {
    try {
      syncedHref = appendSyncParams(href, { theme, locale: syncedLocale }) || syncedHref;
    } catch {
      syncedHref = href || "#";
    }
  }

  return (
    <a
      href={syncedHref}
      {...props}
    >
      {children}
    </a>
  );
}
