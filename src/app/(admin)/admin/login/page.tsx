'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingWithHero } from '@/components/SalonHeroImage';

/** Admin login uses the same login page; redirect so one place handles all roles. */
export default function AdminLoginPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/login');
  }, [router]);
  return <LoadingWithHero />;
}
