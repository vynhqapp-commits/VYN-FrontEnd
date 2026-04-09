'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useAuth } from '@/lib/auth-context';
import { getRedirectForRole } from '@/lib/role-redirect';
import { LoadingWithHero } from '@/components/SalonHeroImage';
import { APP_NAME, APP_FULL_NAME, BANNER_IMAGE } from '@/lib/app-name';
import { toastError, toastSuccess } from '@/lib/toast';
import { Form } from '@/components/ui/form';
import { RHFTextField } from '@/components/fields/RHFTextField';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/LocaleProvider';
import { getPublicT } from '@/lib/i18n-public';

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithOtp } = useAuth();
  const { locale } = useLocale();
  const t = getPublicT(locale);
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('enterValidEmail')),
        code: z.string().min(1, t('otpRequired')),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale],
  );
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', code: '' },
    mode: 'onSubmit',
  });

  useEffect(() => {
    const e = searchParams.get('email');
    if (e) form.setValue('email', e);
  }, [searchParams, form]);

  const handleSubmit = async (values: Values) => {
    setLoading(true);
    const result = await loginWithOtp(values.email, values.code);
    setLoading(false);
    if ('error' in result) { toastError(result.error); return; }
    toastSuccess(t('welcomeBackToast'));
    router.push(getRedirectForRole(result.user.role));
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--elite-bg)] text-[var(--elite-text)]">
      <div className="lg:w-1/2 relative min-h-[220px] lg:min-h-screen flex-shrink-0">
        {imgError ? (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--elite-surface)] via-[var(--elite-card)] to-[var(--elite-card-2)] flex items-center justify-center p-8">
            <span className="font-display text-[var(--elite-text)] text-xl font-semibold text-center">{APP_FULL_NAME}</span>
          </div>
        ) : (
          <div className="absolute inset-0">
            <Image
              src={BANNER_IMAGE}
              alt={APP_FULL_NAME}
              fill
              className="object-cover object-center"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              onError={() => setImgError(true)}
            />
          </div>
        )}
        <div className="absolute inset-0 bg-black/35 lg:bg-black/45 pointer-events-none" aria-hidden />
      </div>
      <div className="flex-1 flex flex-col bg-[var(--elite-bg)]">
        <header className="border-b border-[var(--elite-border)] bg-[var(--elite-card)]/70 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <Link href="/" className="font-display text-lg font-semibold text-[var(--elite-text)] hover:text-primary transition-colors">
              {APP_NAME}
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <h1 className="font-display text-3xl font-semibold text-[var(--elite-text)] mb-2">{t('verifyCodeHeading')}</h1>
            <p className="text-[var(--elite-muted)] text-sm mb-6">{t('verifyCodeSubheading')}</p>
            <div className="bg-[var(--elite-card)] rounded-2xl border border-[var(--elite-border)] shadow-sm p-6">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit, () => toastError(t('checkHighlightedFields')))}
                  className="space-y-4 [&_label]:text-[var(--elite-muted)] [&_label]:font-medium [&_input]:bg-[var(--elite-surface)] [&_input]:border-[var(--elite-border-2)] [&_input]:text-[var(--elite-text)] [&_input]:placeholder:text-[var(--elite-muted)] [&_input]:rounded-xl [&_input:focus]:border-[var(--elite-orange)] [&_input:focus]:ring-1 [&_input:focus]:ring-[var(--elite-orange-dim)]"
                >
                  <RHFTextField control={form.control} name="email" label={t('email')} type="email" disabled={loading} />
                  <RHFTextField
                    control={form.control}
                    name="code"
                    label={t('code')}
                    placeholder={t('enterOtpPlaceholder')}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    disabled={loading}
                  />
                  <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl font-semibold">
                    {loading ? t('verifying') : t('verifyAndLogin')}
                  </Button>
                </form>
              </Form>
            </div>
            <p className="mt-6 text-center">
              <Link href="/login" className="text-[var(--elite-muted)] text-sm hover:text-[var(--elite-text)] transition-colors">
                {t('backToLogin')}
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<LoadingWithHero />}>
      <VerifyOtpForm />
    </Suspense>
  );
}
