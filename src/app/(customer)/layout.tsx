'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getRedirectForRole } from '@/lib/role-redirect';
import { LoadingWithHero } from '@/components/SalonHeroImage';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'customer') {
      router.replace(getRedirectForRole(user.role));
      return;
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'customer') return <LoadingWithHero />;

  return (
    <div className="min-h-screen flex flex-col bg-salon-cream">
      <header className="bg-white/80 backdrop-blur-sm border-b border-salon-sand/60 px-4 py-3 flex items-center justify-between">
        <nav className="flex gap-6">
          <Link
            href="/my-bookings"
            className={`font-medium text-sm transition-colors ${pathname === '/my-bookings' ? 'text-salon-gold' : 'text-salon-stone hover:text-salon-espresso'}`}
          >
            My Bookings
          </Link>
          <Link
            href="/book"
            className="text-sm font-medium text-salon-stone hover:text-salon-espresso transition-colors"
          >
            Book a visit
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-sm text-salon-stone">{user.email}</span>
          <button
            onClick={() => { logout(); router.push('/'); }}
            className="text-sm text-salon-stone hover:text-salon-espresso transition-colors"
          >
            Log out
          </button>
        </div>
      </header>
      <main className="flex-1 p-6 bg-salon-cream text-salon-espresso">{children}</main>
    </div>
  );
}
