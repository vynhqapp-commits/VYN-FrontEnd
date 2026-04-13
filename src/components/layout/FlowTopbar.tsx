'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, CalendarDays, ReceiptText, ShoppingCart, Wallet } from 'lucide-react';

type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const TABS: Tab[] = [
  { href: '/dashboard/appointments', label: 'Calendar', icon: CalendarDays },
  { href: '/dashboard/pos', label: 'New Sale (POS)', icon: ShoppingCart },
  { href: '/dashboard/cash-drawer', label: 'Cash Drawer', icon: Wallet },
  { href: '/dashboard/invoices', label: 'Invoices', icon: ReceiptText },
  { href: '/dashboard/debt-aging', label: 'Debt', icon: AlertTriangle },
];

export default function FlowTopbar() {
  const pathname = usePathname();
  const [clock, setClock] = useState('--:--');

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const isActive = (href: string) => pathname === href;

  return (
    <div className="topbar mb-3 rounded-xl border border-[var(--elite-border)] bg-[var(--elite-surface)] px-3 py-2">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="brand text-sm font-semibold elite-title shrink-0">
        Elite<span className="text-[var(--elite-orange)]">Beauty</span>
          <span className="ml-2 hidden sm:inline text-[10px] elite-subtle">Main Branch</span>
        </div>

        <div className="ms-auto flex items-center gap-2 order-2 sm:order-none">
          <div className="hidden sm:block rounded-lg border border-[var(--elite-border)] bg-[var(--elite-card)] px-2 py-1 text-xs elite-subtle">
            Session Open
          </div>
          <div className="rounded-lg border border-[var(--elite-border)] bg-[var(--elite-card)] px-2 py-1 text-xs text-[var(--elite-teal)]">
            {clock}
          </div>
        </div>
      </div>

      <div className="mt-2 nav-tabs elite-scrollbar flex justify-center overflow-x-auto overflow-y-hidden [-webkit-overflow-scrolling:touch]">
        <div className="inline-flex min-w-max items-center gap-2 rounded-lg border border-[var(--elite-border)] bg-[var(--elite-card)] p-1 mx-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return isActive(tab.href) ? (
              <span
                key={tab.href}
                className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-md bg-[var(--elite-orange)] px-3 py-1 text-xs font-semibold text-white"
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {tab.label}
              </span>
            ) : (
              <Link
                key={tab.href}
                href={tab.href}
                className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-md px-3 py-1 text-xs elite-subtle transition-colors hover:text-[var(--elite-text)]"
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

