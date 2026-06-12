export const THEME_STORAGE_KEY = "talentx-theme";
export const THEME_PARAM = "theme";
export const THEME_COOKIE = "talentx-theme";

export type ThemeMode = "light" | "dark";

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return value === "light" || value === "dark";
}

export function getThemeFromSearch(search: string): ThemeMode | null {
  const value = new URLSearchParams(search).get(THEME_PARAM);
  return isThemeMode(value) ? value : null;
}

export function appendThemeToUrl(url: string, theme: ThemeMode): string {
  const parsed = new URL(url);
  parsed.searchParams.set(THEME_PARAM, theme);
  return parsed.toString();
}

export function syncThemeToUrl(theme: ThemeMode) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  if (url.searchParams.get(THEME_PARAM) === theme) {
    return;
  }

  url.searchParams.set(THEME_PARAM, theme);
  window.history.replaceState({}, "", url.toString());
}

export function syncThemeToCookie(theme: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export const themeInitScript = `(function(){try{var t=null,p=new URLSearchParams(window.location.search);t=p.get("${THEME_PARAM}");if(t!=="light"&&t!=="dark"){var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);if(m)t=decodeURIComponent(m[1]);}if(t!=="light"&&t!=="dark")t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark"){localStorage.setItem("${THEME_STORAGE_KEY}",t);document.documentElement.classList.toggle("dark",t==="dark");}}catch(e){}})();`;
