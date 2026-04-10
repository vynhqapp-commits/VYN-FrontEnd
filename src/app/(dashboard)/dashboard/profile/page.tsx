'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Loader2, Save } from 'lucide-react';
import { salonProfileApi, type Tenant } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { Form } from '@/components/ui/form';
import { RHFTextField } from '@/components/fields/RHFTextField';
import { Skeleton } from '@/components/ui/skeleton';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

const TIMEZONES = [
  'UTC', 'Asia/Riyadh', 'Asia/Dubai', 'Asia/Kuwait', 'Asia/Bahrain',
  'Asia/Qatar', 'Africa/Cairo', 'Europe/London', 'Europe/Paris',
  'America/New_York', 'America/Los_Angeles',
];

const CURRENCIES = [
  { code: 'SAR', label: 'SAR — Saudi Riyal' },
  { code: 'AED', label: 'AED — UAE Dirham' },
  { code: 'KWD', label: 'KWD — Kuwaiti Dinar' },
  { code: 'BHD', label: 'BHD — Bahraini Dinar' },
  { code: 'QAR', label: 'QAR — Qatari Riyal' },
  { code: 'EGP', label: 'EGP — Egyptian Pound' },
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — British Pound' },
];

const POLICY_MODES = [
  { value: 'soft', label: 'Allow with warning' },
  { value: 'hard', label: 'Block cancellation / reschedule' },
  { value: 'none', label: 'No restriction' },
] as const;

const schema = z.object({
  name:     z.string().min(1, 'Salon name is required').max(255),
  phone:    z.string().max(30).optional().or(z.literal('')),
  address:  z.string().max(500).optional().or(z.literal('')),
  timezone: z.string().optional(),
  currency: z.string().length(3, 'Must be a 3-letter currency code').optional().or(z.literal('')),
  logo:     z.string().max(500).optional().or(z.literal('')),
  cancellation_window_hours: z.coerce.number().int().min(0).max(168).optional(),
  cancellation_policy_mode:  z.enum(['soft', 'hard', 'none']).optional(),
});
type Values = z.infer<typeof schema>;

export default function SalonProfilePage() {
  const [salon, setSalon] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', address: '', timezone: 'UTC', currency: 'USD', logo: '', cancellation_window_hours: 24, cancellation_policy_mode: 'soft' as const },
  });

  useEffect(() => {
    salonProfileApi.get().then((res) => {
      setLoading(false);
      if ('error' in res) { toastError(res.error ?? 'Failed to load salon profile'); return; }
      const s = res.data?.salon;
      if (!s) return;
      setSalon(s);
      form.reset({
        name:     s.name ?? '',
        phone:    s.phone ?? '',
        address:  s.address ?? '',
        timezone: s.timezone ?? 'UTC',
        currency: s.currency ?? 'USD',
        logo:     s.logo ?? '',
        cancellation_window_hours: s.cancellation_window_hours ?? 24,
        cancellation_policy_mode:  (s.cancellation_policy_mode ?? 'soft') as 'soft' | 'hard' | 'none',
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (values: Values) => {
    setSaving(true);
    const res = await salonProfileApi.update({
      name:     values.name,
      phone:    values.phone || undefined,
      address:  values.address || undefined,
      timezone: values.timezone || undefined,
      currency: values.currency || undefined,
      logo:     values.logo || undefined,
      cancellation_window_hours: values.cancellation_window_hours,
      cancellation_policy_mode:  values.cancellation_policy_mode,
    });
    setSaving(false);
    if ('error' in res) { toastError(res.error ?? 'Failed to save'); return; }
    setSalon(res.data?.salon ?? salon);
    toastSuccess('Salon profile updated.');
  };

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-14 w-80" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <DashboardPageHeader
        className="pb-2"
        title={salon?.name ?? 'Salon Profile'}
        description="Update your salon's public details, currency, and timezone."
        icon={<Building2 className="w-5 h-5" />}
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold text-foreground">Salon Details</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            This information is shown to customers on the booking page.
          </p>
        </div>
        <div className="px-6 py-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, () => toastError('Please check the highlighted fields.'))} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <RHFTextField control={form.control} name="name" label="Salon name" placeholder="Luxe Salon & Spa" disabled={saving} />
                <RHFTextField control={form.control} name="phone" label="Phone" placeholder="+966 5XX XXX XXXX" disabled={saving} />
              </div>

              <RHFTextField control={form.control} name="address" label="Address" placeholder="Street, city, country" disabled={saving} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Currency */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Currency
                  </label>
                  <select
                    {...form.register('currency')}
                    disabled={saving}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-60"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                  {form.formState.errors.currency && (
                    <p className="text-xs text-red-500 mt-1.5">{form.formState.errors.currency.message}</p>
                  )}
                </div>

                {/* Timezone */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Timezone
                  </label>
                  <select
                    {...form.register('timezone')}
                    disabled={saving}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-60"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </div>

              <RHFTextField
                control={form.control}
                name="logo"
                label="Logo URL"
                placeholder="https://example.com/logo.png"
                disabled={saving}
              />

              {/* Booking Policies */}
              <div className="pt-4 mt-4 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground mb-1">Booking Policies</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Configure how customers can cancel or reschedule their bookings.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Cancellation Window (hours)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={168}
                      {...form.register('cancellation_window_hours', { valueAsNumber: true })}
                      disabled={saving}
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-60"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      How many hours before the appointment the policy applies. Set 0 to apply no window.
                    </p>
                    {form.formState.errors.cancellation_window_hours && (
                      <p className="text-xs text-red-500 mt-1">{form.formState.errors.cancellation_window_hours.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Policy Mode
                    </label>
                    <select
                      {...form.register('cancellation_policy_mode')}
                      disabled={saving}
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-60"
                    >
                      {POLICY_MODES.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      &quot;Allow with warning&quot; lets customers proceed with a notice. &quot;Block&quot; prevents changes inside the window.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving || !form.formState.isDirty}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </Form>
        </div>
      </div>

      {/* Read-only info */}
      {salon && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">Account Info</h2>
          </div>
          <div className="space-y-3 px-6 py-5 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Slug</span>
              <span className="font-mono font-medium text-foreground">{salon.slug}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium capitalize text-foreground">{salon.plan ?? '—'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Status</span>
              <span className={`font-medium capitalize ${salon.subscription_status === 'active' ? 'text-green-600' : 'text-red-500'}`}>
                {salon.subscription_status ?? '—'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
