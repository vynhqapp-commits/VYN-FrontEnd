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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-[var(--elite-card)] rounded-2xl shadow-xl w-full max-w-2xl border border-[var(--elite-border)]">
            <div className="p-5 border-b border-[var(--elite-border)] flex items-start justify-between gap-3">
              <h2 className="font-display text-xl font-semibold elite-title">
                {editing ? 'Edit location' : 'New location'}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg elite-subtle hover:bg-[var(--elite-card-2)] transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <RHFTextField control={form.control} name="name" label="Name" placeholder="Main branch" />
                    <RHFTextField control={form.control} name="phone" label="Phone" placeholder="+1 555 000 0000" />
                    <RHFTextField control={form.control} name="contact_email" label="Contact email" placeholder="branch@example.com" />
                    <RHFTextField control={form.control} name="timezone" label="Timezone" placeholder="UTC" />
                  </div>
                  <RHFTextField control={form.control} name="address" label="Address" placeholder="Street, city, country" />
                  <RHFTextareaField
                    control={form.control}
                    name="working_hours"
                    label="Working hours"
                    placeholder="Mon-Fri 09:00-18:00, Sat 10:00-16:00"
                    rows={3}
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!form.watch('is_active')}
                      onChange={(e) => form.setValue('is_active', e.target.checked)}
                    />
                    <span>Active</span>
                  </label>
                  <div className="flex justify-end gap-2">
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
