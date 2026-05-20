'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { locationsApi, type Location } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form } from '@/components/ui/form';
import { RHFTextField } from '@/components/fields/RHFTextField';
import { RHFTextareaField } from '@/components/fields/RHFTextareaField';
import { Skeleton } from '@/components/ui/skeleton';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { cn } from '@/lib/utils';

type DaySchedule = {
  day: string;
  is_off: boolean;
  start: string;
  end: string;
};

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

const DEFAULT_SCHEDULE: DaySchedule[] = DAYS_OF_WEEK.map(day => ({
  day,
  is_off: day === 'Sunday', // Sunday off by default
  start: '09:00',
  end: '18:00'
}));

function WorkingHoursSelector({
  value,
  onChange
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const schedule: DaySchedule[] = useMemo(() => {
    try {
      if (value) {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.length === 7 && 'day' in parsed[0]) {
          return parsed;
        }
      }
    } catch (e) {
      // Gracefully ignore parsing issues
    }
    return DEFAULT_SCHEDULE;
  }, [value]);

  const updateSchedule = (newSchedule: DaySchedule[]) => {
    onChange(JSON.stringify(newSchedule));
  };

  const handleToggleOff = (index: number) => {
    const updated = [...schedule];
    updated[index] = { ...updated[index], is_off: !updated[index].is_off };
    updateSchedule(updated);
  };

  const handleTimeChange = (index: number, field: 'start' | 'end', val: string) => {
    const updated = [...schedule];
    updated[index] = { ...updated[index], [field]: val };
    updateSchedule(updated);
  };

  const applyMondayToAll = () => {
    const monday = schedule[0];
    const updated = schedule.map((item, idx) => {
      if (idx === 0) return item;
      return {
        ...item,
        is_off: monday.is_off,
        start: monday.start,
        end: monday.end
      };
    });
    updateSchedule(updated);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-muted/10 p-5">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Working Hours Setup
        </span>
        <button
          type="button"
          onClick={applyMondayToAll}
          className="text-xs font-semibold text-[var(--elite-orange)] hover:underline flex items-center gap-1 animate-pulse"
        >
          Copy Monday's hours to all days
        </button>
      </div>

      <div className="space-y-3 pt-2">
        {schedule.map((item, idx) => (
          <div
            key={item.day}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-border bg-background shadow-2xs hover:border-border/80 transition-all"
          >
            {/* Day name & Off toggle */}
            <div className="flex items-center justify-between sm:justify-start gap-4 min-w-[145px]">
              <span className="text-sm font-semibold text-foreground w-20">{item.day}</span>
              
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={item.is_off}
                  onChange={() => handleToggleOff(idx)}
                  className="rounded border-border text-[var(--elite-orange)] focus:ring-[var(--elite-orange)] size-4"
                />
                <span className="text-xs font-semibold text-muted-foreground">Off</span>
              </label>
            </div>

            {/* Hours Selector */}
            <div className="flex items-center gap-2.5">
              {item.is_off ? (
                <div className="h-9 flex items-center px-4 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-500 text-xs font-bold uppercase tracking-wider">
                  Closed / Off
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={item.start}
                    onChange={(e) => handleTimeChange(idx, 'start', e.target.value)}
                    className="h-9 px-3 rounded-lg border border-border bg-background text-sm font-medium focus:ring-[var(--elite-orange)]/20 focus:border-[var(--elite-orange)]/40 outline-none"
                  />
                  <span className="text-muted-foreground text-xs font-medium">to</span>
                  <input
                    type="time"
                    value={item.end}
                    onChange={(e) => handleTimeChange(idx, 'end', e.target.value)}
                    className="h-9 px-3 rounded-lg border border-border bg-background text-sm font-medium focus:ring-[var(--elite-orange)]/20 focus:border-[var(--elite-orange)]/40 outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  phone: z.string().optional(),
  contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  timezone: z.string().optional(),
  working_hours: z.string().optional(),
  is_active: z.boolean().default(true),
});
type Values = z.infer<typeof schema>;

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      phone: '',
      contact_email: '',
      address: '',
      timezone: 'UTC',
      working_hours: '',
      is_active: true,
    },
  });

  const load = async () => {
    setLoading(true);
    const res = await locationsApi.list({ include_inactive: true, q: q || undefined });
    setLoading(false);
    if ('error' in res && res.error) toastError(res.error);
    else if (res.data?.locations) setLocations(res.data.locations);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const filtered = useMemo(() => {
    return locations.filter((loc) => {
      if (status === 'all') return true;
      const active = (loc.is_active ?? (loc.status === 'active')) === true;
      return status === 'active' ? active : !active;
    });
  }, [locations, status]);

  const openCreate = () => {
    setEditing(null);
    form.reset({
      name: '',
      phone: '',
      contact_email: '',
      address: '',
      timezone: 'UTC',
      working_hours: '',
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (loc: Location) => {
    setEditing(loc);
    form.reset({
      name: loc.name ?? '',
      phone: loc.phone ?? '',
      contact_email: loc.contact_email ?? '',
      address: loc.address ?? '',
      timezone: loc.timezone ?? 'UTC',
      working_hours: loc.working_hours ?? '',
      is_active: loc.is_active ?? loc.status === 'active',
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: Values) => {
    setSaving(true);
    try {
      if (editing?.id) {
        const res = await locationsApi.update(String(editing.id), {
          ...values,
          contact_email: values.contact_email || undefined,
        });
        if ('error' in res && res.error) toastError(res.error);
        else {
          toastSuccess('Location updated.');
          setModalOpen(false);
          await load();
        }
      } else {
        const res = await locationsApi.create({
          ...values,
          contact_email: values.contact_email || undefined,
        });
        if ('error' in res && res.error) toastError(res.error);
        else {
          toastSuccess('Location created.');
          setModalOpen(false);
          await load();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (loc: Location) => {
    const ok = window.confirm(`Delete location "${loc.name}"?`);
    if (!ok) return;
    const res = await locationsApi.delete(String(loc.id));
    if ('error' in res && (res as any).error) toastError((res as any).error);
    else {
      toastSuccess('Location deleted.');
      await load();
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 elite-shell">
      <DashboardPageHeader
        title="Locations"
        description="Manage multiple salon locations and their working hours."
        icon={<Pencil className="w-5 h-5" />}
        rightSlot={<Button onClick={openCreate} className="rounded-xl h-11">New location</Button>}
      />

      <div className="elite-panel p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex-1">
          <label className="block text-xs font-semibold elite-subtle mb-1">Search</label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name/address/email" />
        </div>
        <div className="w-full sm:w-44">
          <label className="block text-xs font-semibold elite-subtle mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="elite-input flex h-9 w-full px-3 py-1 text-sm"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="elite-panel overflow-hidden">
        {filtered.length === 0 ? (
          <p className="p-6 text-muted-foreground text-center">No locations found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((loc) => (
                <TableRow key={loc.id}>
                  <TableCell className="font-medium">{loc.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {loc.phone || loc.contact_email || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{loc.address ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {loc.is_active ?? loc.status === 'active' ? 'Active' : 'Inactive'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => openEdit(loc)}
                        aria-label="Edit location"
                        title="Edit location"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => onDelete(loc)}
                        aria-label="Delete location"
                        title="Delete location"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[1px] p-2 sm:p-4">
          <div className="bg-[var(--elite-card)] rounded-2xl shadow-xl w-full max-w-2xl border border-[var(--elite-border)]">
            <div className="p-5 border-b border-[var(--elite-border)] flex items-start justify-between gap-3">
              <h2 className="font-display text-xl font-semibold elite-title">
                {editing ? 'Edit location' : 'New location'}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg elite-subtle hover:bg-[var(--elite-card-2)] transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 max-h-[75vh] overflow-y-auto elite-scrollbar">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <RHFTextField control={form.control} name="name" label="Name" placeholder="Main branch" />
                    <RHFTextField control={form.control} name="phone" label="Phone" placeholder="+1 555 000 0000" />
                    <RHFTextField control={form.control} name="contact_email" label="Contact email" placeholder="branch@example.com" />
                    <RHFTextField control={form.control} name="timezone" label="Timezone" placeholder="UTC" />
                  </div>
                  <RHFTextField control={form.control} name="address" label="Address" placeholder="Street, city, country" />
                  
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Working Hours
                    </label>
                    <WorkingHoursSelector
                      value={form.watch('working_hours') ?? ''}
                      onChange={(val) => form.setValue('working_hours', val, { shouldDirty: true })}
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!form.watch('is_active')}
                      onChange={(e) => form.setValue('is_active', e.target.checked)}
                      className="rounded border-border text-[var(--elite-orange)] focus:ring-[var(--elite-orange)] size-4"
                    />
                    <span className="font-semibold text-foreground">Active</span>
                  </label>
                  <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                    <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save' : 'Create'}</Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
