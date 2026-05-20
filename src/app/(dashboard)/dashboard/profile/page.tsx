'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Loader2, Save } from 'lucide-react';
import { settingsApi, type Tenant } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { Form } from '@/components/ui/form';
import { RHFTextField } from '@/components/fields/RHFTextField';
import { Skeleton } from '@/components/ui/skeleton';
import { Combobox } from '@/components/ui/combobox';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { useLocale } from '@/components/LocaleProvider';
import { getMediaUrl } from '@/lib/utils';

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

const GENDER_PREFS = [
  { value: 'unisex', label: 'Unisex' },
  { value: 'ladies', label: 'Ladies' },
  { value: 'gents', label: 'Gents' },
] as const;

const LOCALES = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'Arabic' },
  { value: 'fr', label: 'French' },
] as const;

const schema = z.object({
  name:     z.string().min(1, 'Salon name is required').max(255),
  phone:    z.string().max(30).optional().or(z.literal('')),
  address:  z.string().max(500).optional().or(z.literal('')),
  timezone: z.string().optional(),
  currency: z.string().length(3, 'Must be a 3-letter currency code').optional().or(z.literal('')),
  vat_rate: z.coerce.number().min(0).max(100).optional(),
  apply_vat: z.boolean().optional(),
  enable_dual_currency: z.boolean().optional(),
  exchange_rate: z.coerce.number().min(0).optional(),
  logo:     z.string().max(500).optional().or(z.literal('')),
  gender_preference: z.enum(['ladies', 'gents', 'unisex']).optional(),
  preferred_locale: z.string().max(10).optional().or(z.literal('')),
  cancellation_window_hours: z.coerce.number().int().min(0).max(168).optional(),
  cancellation_policy_mode:  z.enum(['soft', 'hard', 'none']).optional(),
  refund_window_hours: z.coerce.number().int().min(0).max(168).optional(),
});
type Values = z.infer<typeof schema>;

