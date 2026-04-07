import type { PublicLocale } from "@/lib/i18n-public";
import type { AppRole } from "@/lib/role-redirect";
import { dashboardTranslationsEn } from "./translations/en";
import { dashboardTranslationsAr } from "./translations/ar";
import { dashboardTranslationsFr } from "./translations/fr";

const translations = {
  en: dashboardTranslationsEn,
  ar: dashboardTranslationsAr,
  fr: dashboardTranslationsFr,
} as const;

export type DashboardI18nKey = keyof typeof dashboardTranslationsEn;

const hrefToKey: Partial<Record<string, DashboardI18nKey>> = {
  "/dashboard": "navDashboard",
  "/dashboard/appointments": "navCalendar",
  "/dashboard/clients": "navClients",
  "/dashboard/staff": "navStaff",
  "/dashboard/locations": "navLocations",
  "/dashboard/services": "navServices",
  "/dashboard/products": "navProducts",
  "/dashboard/inventory": "navInventory",
  "/dashboard/transactions": "navPosSales",
  "/dashboard/pos": "navNewSalePos",
  "/dashboard/invoices": "navInvoices",
  "/dashboard/cash-drawer": "navCashDrawer",
  "/dashboard/debt-aging": "navDebtAging",
  "/dashboard/commission": "navCommission",
  "/dashboard/gift-cards": "navGiftCards",
  "/dashboard/expenses": "navExpenses",
  "/dashboard/ledger": "navLedger",
  "/dashboard/reports": "navReports",
  "/dashboard/franchise": "navFranchise",
  "/dashboard/profile": "navSalonSettings",
};

export function getDashboardT(locale: PublicLocale) {
  return (key: DashboardI18nKey): string => {
    const dict = translations[locale] ?? translations.en;
    return (dict as Record<string, string>)[key] ?? (translations.en as Record<string, string>)[key] ?? key;
  };
}

/** Resolves a sidebar label for the current role (staff uses different keys for calendar & commission). */
export function dashboardNavLabel(
  href: string,
  role: AppRole,
  t: (key: DashboardI18nKey) => string,
  fallback: string,
): string {
  if (role === "staff" && href === "/dashboard/appointments") return t("navMyCalendar");
  if (role === "staff" && href === "/dashboard/commission") return t("navMyEarnings");
  const key = hrefToKey[href];
  return key ? t(key) : fallback;
}
