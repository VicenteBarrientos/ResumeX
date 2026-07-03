import { isLocale, type Locale } from "@/lib/locale-sync";
import { appendThemeToUrl, isThemeMode, type ThemeMode } from "@/lib/theme-sync";

export function appendSyncParams(
  url: string,
  params: { theme: ThemeMode; locale: Locale },
) {
  const next = appendThemeToUrl(url, params.theme);
  const trimmed = next.trim();
  if (!trimmed) {
    return next;
  }

  const hashIndex = next.indexOf("#");
  const beforeHash = hashIndex >= 0 ? next.slice(0, hashIndex) : next;
  const hash = hashIndex >= 0 ? next.slice(hashIndex) : "";
  const separator = beforeHash.includes("?") ? "&" : "?";
  return `${beforeHash}${separator}lang=${encodeURIComponent(params.locale)}${hash}`;
}

export function resolveSyncParams(
  theme: string | undefined,
  locale: string | undefined,
  fallbacks: { theme: ThemeMode; locale: Locale },
) {
  return {
    theme: isThemeMode(theme) ? theme : fallbacks.theme,
    locale: isLocale(locale) ? locale : fallbacks.locale,
  };
}
