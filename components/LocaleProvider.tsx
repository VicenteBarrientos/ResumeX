"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getResumeXMessages, type ResumeXMessages } from "@/lib/i18n/resumex";
import {
  getLocaleFromSearch,
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

export default function LocaleProvider({
  children,
  defaultLocale = "en",
}: {
  children: ReactNode;
  defaultLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const fromUrl = getLocaleFromSearch(window.location.search);
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    const initial = fromUrl ?? (isLocale(stored) ? stored : defaultLocale);
    setLocaleState(initial);
    document.documentElement.lang = initial;
    setMounted(true);
  }, [defaultLocale]);

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    document.documentElement.lang = nextLocale;
    syncLocaleToCookie(nextLocale);
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
