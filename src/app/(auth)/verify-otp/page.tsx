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

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithOtp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email('Enter a valid email'),
        code: z.string().min(1, 'Code is required'),
      }),
    [],
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
    if ('error' in result) {
      toastError(result.error);
      return;
    }
    toastSuccess('Welcome back.');
    router.push(getRedirectForRole(result.user.role));
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-salon-cream">
      <div className="lg:w-1/2 relative min-h-[220px] lg:min-h-screen flex-shrink-0">
        {imgError ? (
          <div className="absolute inset-0 bg-gradient-to-br from-[#d5e8e4] via-salon-cream to-salon-sand flex items-center justify-center p-8">
            <span className="font-display text-salon-espresso text-xl font-semibold text-center">{APP_FULL_NAME}</span>
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
        <div className="absolute inset-0 bg-salon-espresso/20 lg:bg-salon-espresso/30 pointer-events-none" aria-hidden />
      </div>
      <div className="flex-1 flex flex-col bg-salon-cream">
        <header className="border-b border-salon-sand/60 bg-white/80 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <Link href="/" className="font-display text-lg font-semibold text-salon-espresso hover:text-salon-bark transition-colors">
              {APP_NAME}
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <h1 className="font-display text-3xl font-semibold text-salon-espresso mb-2">Verify code</h1>
            <p className="text-salon-stone text-sm mb-6">
              Enter the code we sent to your email to sign in.
            </p>
            <div className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm p-6">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit, () =>
                    toastError('Please check the highlighted fields.'),
                  )}
                  className="space-y-4"
                >
                  <RHFTextField
                    control={form.control}
                    name="email"
                    label="Email"
                    type="email"
                    disabled={loading}
                  />
                  <RHFTextField
                    control={form.control}
                    name="code"
                    label="Code"
                    placeholder="Enter 6-digit code"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    disabled={loading}
                  />
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl font-semibold"
                  >
                    {loading ? 'Verifying...' : 'Verify & log in'}
                  </Button>
                </form>
              </Form>
            </div>
            <p className="mt-6 text-center">
              <Link href="/login" className="text-salon-stone text-sm hover:text-salon-espresso transition-colors">
                ← Back to login
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
