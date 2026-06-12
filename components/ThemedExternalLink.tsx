"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
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
  const [themeMounted, setThemeMounted] = useState(false);

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  const theme =
    themeMounted && isThemeMode(resolvedTheme) ? resolvedTheme : fallbackTheme;
  const syncedLocale = localeMounted ? locale : "en";

  return (
    <a
      href={appendSyncParams(href, { theme, locale: syncedLocale })}
      {...props}
    >
      {children}
    </a>
  );
}
