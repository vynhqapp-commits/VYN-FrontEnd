'use client';

import { Suspense } from 'react';
import Image from 'next/image';
import { useAuth, ThemeToggle } from '@/lib/auth-context';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getRedirectForRole } from '@/lib/role-redirect';
import { LoadingWithHero } from '@/components/SalonHeroImage';
import { APP_NAME, APP_TAGLINE, BANNER_IMAGE } from '@/lib/app-name';
import { useLocale } from '@/components/LocaleProvider';
import { LocaleProvider } from '@/components/LocaleProvider';
import { getPublicT } from '@/lib/i18n-public';
import { Sparkles, CalendarDays, ShieldCheck } from 'lucide-react';

function HomePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, logout } = useAuth();
  const { locale } = useLocale();
  const t = getPublicT(locale);
  const preview = searchParams.get('preview');

  const renderPublicLanding = () => (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="font-display text-xl font-semibold text-foreground transition-colors hover:text-primary">
            {APP_NAME}
          </Link>
          <nav className="flex items-center gap-4 sm:gap-6">
            <ThemeToggle className="size-8 border-border/80" />
            <Link href="/#how-it-works" className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block">
              {t('howItWorks')}
            </Link>
            <Link href="/book" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {t('bookNow')}
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-accent"
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
        <div className="absolute inset-0 bg-gradient-to-b from-salon-sand/30 to-salon-cream dark:from-black/40 dark:to-black/60 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 pt-16 pb-20 sm:pt-24 sm:pb-28 relative">
          <div className="max-w-2xl animate-fade-in rounded-3xl border border-white/50 dark:border-white/15 bg-white/72 dark:bg-black/35 backdrop-blur-md p-6 sm:p-8 shadow-xl shadow-black/10">
            <p className="text-salon-gold font-body text-sm font-semibold uppercase tracking-widest mb-4">
              {t('heroTagline')}
            </p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-salon-espresso dark:text-white leading-tight mb-6">
              {t('heroHeading')}
            </h1>
            <p className="text-salon-stone dark:text-gray-200 text-lg sm:text-xl mb-10 max-w-xl">
              {t('heroSubheading')}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/book"
                className="inline-flex items-center justify-center px-8 py-4 bg-salon-gold text-white rounded-full font-semibold text-base hover:opacity-90 transition-all hover:shadow-lg hover:shadow-salon-gold/20"
              >
                {t('bookYourVisit')}
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-8 py-4 bg-salon-espresso text-salon-cream rounded-full font-semibold text-base hover:bg-salon-bark dark:bg-card dark:text-card-foreground dark:border dark:border-border dark:hover:bg-muted transition-colors"
              >
                {t('logIn')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Value props — semantic text in dark mode (salon-* is dark-on-dark on bg-background) */}
      <section className="py-16 sm:py-20 border-t border-salon-sand/60 dark:border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid sm:grid-cols-3 gap-10 sm:gap-8">
            <div className="text-center sm:text-start animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="w-12 h-12 rounded-2xl bg-salon-gold/10 flex items-center justify-center mx-auto sm:mx-0 mb-4">
                <Sparkles className="w-5 h-5 text-salon-gold" aria-hidden="true" />
              </div>
              <h3 className="font-display text-xl font-semibold text-salon-espresso dark:text-foreground mb-2">{t('curatedSalonsTitle')}</h3>
              <p className="text-salon-stone dark:text-muted-foreground text-sm leading-relaxed">{t('curatedSalonsDesc')}</p>
            </div>
            <div className="text-center sm:text-start animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="w-12 h-12 rounded-2xl bg-salon-rose/20 flex items-center justify-center mx-auto sm:mx-0 mb-4">
                <CalendarDays className="w-5 h-5 text-salon-espresso dark:text-foreground" aria-hidden="true" />
              </div>
              <h3 className="font-display text-xl font-semibold text-salon-espresso dark:text-foreground mb-2">{t('realTimeTitle')}</h3>
              <p className="text-salon-stone dark:text-muted-foreground text-sm leading-relaxed">{t('realTimeDesc')}</p>
            </div>
            <div className="text-center sm:text-start animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="w-12 h-12 rounded-2xl bg-salon-sage/20 flex items-center justify-center mx-auto sm:mx-0 mb-4">
                <ShieldCheck className="w-5 h-5 text-salon-espresso dark:text-foreground" aria-hidden="true" />
              </div>
              <h3 className="font-display text-xl font-semibold text-salon-espresso dark:text-foreground mb-2">{t('onePlaceTitle')}</h3>
              <p className="text-salon-stone dark:text-muted-foreground text-sm leading-relaxed">{t('onePlaceDesc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 sm:py-20 bg-card border-t border-salon-sand/60 dark:border-border">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-salon-espresso dark:text-card-foreground text-center mb-4">
            {t('howItWorksHeading')}
          </h2>
          <p className="text-salon-stone dark:text-muted-foreground text-center max-w-xl mx-auto mb-14">
            {t('howItWorksSubheading')}
          </p>
          <div className="grid sm:grid-cols-3 gap-12 sm:gap-8">
            <div className="relative text-center">
              <div className="w-14 h-14 rounded-full bg-salon-gold text-white font-display font-semibold text-xl flex items-center justify-center mx-auto mb-5">1</div>
              <h3 className="font-display text-lg font-semibold text-salon-espresso dark:text-card-foreground mb-2">{t('step1HowTitle')}</h3>
              <p className="text-salon-stone dark:text-muted-foreground text-sm">{t('step1HowDesc')}</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-salon-gold text-white font-display font-semibold text-xl flex items-center justify-center mx-auto mb-5">2</div>
              <h3 className="font-display text-lg font-semibold text-salon-espresso dark:text-card-foreground mb-2">{t('step2HowTitle')}</h3>
              <p className="text-salon-stone dark:text-muted-foreground text-sm">{t('step2HowDesc')}</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-salon-gold text-white font-display font-semibold text-xl flex items-center justify-center mx-auto mb-5">3</div>
              <h3 className="font-display text-lg font-semibold text-salon-espresso dark:text-card-foreground mb-2">{t('step3HowTitle')}</h3>
              <p className="text-salon-stone dark:text-muted-foreground text-sm">{t('step3HowDesc')}</p>
            </div>
          </div>
          <div className="text-center mt-12">
            <Link
              href="/book"
              className="inline-flex items-center justify-center px-8 py-4 bg-salon-espresso text-salon-cream rounded-full font-semibold hover:bg-salon-bark dark:bg-card dark:text-card-foreground dark:border dark:border-border dark:hover:bg-muted transition-colors"
            >
              {t('startBooking')}
            </Link>
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="py-16 sm:py-20 border-t border-salon-sand/60 dark:border-border">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-salon-espresso dark:text-foreground mb-3">
            {t('ctaHeading')}
          </h2>
          <p className="text-salon-stone dark:text-muted-foreground mb-8">
            {t('ctaSubheading')}
          </p>
          <Link
            href="/book"
            className="inline-flex items-center justify-center px-10 py-4 bg-salon-gold text-white rounded-full font-semibold text-base hover:opacity-90 transition-all hover:shadow-lg hover:shadow-salon-gold/20"
          >
            {t('bookASalon')}
          </Link>
        </div>
      </section>

      {/* Footer — theme tokens only (salon-* hex colors stay dark and vanish on dark bg) */}
      <footer className="border-t border-border bg-muted/50 py-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            href="/"
            className="font-display text-lg font-semibold text-foreground hover:text-primary transition-colors"
          >
            {APP_NAME}
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/book" className="text-muted-foreground hover:text-foreground transition-colors">
              {t('footerBook')}
            </Link>
            <Link href="/#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
              {t('howItWorks')}
            </Link>
            <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">
              {t('logIn')}
            </Link>
          </nav>
        </div>
        <div className="max-w-6xl mx-auto px-4 mt-6 pt-6 border-t border-border text-center sm:text-start">
          <p className="text-muted-foreground text-xs">
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
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <span className="font-display text-xl font-semibold text-foreground">{APP_NAME}</span>
            <div className="flex items-center gap-3">
              <ThemeToggle className="size-8 border-border/80" />
              <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
              <Link
                href={dashboardPath}
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                {label}
              </Link>
              <button
                type="button"
                onClick={() => { logout(); router.push('/'); }}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t('logOut')}
              </button>
            </div>
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <div className="max-w-md text-center">
            <h1 className="mb-2 font-display text-3xl font-semibold text-foreground sm:text-4xl">{t('welcomeBack')}</h1>
            <p className="mb-8 text-muted-foreground">
              {t('welcomeBackDesc').replace('{email}', user.email)}
            </p>
            <Link
              href={dashboardPath}
              className="inline-block rounded-full bg-primary px-8 py-3.5 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
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
