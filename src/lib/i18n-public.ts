import { publicTranslationsEn } from "./i18n-public/translations/en";
import { publicTranslationsAr } from "./i18n-public/translations/ar";
import { publicTranslationsFr } from "./i18n-public/translations/fr";

export type PublicLocale = "en" | "ar" | "fr";

export const supportedPublicLocales: PublicLocale[] = ["en", "ar", "fr"];
export const DEFAULT_PUBLIC_LOCALE: PublicLocale = "en";

export function isSupportedPublicLocale(value: unknown): value is PublicLocale {
  return typeof value === "string" && (supportedPublicLocales as readonly string[]).includes(value);
}

export function getDirForLocale(locale: PublicLocale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

const translations = {
  en: publicTranslationsEn,
  ar: publicTranslationsAr,
  fr: publicTranslationsFr,
} as const;

export type PublicI18nKey = keyof typeof translations.en;

export function getPublicT(locale: PublicLocale) {
  return (key: PublicI18nKey): string => {
    const dict = translations[locale] ?? translations.en;
    return (dict as Record<string, string>)[key] ?? (translations.en as Record<string, string>)[key] ?? key;
  };
}

export function formatPublicCurrency(amount: number, currency: string | null | undefined, locale: PublicLocale) {
  const currencyCode = currency && currency.trim() !== "" ? currency : "USD";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: currencyCode }).format(amount);
  } catch {
    // Fallback: numeric formatting without currency
    return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  }
}

