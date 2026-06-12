"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { appendThemeToUrl, isThemeMode, type ThemeMode } from "@/lib/theme-sync";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const theme =
    mounted && isThemeMode(resolvedTheme) ? resolvedTheme : fallbackTheme;

  return (
    <a href={appendThemeToUrl(href, theme)} {...props}>
      {children}
    </a>
  );
}
