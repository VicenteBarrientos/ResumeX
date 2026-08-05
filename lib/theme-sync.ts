/**
 * ResumeX renders dark only — there is no in-app theme switch. What remains here
 * is the outbound contract: links to the TalentX site carry a `theme` param so
 * that site can honor it.
 */
export const THEME_PARAM = "theme";

export type ThemeMode = "light" | "dark";

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return value === "light" || value === "dark";
}

export function appendThemeToUrl(url: string, theme: ThemeMode): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return url;
  }

  const hashIndex = url.indexOf("#");
  const beforeHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : "";
  const separator = beforeHash.includes("?") ? "&" : "?";
  return `${beforeHash}${separator}${THEME_PARAM}=${encodeURIComponent(theme)}${hash}`;
}
