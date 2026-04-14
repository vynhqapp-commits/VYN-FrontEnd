"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getRedirectForRole, type AppRole } from "@/lib/role-redirect";
import {
  getFilteredSidebarGroups,
  isRouteAllowed,
  menuByRole,
} from "@/lib/rbac";
import { LoadingWithHero } from "@/components/SalonHeroImage";
import { APP_NAME } from "@/lib/app-name";
import {
  AppShell,
  type ShellNavGroup,
  type ShellNavItem,
} from "@/components/layout/AppShell";
import { CommandPalette } from "@/components/command/CommandPalette";
import { LocaleProvider, useLocale } from "@/components/LocaleProvider";
import {
  dashboardGroupLabel,
  dashboardNavLabel,
  getDashboardT,
} from "@/lib/i18n-dashboard";
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

function iconForHref(href: string): React.ReactNode {
  if (href === "/dashboard") return <BarChart3 className="size-5" />;
  if (href === "/dashboard/appointments")
    return <CalendarDays className="size-5" />;
  if (href === "/dashboard/clients") return <Users className="size-5" />;
  if (href === "/dashboard/staff") return <UserCog className="size-5" />;
  if (href === "/dashboard/locations") return <MapPin className="size-5" />;
  if (href === "/dashboard/services") return <Settings2 className="size-5" />;
  if (href === "/dashboard/products") return <Package className="size-5" />;
  if (href === "/dashboard/inventory") return <Boxes className="size-5" />;
  if (href === "/dashboard/transactions") return <Receipt className="size-5" />;
  if (href === "/dashboard/pos") return <CreditCard className="size-5" />;
  if (href === "/dashboard/invoices") return <FileText className="size-5" />;
  if (href === "/dashboard/cash-drawer") return <Wallet className="size-5" />;
  if (href === "/dashboard/debt-aging")
    return <BriefcaseBusiness className="size-5" />;
  if (href === "/dashboard/commission") return <BarChart3 className="size-5" />;
  if (href === "/dashboard/gift-cards") return <Gift className="size-5" />;
  if (href === "/dashboard/expenses") return <Receipt className="size-5" />;
  if (href === "/dashboard/ledger") return <BookText className="size-5" />;
  if (href === "/dashboard/reports") return <BarChart3 className="size-5" />;
  if (href === "/dashboard/franchise")
    return <BriefcaseBusiness className="size-5" />;
  if (href === "/dashboard/profile") return <Building2 className="size-5" />;
  return null;
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [cmdOpen, setCmdOpen] = useState(false);
  const { locale } = useLocale();
  const td = getDashboardT(locale);

  const roleCandidate = (user?.role as AppRole | undefined) ?? undefined;
  const perms = user?.permissions;

  const nav: ShellNavGroup[] = useMemo(() => {
    if (!roleCandidate) return [];

    const mapItem = (i: { href: string; label: string }): ShellNavItem => ({
      href: i.href,
      label: dashboardNavLabel(i.href, roleCandidate, td, i.label),
      icon: iconForHref(i.href),
    });

    if (perms && perms.length > 0) {
      return getFilteredSidebarGroups(perms, roleCandidate).map((g) => ({
        id: g.id,
        label: dashboardGroupLabel(g.id, td, g.categoryLabel),
        items: g.items.map(mapItem),
      }));
    }

    const baseMenu = menuByRole[roleCandidate] ?? [];
    return [
      {
        id: "menu",
        label: dashboardGroupLabel("menu", td, "Menu"),
        items: baseMenu.map(mapItem),
      },
    ];
  }, [roleCandidate, perms, td, locale]);

  const cmdItems = useMemo(
    () =>
      nav.flatMap((g) =>
        g.items.map((i) => ({
          label: i.label,
          href: i.href,
        })),
      ),
    [nav],
  );

  const salonRoles = ["salon_owner", "manager", "receptionist", "staff"];

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
    if (!salonRoles.includes(user.role)) {
      router.replace("/login");
      return;
    }
    if (
      !isRouteAllowed(user.role, pathname, user.permissions ?? undefined)
    ) {
      router.replace(getRedirectForRole(user.role));
      return;
    }
  }, [user, loading, router, pathname]);

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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<LoadingWithHero />}>
      <LocaleProvider>
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
      </LocaleProvider>
    </Suspense>
  );
}
