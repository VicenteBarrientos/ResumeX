"use client";

import { useEffect } from "react";
import { getLocaleFromSearch } from "@/lib/locale-sync";
import { useLocale } from "@/components/LocaleProvider";

export default function LocaleSync() {
  const { locale, setLocale } = useLocale();

  useEffect(() => {
    const fromUrl = getLocaleFromSearch(window.location.search);
    if (fromUrl && fromUrl !== locale) {
      setLocale(fromUrl);
    }
  }, [locale, setLocale]);

  return null;
}
