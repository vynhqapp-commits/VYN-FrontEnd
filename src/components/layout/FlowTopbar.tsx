'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

type Tab = {
  href: string;
  label: string;
  icon: string;
};

const TABS: Tab[] = [
  { href: '/dashboard/appointments', label: 'Calendar', icon: '📅' },
  { href: '/dashboard/pos', label: 'New Sale (POS)', icon: '🛒' },
  { href: '/dashboard/cash-drawer', label: 'Cash Drawer', icon: '💰' },
  { href: '/dashboard/invoices', label: 'Invoices', icon: '🧾' },
  { href: '/dashboard/debt-aging', label: 'Debt', icon: '⚠️' },
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
    <div className="topbar mb-3 flex items-center justify-between rounded-xl border border-[var(--elite-border)] bg-[var(--elite-surface)] px-3 py-2">
      <div className="brand text-sm font-semibold elite-title">
        Elite<span className="text-[var(--elite-orange)]">Beauty</span>
        <span className="ml-2 text-[10px] elite-subtle">Main Branch</span>
      </div>

      <div className="nav-tabs flex items-center gap-2 rounded-lg border border-[var(--elite-border)] bg-[var(--elite-card)] p-1">
        {TABS.map((tab) =>
          isActive(tab.href) ? (
            <span
              key={tab.href}
              className="rounded-md bg-[var(--elite-orange)] px-3 py-1 text-xs font-semibold text-white"
            >
              {tab.icon} {tab.label}
            </span>
          ) : (
            <Link
              key={tab.href}
              href={tab.href}
              className="rounded-md px-3 py-1 text-xs elite-subtle transition-colors hover:text-[var(--elite-text)]"
            >
              {tab.icon} {tab.label}
            </Link>
          )
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="rounded-lg border border-[var(--elite-border)] bg-[var(--elite-card)] px-2 py-1 text-xs elite-subtle">
          Session Open
        </div>
        <div className="rounded-lg border border-[var(--elite-border)] bg-[var(--elite-card)] px-2 py-1 text-xs text-[var(--elite-teal)]">
          {clock}
        </div>
      </div>
    </div>
  );
}

