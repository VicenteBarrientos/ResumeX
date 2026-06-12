import { isLocale, type Locale } from "@/lib/locale-sync";
import { appendThemeToUrl, isThemeMode, type ThemeMode } from "@/lib/theme-sync";

export function appendSyncParams(
  url: string,
  params: { theme: ThemeMode; locale: Locale },
) {
  let next = appendThemeToUrl(url, params.theme);
  const parsed = new URL(next);
  parsed.searchParams.set("lang", params.locale);
  return parsed.toString();
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
