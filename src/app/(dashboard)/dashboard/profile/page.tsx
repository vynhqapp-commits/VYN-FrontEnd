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

const schema = z.object({
  name:     z.string().min(1, 'Salon name is required').max(255),
  phone:    z.string().max(30).optional().or(z.literal('')),
  address:  z.string().max(500).optional().or(z.literal('')),
  timezone: z.string().optional(),
  currency: z.string().length(3, 'Must be a 3-letter currency code').optional().or(z.literal('')),
  logo:     z.string().max(500).optional().or(z.literal('')),
});
type Values = z.infer<typeof schema>;

export default function SalonProfilePage() {
  const [salon, setSalon] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', address: '', timezone: 'UTC', currency: 'USD', logo: '' },
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
      {/* Header */}
      <div className="flex items-center gap-4 pb-2">
        <div className="w-14 h-14 rounded-full bg-salon-gold/10 flex items-center justify-center shrink-0 border-2 border-salon-gold/20">
          <Building2 className="w-7 h-7 text-salon-gold" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-salon-espresso leading-tight">
            {salon?.name ?? 'Salon Profile'}
          </h1>
          <p className="text-salon-stone text-sm mt-0.5">
            Update your salon's public details, currency, and timezone.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-salon-espresso text-sm">Salon Details</h2>
          <p className="text-xs text-salon-stone mt-0.5">
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
                  <label className="block text-xs font-semibold text-salon-stone uppercase tracking-wide mb-1.5">
                    Currency
                  </label>
                  <select
                    {...form.register('currency')}
                    disabled={saving}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-salon-sand/60 text-sm text-salon-espresso bg-white
                      focus:outline-none focus:ring-2 focus:ring-salon-gold/30 disabled:opacity-60"
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
                  <label className="block text-xs font-semibold text-salon-stone uppercase tracking-wide mb-1.5">
                    Timezone
                  </label>
                  <select
                    {...form.register('timezone')}
                    disabled={saving}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-salon-sand/60 text-sm text-salon-espresso bg-white
                      focus:outline-none focus:ring-2 focus:ring-salon-gold/30 disabled:opacity-60"
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

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving || !form.formState.isDirty}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-salon-gold text-white
                    text-sm font-semibold rounded-xl hover:bg-salon-goldLight transition-colors
                    shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-salon-espresso text-sm">Account Info</h2>
          </div>
          <div className="px-6 py-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Slug</span>
              <span className="text-salon-espresso font-medium font-mono">{salon.slug}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Plan</span>
              <span className="text-salon-espresso font-medium capitalize">{salon.plan ?? '—'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Status</span>
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
