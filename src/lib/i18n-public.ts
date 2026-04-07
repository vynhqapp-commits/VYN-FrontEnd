import { publicTranslationsEn } from "./i18n-public/translations/en";
import { publicTranslationsAr } from "./i18n-public/translations/ar";
import { publicTranslationsFr } from "./i18n-public/translations/fr";

export type PublicLocale = "en" | "ar" | "fr";

export const supportedPublicLocales: PublicLocale[] = ["en", "ar", "fr"];
export const DEFAULT_PUBLIC_LOCALE: PublicLocale = "en";
const DEFAULT_PUBLIC_CURRENCY = "USD";

export function isSupportedPublicLocale(value: unknown): value is PublicLocale {
  return typeof value === "string" && (supportedPublicLocales as readonly string[]).includes(value);
}

/** For server components / middleware: coerce cookie or header value to a supported locale. */
export function parsePublicLocale(value: string | undefined | null): PublicLocale {
  return isSupportedPublicLocale(value) ? value : DEFAULT_PUBLIC_LOCALE;
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

/**
 * Maps our 2-letter UI locale to a full BCP 47 tag for Intl formatting.
 * "ar" alone produces Eastern Arabic numerals; "ar-u-nu-latn" forces Latin digits.
 */
const LOCALE_TO_BCP47: Record<PublicLocale, string> = {
  en: "en-US",
  ar: "ar-u-nu-latn", // Arabic script, Latin numerals — readable in mixed UIs
  fr: "fr-FR",
};

export function formatPublicCurrency(amount: number, currency: string | null | undefined, locale: PublicLocale) {
  const envDefault = (process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? "").trim().toUpperCase();
  const platformDefault = /^[A-Z]{3}$/.test(envDefault) ? envDefault : DEFAULT_PUBLIC_CURRENCY;

  const raw = (currency ?? "").trim().toUpperCase();
  const currencyCode = /^[A-Z]{3}$/.test(raw) ? raw : platformDefault;

  const bcp47 = LOCALE_TO_BCP47[locale] ?? "en-US";

  try {
    return new Intl.NumberFormat(bcp47, { style: "currency", currency: currencyCode }).format(amount);
  } catch {
    const numeric = new Intl.NumberFormat(bcp47, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    return `${currencyCode} ${numeric}`;
  }
}

