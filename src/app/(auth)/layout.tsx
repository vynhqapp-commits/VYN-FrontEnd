'use client';

import { Suspense } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { LocaleProvider } from '@/components/LocaleProvider';
import { ThemeToggle } from '@/lib/auth-context';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const inner = (
    <Suspense>
      <LocaleProvider>
        <div className="fixed top-3 start-3 z-50">
          <ThemeToggle className="border-[var(--elite-border)] bg-[var(--elite-card)]/90 shadow-sm" />
        </div>
        {children}
      </LocaleProvider>
    </Suspense>
  );

  if (!GOOGLE_CLIENT_ID) return inner;

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {inner}
    </GoogleOAuthProvider>
  );
}
