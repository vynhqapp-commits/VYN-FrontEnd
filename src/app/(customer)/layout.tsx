'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getRedirectForRole } from '@/lib/role-redirect';
import { LoadingWithHero } from '@/components/SalonHeroImage';
import PublicHeader from '@/components/layout/PublicHeader';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

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
    <div className="min-h-screen flex flex-col bg-[#F9FAFB]">
      <PublicHeader />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 text-salon-espresso">
        {children}
      </main>
    </div>
  );
}