export default function SalonProfilePage() {
  const [salon, setSalon] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { setLocale } = useLocale();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      phone: '',
      address: '',
      timezone: 'UTC',
      currency: 'USD',
      vat_rate: 0,
      apply_vat: false,
      enable_dual_currency: false,
      exchange_rate: 89500,
      logo: '',
      gender_preference: 'unisex' as const,
      preferred_locale: 'en',
      cancellation_window_hours: 24,
      cancellation_policy_mode: 'soft' as const,
      refund_window_hours: 24,
    },
  });

  useEffect(() => {
    settingsApi.get().then((res) => {
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
        vat_rate: s.vat_rate != null ? Number(s.vat_rate) : 0,
        apply_vat: s.apply_vat ?? false,
        enable_dual_currency: s.enable_dual_currency ?? false,
        exchange_rate: s.exchange_rate != null ? Number(s.exchange_rate) : 89500,
        logo:     s.logo ?? '',
        gender_preference: (s.gender_preference ?? 'unisex') as 'ladies' | 'gents' | 'unisex',
        preferred_locale: s.preferred_locale ?? 'en',
        cancellation_window_hours: s.cancellation_window_hours ?? 24,
        cancellation_policy_mode:  (s.cancellation_policy_mode ?? 'soft') as 'soft' | 'hard' | 'none',
        refund_window_hours: s.refund_window_hours ?? 24,
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (values: Values) => {
    setSaving(true);
    const res = await settingsApi.update({
      name:     values.name,
      phone:    values.phone || undefined,
      address:  values.address || undefined,
      timezone: values.timezone || undefined,
      currency: values.currency || undefined,
      vat_rate: values.vat_rate,
      apply_vat: values.apply_vat,
      enable_dual_currency: values.enable_dual_currency,
      exchange_rate: values.exchange_rate,
      logo:     values.logo || undefined,
      gender_preference: values.gender_preference,
      preferred_locale: values.preferred_locale || undefined,
      cancellation_window_hours: values.cancellation_window_hours,
      cancellation_policy_mode:  values.cancellation_policy_mode,
      refund_window_hours: values.refund_window_hours,
    });
    setSaving(false);
    if ('error' in res) { toastError(res.error ?? 'Failed to save'); return; }
    
    const updatedSalon = res.data?.salon;
    if (updatedSalon) {
      setSalon(updatedSalon);
      if (updatedSalon.preferred_locale) {
        setLocale(updatedSalon.preferred_locale as any);
      }
    }
    toastSuccess('Salon profile updated.');
    window.dispatchEvent(new Event('logo-updated'));
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
                  <Combobox
                    value={form.watch('currency')}
                    onValueChange={(value) => form.setValue('currency', value, { shouldDirty: true })}
                    options={CURRENCIES.map((c) => ({
                      value: c.code,
                      label: c.label,
                    }))}
                    placeholder="Select currency"
                    searchPlaceholder="Search currencies..."
                    emptyText="No currencies found."
                    disabled={saving}
                    className="w-full"
                  />
                  {form.formState.errors.currency && (
                    <p className="text-xs text-red-500 mt-1.5">{form.formState.errors.currency.message}</p>
                  )}
                </div>

                {/* Timezone */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Timezone
                  </label>
                  <Combobox
                    value={form.watch('timezone')}
                    onValueChange={(value) => form.setValue('timezone', value, { shouldDirty: true })}
                    options={TIMEZONES.map((tz) => ({
                      value: tz,
                      label: tz,
                    }))}
                    placeholder="Select timezone"
                    searchPlaceholder="Search timezones..."
                    emptyText="No timezones found."
                    disabled={saving}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Salon Logo Upload Section */}
              <div className="rounded-2xl border border-border bg-muted/10 p-5 space-y-4">
                <div className="flex items-center gap-4">
                  {/* Preview avatar */}
                  <div className="relative group size-20 rounded-2xl overflow-hidden border border-border bg-muted/40 flex items-center justify-center shadow-xs shrink-0">
                    {form.watch('logo') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getMediaUrl(form.watch('logo'))}
                        alt="Salon Logo"
                        className="size-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <Building2 className="size-8 text-muted-foreground opacity-60" />
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-1.5 flex-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Salon Logo
                    </label>
                    <p className="text-[11px] text-muted-foreground leading-normal max-w-xs">
                      Recommend square image, max size 5MB (JPEG, PNG, SVG).
                    </p>

                    <div className="flex items-center gap-2 pt-1.5">
                      <label className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground shadow-xs hover:bg-muted/50 cursor-pointer transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            if (file.size > 5 * 1024 * 1024) {
                              toastError("Logo file exceeds the 5MB size limit.");
                              return;
                            }

                            setSaving(true);
                            const res = await settingsApi.uploadLogo(file);
                            setSaving(false);

                            if ("error" in res) {
                              toastError(res.error ?? "Failed to upload logo.");
                            } else if (res.data?.logo) {
                              form.setValue('logo', res.data.logo, { shouldDirty: true });
                              toastSuccess("Salon logo uploaded successfully.");
                              window.dispatchEvent(new Event('logo-updated'));
                            }
                          }}
                          disabled={saving}
                        />
                        Upload logo
                      </label>

                      {form.watch('logo') && (
                        <button
                          type="button"
                          onClick={() => {
                            form.setValue('logo', '', { shouldDirty: true });
                            window.dispatchEvent(new Event('logo-updated'));
                          }}
                          disabled={saving}
                          className="inline-flex items-center justify-center rounded-xl border border-transparent px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Legacy text input just in case they want to paste a URL */}
                <div className="pt-2 border-t border-border/40">
                  <RHFTextField
                    control={form.control}
                    name="logo"
                    label="Or paste logo URL"
                    placeholder="https://example.com/logo.png"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end rounded-2xl border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between h-full py-2">
                  <div className="space-y-0.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Apply VAT
                    </label>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      Enable tax calculations on services and products checkouts.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={!!form.watch('apply_vat')}
                      onChange={(e) => form.setValue('apply_vat', e.target.checked, { shouldDirty: true })}
                      disabled={saving}
                    />
                    <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Default VAT rate (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    {...form.register('vat_rate', { valueAsNumber: true })}
                    disabled={saving || !form.watch('apply_vat')}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-60"
                  />
                  {form.formState.errors.vat_rate && (
                    <p className="text-xs text-red-500 mt-1">{form.formState.errors.vat_rate.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end rounded-2xl border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between h-full py-2">
                  <div className="space-y-0.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Enable Dual Currency
                    </label>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      Display dual-currency (USD & LBP) converted totals on invoices.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={!!form.watch('enable_dual_currency')}
                      onChange={(e) => form.setValue('enable_dual_currency', e.target.checked, { shouldDirty: true })}
                      disabled={saving}
                    />
                    <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Exchange Rate (1 USD = X LBP)
                  </label>
                  <input
                    type="number"
                    min={0}
                    {...form.register('exchange_rate', { valueAsNumber: true })}
                    disabled={saving || !form.watch('enable_dual_currency')}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-60"
                  />
                  {form.formState.errors.exchange_rate && (
                    <p className="text-xs text-red-500 mt-1">{form.formState.errors.exchange_rate.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Preferred locale
                  </label>
                  <Combobox
                    value={form.watch('preferred_locale')}
                    onValueChange={(value) => form.setValue('preferred_locale', value, { shouldDirty: true })}
                    options={LOCALES.map((l) => ({
                      value: l.value,
                      label: l.label,
                    }))}
                    placeholder="Select locale"
                    searchPlaceholder="Search locales..."
                    emptyText="No locales found."
                    disabled={saving}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Listing gender preference
                </label>
                <Combobox
                  value={form.watch('gender_preference')}
                  onValueChange={(value) => form.setValue('gender_preference', value as any, { shouldDirty: true })}
                  options={GENDER_PREFS.map((g) => ({
                    value: g.value,
                    label: g.label,
                  }))}
                  placeholder="Select gender preference"
                  searchPlaceholder="Search preferences..."
                  emptyText="No preferences found."
                  disabled={saving}
                  className="w-full max-w-md"
                />
              </div>

              {/* Booking Policies */}
              <div className="pt-4 mt-4 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground mb-1">Booking Policies</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Configure how customers can cancel, reschedule, or receive refunds for their bookings.
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
                    <Combobox
                      value={form.watch('cancellation_policy_mode')}
                      onValueChange={(value) => form.setValue('cancellation_policy_mode', value as any, { shouldDirty: true })}
                      options={POLICY_MODES.map((m) => ({
                        value: m.value,
                        label: m.label,
                      }))}
                      placeholder="Select policy mode"
                      searchPlaceholder="Search modes..."
                      emptyText="No modes found."
                      disabled={saving}
                      className="w-full"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      &quot;Allow with warning&quot; lets customers proceed with a notice. &quot;Block&quot; prevents changes inside the window.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border/40">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Refund Policy Window (hours)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={168}
                      {...form.register('refund_window_hours', { valueAsNumber: true })}
                      disabled={saving}
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-60"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Disable customer refunds if they cancel within this number of hours before the appointment.
                    </p>
                    {form.formState.errors.refund_window_hours && (
                      <p className="text-xs text-red-500 mt-1">{form.formState.errors.refund_window_hours.message}</p>
                    )}
                  </div>
                  <div className="flex items-center bg-muted/20 rounded-2xl border border-border p-4 h-full self-start">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      💡 <strong>Note:</strong> When a client cancels a pre-paid booking within this hourly window, any online payment refund is automatically disabled.
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
