'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { LocaleProvider } from '@/components/LocaleProvider';
import { useAuth, ThemeToggle } from '@/lib/auth-context';
import { getRedirectForRole } from '@/lib/role-redirect';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace(getRedirectForRole(user.role));
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--elite-bg)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

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
