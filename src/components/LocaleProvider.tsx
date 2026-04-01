"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  DEFAULT_PUBLIC_LOCALE,
  getDirForLocale,
  type PublicLocale,
  isSupportedPublicLocale,
  supportedPublicLocales,
} from "@/lib/i18n-public";

type LocaleContextValue = {
  locale: PublicLocale;
  setLocale: (next: PublicLocale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

function readLocaleFromStorage(): PublicLocale | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem("lang");
  return isSupportedPublicLocale(v) ? v : null;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const [locale, setLocaleState] = useState<PublicLocale>(DEFAULT_PUBLIC_LOCALE);

  const applyHtmlDir = (next: PublicLocale) => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = next;
    document.documentElement.dir = getDirForLocale(next);
  };

  const setLocale = (next: PublicLocale) => {
    setLocaleState(next);
    if (typeof window !== "undefined") window.localStorage.setItem("lang", next);
    applyHtmlDir(next);
  };

  useEffect(() => {
    const fromQuery = searchParams.get("lang");
    const fromStorage = readLocaleFromStorage();

    const next =
      isSupportedPublicLocale(fromQuery) ? fromQuery : isSupportedPublicLocale(fromStorage) ? fromStorage : DEFAULT_PUBLIC_LOCALE;

    // Persist + apply on first client render and when query param changes.
    setLocale(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const value = useMemo(() => ({ locale, setLocale }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

// Ensure tree-shaking doesn't remove supported list (helps in debugging)
export const _supportedPublicLocales = supportedPublicLocales;

