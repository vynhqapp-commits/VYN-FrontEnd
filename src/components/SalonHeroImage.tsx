'use client';

import Image from 'next/image';
import { useState } from 'react';
import { APP_FULL_NAME, BANNER_IMAGE } from '@/lib/app-name';

type SalonHeroImageProps = {
  className?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
};

export function SalonHeroImage({ className = '', priority, fill, sizes = '(max-width: 768px) 100vw, 50vw' }: SalonHeroImageProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={`rounded-2xl bg-gradient-to-br from-[#d5e8e4] via-salon-cream to-salon-sand dark:from-slate-800 dark:via-slate-900 dark:to-black flex items-center justify-center min-h-[200px] ${className}`}>
        <span className="font-display text-salon-espresso dark:text-white text-lg font-semibold text-center px-4">{APP_FULL_NAME}</span>
      </div>
    );
  }

  if (fill) {
    return (
      <div className={`absolute inset-0 overflow-hidden ${className}`}>
        <Image
          src={BANNER_IMAGE}
          alt={APP_FULL_NAME}
          fill
          className="object-cover"
          priority={priority}
          sizes={sizes}
          onError={() => setError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      <Image
        src={BANNER_IMAGE}
        alt={`${APP_FULL_NAME} — Easy Booking & CRM, Integrated POS & Payments, Full ERP & Analytics`}
        width={800}
        height={500}
        className="object-cover w-full h-auto"
        priority={priority}
        sizes={sizes}
        onError={() => setError(true)}
      />
    </div>
  );
}

/** Full-screen loader (no banner). Used on refresh and while auth/layout is loading. */
export function LoadingWithHero() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-salon-cream dark:bg-background p-6">
      <div className="flex flex-col items-center gap-8">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-border" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-salon-gold border-r-salon-gold/60 animate-spin" style={{ animationDuration: '0.8s' }} />
        </div>
        <div className="text-center">
          <p className="text-salon-stone dark:text-muted-foreground text-sm font-medium">Loading...</p>
        </div>
      </div>
    </div>
  );
}
