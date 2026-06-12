export const LOCALE_STORAGE_KEY = "talentx-locale";
export const LOCALE_PARAM = "lang";
export const LOCALE_COOKIE = "talentx-locale";

export type Locale = "en" | "es";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "es";
}

export function getLocaleFromSearch(search: string): Locale | null {
  const value = new URLSearchParams(search).get(LOCALE_PARAM);
  return isLocale(value) ? value : null;
}

export function syncLocaleToUrl(locale: Locale) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  if (url.searchParams.get(LOCALE_PARAM) === locale) {
    return;
  }

  url.searchParams.set(LOCALE_PARAM, locale);
  window.history.replaceState({}, "", url.toString());
}

export function syncLocaleToCookie(locale: Locale) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export const localeInitScript = `(function(){try{var l=null,p=new URLSearchParams(window.location.search);l=p.get("${LOCALE_PARAM}");if(l!=="en"&&l!=="es"){var m=document.cookie.match(/(?:^|; )${LOCALE_COOKIE}=([^;]*)/);if(m)l=decodeURIComponent(m[1]);}if(l!=="en"&&l!=="es")l=localStorage.getItem("${LOCALE_STORAGE_KEY}");if(l==="en"||l==="es"){localStorage.setItem("${LOCALE_STORAGE_KEY}",l);document.documentElement.lang=l;}}catch(e){}})();`;
