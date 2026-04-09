'use client';

import { Suspense } from 'react';
import { LocaleProvider } from '@/components/LocaleProvider';
import { ThemeToggle } from '@/lib/auth-context';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <LocaleProvider>
        <div className="fixed top-3 start-3 z-50">
          <ThemeToggle className="border-[var(--elite-border)] bg-[var(--elite-card)]/90 shadow-sm" />
        </div>
        {children}
      </LocaleProvider>
    </Suspense>
  );
}
