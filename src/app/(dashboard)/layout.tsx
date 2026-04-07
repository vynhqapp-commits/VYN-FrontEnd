"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getRedirectForRole, type AppRole } from "@/lib/role-redirect";
import { isRouteAllowed, menuByRole } from "@/lib/rbac";
import { LoadingWithHero } from "@/components/SalonHeroImage";
import { APP_NAME } from "@/lib/app-name";
import { AppShell, type ShellNavItem } from "@/components/layout/AppShell";
import { CommandPalette } from "@/components/command/CommandPalette";
import { LocaleProvider, useLocale } from "@/components/LocaleProvider";
import { dashboardNavLabel, getDashboardT } from "@/lib/i18n-dashboard";
import {
  BarChart3,
  BookText,
  Boxes,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  Gift,
  MapPin,
  Package,
  Receipt,
  Settings2,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [cmdOpen, setCmdOpen] = useState(false);
  const { locale } = useLocale();
  const td = getDashboardT(locale);

  const roleCandidate = (user?.role as AppRole | undefined) ?? undefined;
  const nav: ShellNavItem[] = useMemo(() => {
    if (!roleCandidate) return [];
    return menuByRole[roleCandidate].map((i) => ({
      href: i.href,
      label: dashboardNavLabel(i.href, roleCandidate, td, i.label),
      icon:
        i.href === "/dashboard" ? (
          <BarChart3 className="size-5" />
        ) : i.href === "/dashboard/appointments" ? (
          <CalendarDays className="size-5" />
        ) : i.href === "/dashboard/clients" ? (
          <Users className="size-5" />
        ) : i.href === "/dashboard/staff" ? (
          <UserCog className="size-5" />
        ) : i.href === "/dashboard/locations" ? (
          <MapPin className="size-5" />
        ) : i.href === "/dashboard/services" ? (
          <Settings2 className="size-5" />
        ) : i.href === "/dashboard/products" ? (
          <Package className="size-5" />
        ) : i.href === "/dashboard/inventory" ? (
          <Boxes className="size-5" />
        ) : i.href === "/dashboard/transactions" ? (
          <Receipt className="size-5" />
        ) : i.href === "/dashboard/pos" ? (
          <CreditCard className="size-5" />
        ) : i.href === "/dashboard/invoices" ? (
          <FileText className="size-5" />
        ) : i.href === "/dashboard/cash-drawer" ? (
          <Wallet className="size-5" />
        ) : i.href === "/dashboard/debt-aging" ? (
          <BriefcaseBusiness className="size-5" />
        ) : i.href === "/dashboard/commission" ? (
          <BarChart3 className="size-5" />
        ) : i.href === "/dashboard/gift-cards" ? (
          <Gift className="size-5" />
        ) : i.href === "/dashboard/expenses" ? (
          <Receipt className="size-5" />
        ) : i.href === "/dashboard/ledger" ? (
          <BookText className="size-5" />
        ) : i.href === "/dashboard/reports" ? (
          <BarChart3 className="size-5" />
        ) : i.href === "/dashboard/franchise" ? (
          <BriefcaseBusiness className="size-5" />
        ) : i.href === "/dashboard/profile" ? (
          <Building2 className="size-5" />
        ) : null,
    }));
  }, [roleCandidate, locale]);
  const cmdItems = useMemo(
    () =>
      nav.map((i) => ({
        label: i.label,
        href: i.href,
      })),
    [nav],
  );

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role === "super_admin") {
      router.replace("/admin");
      return;
    }
    if (user.role === "customer") {
      router.replace("/my-bookings");
      return;
    }
    if (!isRouteAllowed(user.role, pathname)) {
      router.replace(getRedirectForRole(user.role));
      return;
    }
  }, [user, loading, router, pathname]);

  const salonRoles = ["salon_owner", "manager", "receptionist", "staff"];
  if (loading || !user || !salonRoles.includes(user.role))
    return <LoadingWithHero />;

  return (
    <AppShell
      brand={APP_NAME}
      userLabel={user.email}
      nav={nav}
      profileHref="/dashboard/profile"
      onLogout={() => {
        logout();
        router.push("/");
      }}
      onOpenCommandPalette={() => setCmdOpen(true)}
    >
      <CommandPalette
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        items={cmdItems}
      />
      {children}
    </AppShell>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingWithHero />}>
      <LocaleProvider>
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
      </LocaleProvider>
    </Suspense>
  );
}
