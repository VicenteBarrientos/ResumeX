"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";
import { isThemeMode, syncThemeToCookie } from "@/lib/theme-sync";

export default function ThemeSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme || !isThemeMode(resolvedTheme)) {
      return;
    }

    syncThemeToCookie(resolvedTheme);
  }, [resolvedTheme]);

  return null;
}
