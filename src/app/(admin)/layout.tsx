'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getRedirectForRole } from '@/lib/role-redirect';
import { LoadingWithHero } from '@/components/SalonHeroImage';
import { APP_NAME } from '@/lib/app-name';
import { AppShell, type ShellNavGroup, type ShellNavItem } from '@/components/layout/AppShell';
import { CommandPalette } from '@/components/command/CommandPalette';
import {
  Building2,
  CreditCard,
  FileText,
  Globe,
  KeyRound,
  LayoutDashboard,
  ListChecks,
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [cmdOpen, setCmdOpen] = useState(false);

  const adminItems: ShellNavItem[] = useMemo(
    () => [
      { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="size-5" /> },
      { href: '/admin/tenants', label: 'Tenants', icon: <Building2 className="size-5" /> },
      { href: '/admin/roles', label: 'Roles & permissions', icon: <KeyRound className="size-5" /> },
      { href: '/admin/subscriptions', label: 'Subscriptions', icon: <CreditCard className="size-5" /> },
      { href: '/admin/reports', label: 'Global reports', icon: <FileText className="size-5" /> },
      { href: '/admin/audit', label: 'Audit logs', icon: <ListChecks className="size-5" /> },
      { href: '/admin/franchise', label: 'Franchise KPIs', icon: <Globe className="size-5" /> },
    ],
    [],
  );

  const nav: ShellNavGroup[] = useMemo(
    () => [{ id: 'admin', label: 'Platform', items: adminItems }],
    [adminItems],
  );

  const cmdItems = useMemo(
    () => adminItems.map((i) => ({ label: i.label, href: i.href })),
    [adminItems],
  );

  const isLoginPage = pathname === '/admin/login';
  useEffect(() => {
    if (loading || isLoginPage) return;
    if (!user) {
      router.replace('/admin/login');
      return;
    }
    if (user.role !== 'super_admin') {
      router.replace(getRedirectForRole(user.role));
      return;
    }
  }, [user, loading, router, isLoginPage]);

  if (isLoginPage) return <>{children}</>;
  if (loading || !user || user.role !== 'super_admin') return <LoadingWithHero />;

  return (
    <AppShell
      brand={`${APP_NAME} Admin`}
      userLabel={user.email}
      nav={nav}
      profileHref="/admin/profile"
      onLogout={() => {
        logout();
        router.push('/');
      }}
      onOpenCommandPalette={() => setCmdOpen(true)}
    >
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} items={cmdItems} />
      {children}
    </AppShell>
  );
}
