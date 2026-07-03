"use client";

import { useTheme } from "next-themes";
import { useLocale } from "@/components/LocaleProvider";
import { useClientMounted } from "@/components/useClientMounted";
import { appendSyncParams } from "@/lib/sync-url";
import { isThemeMode, type ThemeMode } from "@/lib/theme-sync";

type ThemedExternalLinkProps = React.ComponentProps<"a"> & {
  href: string;
  fallbackTheme?: ThemeMode;
};

export default function ThemedExternalLink({
  href,
  fallbackTheme = "light",
  children,
  ...props
}: ThemedExternalLinkProps) {
  const { resolvedTheme } = useTheme();
  const { locale, mounted: localeMounted } = useLocale();
  const themeMounted = useClientMounted();

  const theme =
    themeMounted && isThemeMode(resolvedTheme) ? resolvedTheme : fallbackTheme;
  const syncedLocale = localeMounted ? locale : "en";
  let syncedHref = href || "#";

  if (themeMounted && localeMounted) {
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
