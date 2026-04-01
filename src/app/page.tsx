'use client';

import { Suspense } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getRedirectForRole } from '@/lib/role-redirect';
import { LoadingWithHero } from '@/components/SalonHeroImage';
import { APP_NAME, APP_TAGLINE, BANNER_IMAGE } from '@/lib/app-name';
import { useLocale } from '@/components/LocaleProvider';
import { LocaleProvider } from '@/components/LocaleProvider';
import { getPublicT } from '@/lib/i18n-public';

function HomePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, logout } = useAuth();
  const { locale } = useLocale();
  const t = getPublicT(locale);
  const preview = searchParams.get('preview');

  const renderPublicLanding = () => (
    <div className="min-h-screen flex flex-col bg-salon-cream">
      {/* Header */}
      <header className="border-b border-salon-sand/60 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="font-display text-xl font-semibold text-salon-espresso hover:text-salon-bark transition-colors">
            {APP_NAME}
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/#how-it-works" className="text-salon-stone text-sm font-medium hover:text-salon-espresso transition-colors hidden sm:block">
              {t('howItWorks')}
            </Link>
            <Link href="/book" className="text-salon-stone text-sm font-medium hover:text-salon-espresso transition-colors">
              {t('bookNow')}
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-salon-espresso text-sm font-medium rounded-full border border-salon-stone/40 hover:border-salon-espresso hover:bg-salon-sand/40 transition-colors"
            >
              {t('logIn')}
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden min-h-[420px] sm:min-h-[480px]">
        <div className="absolute inset-0">
          <Image src={BANNER_IMAGE} alt="" fill className="object-cover object-center" priority sizes="100vw" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-salon-sand/30 to-salon-cream pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 pt-16 pb-20 sm:pt-24 sm:pb-28 relative">
          <div className="max-w-2xl animate-fade-in">
            <p className="text-salon-gold font-body text-sm font-semibold uppercase tracking-widest mb-4">
              {t('heroTagline')}
            </p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-salon-espresso leading-tight mb-6">
              {t('heroHeading')}
            </h1>
            <p className="text-salon-stone text-lg sm:text-xl mb-10 max-w-xl">
              {t('heroSubheading')}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/book"
                className="inline-flex items-center justify-center px-8 py-4 bg-salon-gold text-white rounded-full font-semibold text-base hover:bg-salon-goldLight transition-all hover:shadow-lg hover:shadow-salon-gold/20"
              >
                {t('bookYourVisit')}
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-8 py-4 bg-salon-espresso text-salon-cream rounded-full font-semibold text-base hover:bg-salon-bark transition-colors"
              >
                {t('logIn')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="py-16 sm:py-20 border-t border-salon-sand/60">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid sm:grid-cols-3 gap-10 sm:gap-8">
            <div className="text-center sm:text-start animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="w-12 h-12 rounded-2xl bg-salon-gold/10 flex items-center justify-center mx-auto sm:mx-0 mb-4">
                <span className="text-2xl">✨</span>
              </div>
              <h3 className="font-display text-xl font-semibold text-salon-espresso mb-2">{t('curatedSalonsTitle')}</h3>
              <p className="text-salon-stone text-sm leading-relaxed">{t('curatedSalonsDesc')}</p>
            </div>
            <div className="text-center sm:text-start animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="w-12 h-12 rounded-2xl bg-salon-rose/20 flex items-center justify-center mx-auto sm:mx-0 mb-4">
                <span className="text-2xl">📅</span>
              </div>
              <h3 className="font-display text-xl font-semibold text-salon-espresso mb-2">{t('realTimeTitle')}</h3>
              <p className="text-salon-stone text-sm leading-relaxed">{t('realTimeDesc')}</p>
            </div>
            <div className="text-center sm:text-start animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="w-12 h-12 rounded-2xl bg-salon-sage/20 flex items-center justify-center mx-auto sm:mx-0 mb-4">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="font-display text-xl font-semibold text-salon-espresso mb-2">{t('onePlaceTitle')}</h3>
              <p className="text-salon-stone text-sm leading-relaxed">{t('onePlaceDesc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 sm:py-20 bg-white border-t border-salon-sand/60">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-salon-espresso text-center mb-4">
            {t('howItWorksHeading')}
          </h2>
          <p className="text-salon-stone text-center max-w-xl mx-auto mb-14">
            {t('howItWorksSubheading')}
          </p>
          <div className="grid sm:grid-cols-3 gap-12 sm:gap-8">
            <div className="relative text-center">
              <div className="w-14 h-14 rounded-full bg-salon-gold text-white font-display font-semibold text-xl flex items-center justify-center mx-auto mb-5">1</div>
              <h3 className="font-display text-lg font-semibold text-salon-espresso mb-2">{t('step1HowTitle')}</h3>
              <p className="text-salon-stone text-sm">{t('step1HowDesc')}</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-salon-gold text-white font-display font-semibold text-xl flex items-center justify-center mx-auto mb-5">2</div>
              <h3 className="font-display text-lg font-semibold text-salon-espresso mb-2">{t('step2HowTitle')}</h3>
              <p className="text-salon-stone text-sm">{t('step2HowDesc')}</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-salon-gold text-white font-display font-semibold text-xl flex items-center justify-center mx-auto mb-5">3</div>
              <h3 className="font-display text-lg font-semibold text-salon-espresso mb-2">{t('step3HowTitle')}</h3>
              <p className="text-salon-stone text-sm">{t('step3HowDesc')}</p>
            </div>
          </div>
          <div className="text-center mt-12">
            <Link
              href="/book"
              className="inline-flex items-center justify-center px-8 py-4 bg-salon-espresso text-salon-cream rounded-full font-semibold hover:bg-salon-bark transition-colors"
            >
              {t('startBooking')}
            </Link>
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="py-16 sm:py-20 border-t border-salon-sand/60">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-salon-espresso mb-3">
            {t('ctaHeading')}
          </h2>
          <p className="text-salon-stone mb-8">
            {t('ctaSubheading')}
          </p>
          <Link
            href="/book"
            className="inline-flex items-center justify-center px-10 py-4 bg-salon-gold text-white rounded-full font-semibold text-base hover:bg-salon-goldLight transition-all hover:shadow-lg hover:shadow-salon-gold/20"
          >
            {t('bookASalon')}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-salon-sand/60 bg-salon-sand/30 py-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="font-display text-lg font-semibold text-salon-espresso hover:text-salon-bark transition-colors">
            {APP_NAME}
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/book" className="text-salon-stone hover:text-salon-espresso transition-colors">{t('footerBook')}</Link>
            <Link href="/#how-it-works" className="text-salon-stone hover:text-salon-espresso transition-colors">{t('howItWorks')}</Link>
            <Link href="/login" className="text-salon-stone hover:text-salon-espresso transition-colors">{t('logIn')}</Link>
          </nav>
        </div>
        <div className="max-w-6xl mx-auto px-4 mt-6 pt-6 border-t border-salon-sand/60 text-center sm:text-start">
          <p className="text-salon-stone text-xs">
            © {new Date().getFullYear()} {APP_NAME}. {APP_TAGLINE}.
          </p>
        </div>
      </footer>
    </div>
  );

  if (loading) return <LoadingWithHero />;

  if (preview === '1') {
    return renderPublicLanding();
  }

  if (user) {
    if (user.role === 'Admin') {
      router.replace('/admin');
      return <LoadingWithHero />;
    }

    const dashboardPath = getRedirectForRole(user.role);
    const label = user.role === 'customer' ? t('myBookings') : t('goToDashboard');
    return (
      <div className="min-h-screen flex flex-col bg-salon-cream">
        <header className="border-b border-salon-sand/60 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <span className="font-display text-xl font-semibold text-salon-espresso">{APP_NAME}</span>
            <div className="flex items-center gap-3">
              <span className="text-salon-stone text-sm hidden sm:inline">{user.email}</span>
              <Link
                href={dashboardPath}
                className="px-5 py-2.5 bg-salon-espresso text-salon-cream rounded-full font-medium text-sm hover:bg-salon-bark transition-colors"
              >
                {label}
              </Link>
              <button
                type="button"
                onClick={() => { logout(); router.push('/'); }}
                className="text-salon-stone text-sm hover:text-salon-espresso transition-colors"
              >
                {t('logOut')}
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="text-center max-w-md">
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-salon-espresso mb-2">{t('welcomeBack')}</h1>
            <p className="text-salon-stone mb-8">
              {t('welcomeBackDesc').replace('{email}', user.email)}
            </p>
            <Link
              href={dashboardPath}
              className="inline-block px-8 py-3.5 bg-salon-gold text-white rounded-full font-semibold hover:bg-salon-goldLight transition-colors"
            >
              {label}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return renderPublicLanding();
}

export default function HomePage() {
  return (
    <Suspense fallback={<LoadingWithHero />}>
      <LocaleProvider>
        <HomePageClient />
      </LocaleProvider>
    </Suspense>
  );
}
