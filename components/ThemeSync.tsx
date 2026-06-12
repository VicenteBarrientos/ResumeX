"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";
import {
  getThemeFromSearch,
  isThemeMode,
  syncThemeToCookie,
  syncThemeToUrl,
} from "@/lib/theme-sync";

export default function ThemeSync() {
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    const fromUrl = getThemeFromSearch(window.location.search);
    if (fromUrl) {
      setTheme(fromUrl);
    }
  }, [setTheme]);

  useEffect(() => {
    if (!resolvedTheme || !isThemeMode(resolvedTheme)) {
      return;
    }

    syncThemeToUrl(resolvedTheme);
    syncThemeToCookie(resolvedTheme);
  }, [resolvedTheme]);

  return null;
}
