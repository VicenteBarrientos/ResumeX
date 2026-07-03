"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { getResumeXMessages, type ResumeXMessages } from "@/lib/i18n/resumex";
import {
  isLocale,
  LOCALE_STORAGE_KEY,
  syncLocaleToCookie,
  type Locale,
} from "@/lib/locale-sync";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: ResumeXMessages;
  mounted: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const localeChangedEvent = "resumex:locale_changed";

function subscribeToLocale(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(localeChangedEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(localeChangedEvent, callback);
  };
}

function subscribeToMounted() {
  return () => {};
}

function getStoredLocale(defaultLocale: Locale) {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  return isLocale(stored) ? stored : defaultLocale;
}

export default function LocaleProvider({
  children,
  defaultLocale = "en",
}: {
  children: ReactNode;
  defaultLocale?: Locale;
}) {
  const locale = useSyncExternalStore(
    subscribeToLocale,
    () => getStoredLocale(defaultLocale),
    () => defaultLocale,
  );
  const mounted = useSyncExternalStore(subscribeToMounted, () => true, () => false);

  useEffect(() => {
    document.documentElement.lang = locale;
    syncLocaleToCookie(locale);
  }, [locale]);

  const setLocale = (nextLocale: Locale) => {
    localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    document.documentElement.lang = nextLocale;
    syncLocaleToCookie(nextLocale);
    window.dispatchEvent(new Event(localeChangedEvent));
  };

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: getResumeXMessages(locale),
      mounted,
    }),
    [locale, mounted],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return context;
}
