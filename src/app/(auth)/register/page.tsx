'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useAuth } from '@/lib/auth-context';
import { authApi } from '@/lib/api';
import { getRedirectForRole } from '@/lib/role-redirect';
import { APP_NAME, APP_FULL_NAME, BANNER_IMAGE } from '@/lib/app-name';
import { toastError, toastSuccess } from '@/lib/toast';
import { Form } from '@/components/ui/form';
import { RHFTextField } from '@/components/fields/RHFTextField';
import { Button } from '@/components/ui/button';

type Mode = 'customer' | 'salon';
type Step = 'form' | 'otp';

export default function RegisterPage() {
  const router = useRouter();
  const { registerCustomer, registerSalonOwner } = useAuth();
  const [mode, setMode] = useState<Mode>('salon');
  const [step, setStep] = useState<Step>('form');
  const [imgError, setImgError] = useState(false);
  const [loading, setLoading] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        salonName: z.string().optional(),
        salonAddress: z.string().optional(),
        fullName: z.string().optional(),
        email: z.string().email('Enter a valid email'),
        phone: z.string().optional(),
        password: z.string().min(6, 'Password must be at least 6 characters'),
        otpCode: z.string().optional(),
      }),
    [],
  );

  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      salonName: '',
      salonAddress: '',
      fullName: '',
      email: '',
      phone: '',
      password: '',
      otpCode: '',
    },
    mode: 'onSubmit',
  });

  const handleSendOtp = async (values: Values) => {
    if (mode === 'salon' && !String(values.salonName ?? '').trim()) {
      toastError('Salon name is required');
      return;
    }

    setLoading(true);
    const { error: otpError } = await authApi.otpSend(values.email, 'register');
    setLoading(false);

    if (otpError) {
      toastError(otpError);
      return;
    }

    toastSuccess('Verification code sent.');
    setStep('otp');
  };

  const handleSubmit = async (values: Values) => {
    const otpCode = String(values.otpCode ?? '').trim();
    if (!otpCode) {
      toastError('Verification code is required');
      return;
    }

    setLoading(true);
    const { data: otpData, error: otpError } = await authApi.otpVerify(
      values.email,
      otpCode,
      'register',
    );
    if (otpError || !otpData) {
      setLoading(false);
      toastError(otpError || 'OTP verification failed');
      return;
    }

    try {
      if (mode === 'customer') {
        const result = await registerCustomer({
          email: values.email,
          password: values.password,
          full_name: values.fullName || undefined,
          phone: values.phone || undefined,
        });
        setLoading(false);
        if ('error' in result) {
          toastError(result.error);
          return;
        }
        toastSuccess('Account created.');
        router.push(getRedirectForRole(result.user.role));
      } else {
        if (!String(values.salonName ?? '').trim()) {
          setLoading(false);
          toastError('Salon name is required');
          return;
        }
        const result = await registerSalonOwner({
          salon_name: String(values.salonName),
          salon_address: values.salonAddress || undefined,
          email: values.email,
          password: values.password,
          full_name: values.fullName || undefined,
          phone: values.phone || undefined,
        });
        setLoading(false);
        if ('error' in result) {
          toastError(result.error);
          return;
        }
        toastSuccess('Salon account created.');
        router.push(getRedirectForRole(result.user.role));
      }
    } catch (err) {
      setLoading(false);
      toastError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-salon-cream">
      <div className="lg:w-1/2 relative min-h-[220px] lg:min-h-screen flex-shrink-0">
        {imgError ? (
          <div className="absolute inset-0 bg-gradient-to-br from-[#d5e8e4] via-salon-cream to-salon-sand flex items-center justify-center p-8">
            <span className="font-display text-salon-espresso text-xl font-semibold text-center">
              {APP_FULL_NAME}
            </span>
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
        <div
          className="absolute inset-0 bg-salon-espresso/20 lg:bg-salon-espresso/30 pointer-events-none"
          aria-hidden
        />
      </div>

      <div className="flex-1 flex flex-col bg-salon-cream">
        <header className="border-b border-salon-sand/60 bg-white/80 backdrop-blur-sm flex-shrink-0">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link
              href="/"
              className="font-display text-lg font-semibold text-salon-espresso hover:text-salon-bark transition-colors"
            >
              {APP_NAME}
            </Link>
            <Link href="/login" className="text-sm text-salon-stone hover:text-salon-espresso">
              Already have an account? Log in
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <h1 className="font-display text-3xl font-semibold text-salon-espresso mb-2">
              Create your account
            </h1>
            <p className="text-salon-stone text-sm mb-6">
              Choose whether you&apos;re signing up as a salon or as a guest booking appointments.
            </p>

            <div className="mb-4 inline-flex rounded-full bg-salon-cream/70 border border-salon-sand/60 p-1 text-sm">
              <button
                type="button"
                onClick={() => setMode('salon')}
                className={`px-4 py-1.5 rounded-full ${
                  mode === 'salon' ? 'bg-salon-espresso text-salon-cream' : 'text-salon-espresso'
                }`}
              >
                I run a salon
              </button>
              <button
                type="button"
                onClick={() => setMode('customer')}
                className={`px-4 py-1.5 rounded-full ${
                  mode === 'customer' ? 'bg-salon-espresso text-salon-cream' : 'text-salon-espresso'
                }`}
              >
                I&apos;m a guest
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm p-6">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(step === 'form' ? handleSendOtp : handleSubmit, () =>
                    toastError('Please check the highlighted fields.'),
                  )}
                  className="space-y-4"
                  autoComplete="off"
                >
                  {step === 'form' ? (
                    <>
                      {mode === 'salon' && (
                        <>
                          <RHFTextField
                            control={form.control}
                            name="salonName"
                            label="Salon name"
                            placeholder="Luxe Salon & Spa"
                            disabled={loading}
                          />
                          <RHFTextField
                            control={form.control}
                            name="salonAddress"
                            label="Salon address"
                            placeholder="Street, city, country"
                            disabled={loading}
                          />
                        </>
                      )}
                      <RHFTextField
                        control={form.control}
                        name="fullName"
                        label="Full name"
                        placeholder="Your name"
                        disabled={loading}
                      />
                      <RHFTextField
                        control={form.control}
                        name="email"
                        label="Email"
                        placeholder="you@example.com"
                        type="email"
                        autoComplete="off"
                        disabled={loading}
                      />
                      <RHFTextField
                        control={form.control}
                        name="phone"
                        label="Phone (optional)"
                        placeholder="+1 555 123 4567"
                        type="tel"
                        autoComplete="off"
                        disabled={loading}
                      />
                      <RHFTextField
                        control={form.control}
                        name="password"
                        label="Password"
                        placeholder="At least 6 characters"
                        type="password"
                        autoComplete="new-password"
                        disabled={loading}
                      />
                    </>
                  ) : (
                    <>
                      <RHFTextField
                        control={form.control}
                        name="otpCode"
                        label="Verification code"
                        placeholder="Enter 6-digit code"
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        disabled={loading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-0 text-xs text-salon-stone hover:text-salon-espresso"
                        onClick={() => {
                          setStep('form');
                          form.setValue('otpCode', '');
                        }}
                      >
                        ← Change details
                      </Button>
                    </>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl font-semibold"
                  >
                    {loading
                      ? step === 'form'
                        ? 'Sending code…'
                        : 'Creating account…'
                      : step === 'form'
                        ? 'Send verification code'
                        : mode === 'salon'
                          ? 'Create salon account'
                          : 'Create guest account'}
                  </Button>
                </form>
              </Form>
            </div>

            <p className="mt-6 text-center">
              <Link href="/" className="text-salon-stone text-sm hover:text-salon-espresso transition-colors">
                ← Back to home
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

