'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { locationsApi, servicesApi, type Location, type Service } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form } from '@/components/ui/form';
import { RHFTextField } from '@/components/fields/RHFTextField';
import { RHFTextareaField } from '@/components/fields/RHFTextareaField';
import { Combobox } from '@/components/ui/combobox';
import { Pagination } from '@/components/data/Pagination';
import { type PaginationMeta } from '@/lib/api';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  duration_minutes: z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number().int().min(1, 'Duration must be at least 1 minute'),
  ),
  price: z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number().min(0, 'Price must be 0 or more'),
  ),
  cost: z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number().min(0, 'Cost must be 0 or more').optional(),
  ),
  is_active: z.boolean().default(true),
});
type Values = z.infer<typeof schema>;

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Location[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);

  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [availabilityService, setAvailabilityService] = useState<Service | null>(null);
  const [availabilityBranchId, setAvailabilityBranchId] = useState<string>('');
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [availabilityTab, setAvailabilityTab] = useState<'weekly' | 'overrides'>('weekly');
  const [rangeFrom, setRangeFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [rangeTo, setRangeTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      duration_minutes: 30,
      price: 0,
      cost: 0,
      is_active: true,
    },
    mode: 'onSubmit',
  });

  const load = async (p = page) => {
    setLoading(true);
    const res = await servicesApi.list({
      include_inactive: true,
      q: q.trim() || undefined,
      status,
      page: p,
      per_page: 20,
    });
    setLoading(false);
    if ('error' in res && res.error) toastError(res.error);
    else if (res.data?.services) {
      setServices(res.data.services);
      setMeta((res as any).meta ?? null);
      setPage(p);
    }
  };

  useEffect(() => {
    load();
    locationsApi.list().then((r) => {
      if (!('error' in r) && r.data?.locations) setBranches(r.data.locations);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      load(1);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  const openCreate = () => {
    setEditing(null);
    form.reset({
      name: '',
      description: '',
      duration_minutes: 30,
      price: 0,
      cost: 0,
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    form.reset({
      name: s.name ?? '',
      description: (s.description as any) ?? '',
      duration_minutes: Number(s.duration_minutes ?? 30),
      price: Number(s.price ?? 0),
      cost: s.cost != null ? Number(s.cost) : 0,
      is_active: !!s.is_active,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: Values) => {
    setSaving(true);
    try {
      if (editing?.id) {
        const res = await servicesApi.update(String(editing.id), {
          name: values.name,
          description: values.description ?? null,
          duration_minutes: values.duration_minutes,
          price: values.price,
          cost: values.cost ?? 0,
          is_active: values.is_active,
        } as any);
        if ('error' in res && res.error) toastError(res.error);
        else {
          toastSuccess('Service updated.');
          setModalOpen(false);
          await load();
        }
      } else {
        const res = await servicesApi.create({
          name: values.name,
          description: values.description ?? null,
          duration_minutes: values.duration_minutes,
          price: values.price,
          cost: values.cost ?? 0,
          is_active: values.is_active,
        });
        if ('error' in res && res.error) toastError(res.error);
        else {
          toastSuccess('Service created.');
          setModalOpen(false);
          await load();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (s: Service) => {
    const ok = window.confirm(`Delete service "${s.name}"? This cannot be undone.`);
    if (!ok) return;
    setSaving(true);
    try {
      const res = await servicesApi.delete(String(s.id));
      if ('error' in res && (res as any).error) toastError((res as any).error);
      else {
        toastSuccess('Service deleted.');
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (s: Service) => {
    setSaving(true);
    try {
      const res = await servicesApi.update(String(s.id), {
        is_active: !s.is_active,
      } as any);
      if ('error' in res && res.error) toastError(res.error);
      else {
        toastSuccess(!s.is_active ? 'Service activated.' : 'Service deactivated.');
        setServices((prev) =>
          prev.map((x) => (String(x.id) === String(s.id) ? { ...x, is_active: !s.is_active } : x)),
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const openAvailability = async (s: Service) => {
    setAvailabilityService(s);
    setAvailabilityOpen(true);
    setAvailabilityTab('weekly');
    const first = branches[0]?.id ?? '';
    setAvailabilityBranchId(first);
  };

  const branchOptions = useMemo(
    () =>
      branches.map((b) => ({
        value: String(b.id),
        label: String(b.name ?? 'Unnamed branch'),
      })),
    [branches],
  );

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const loadAvailability = async (serviceId: string, branchId: string) => {
    setAvailabilityLoading(true);
    try {
      const [aRes, oRes] = await Promise.all([
        servicesApi.availability.list(serviceId, branchId),
        servicesApi.overrides.list(serviceId, { branch_id: branchId, from: rangeFrom, to: rangeTo }),
      ]);
      if ('error' in aRes && aRes.error) toastError(aRes.error);
      else setAvailabilities((aRes as any).data?.availabilities ?? []);
      if ('error' in oRes && oRes.error) toastError(oRes.error);
      else setOverrides((oRes as any).data?.overrides ?? []);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  useEffect(() => {
    if (!availabilityOpen || !availabilityService?.id || !availabilityBranchId) return;
    loadAvailability(String(availabilityService.id), String(availabilityBranchId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availabilityOpen, availabilityService?.id, availabilityBranchId, rangeFrom, rangeTo]);

  const availabilityFormSchema = z.object({
    day_of_week: z.preprocess((v) => Number(v), z.number().int().min(0).max(6)),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:mm'),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:mm'),
    slot_minutes: z
      .preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().int().min(5).nullable())
      .optional(),
  }).refine((v) => v.start_time < v.end_time, { message: 'End time must be after start time', path: ['end_time'] });

  type AvailabilityValues = z.infer<typeof availabilityFormSchema>;

  const availabilityForm = useForm<AvailabilityValues>({
    resolver: zodResolver(availabilityFormSchema),
    defaultValues: { day_of_week: 1, start_time: '09:00', end_time: '17:00', slot_minutes: null },
    mode: 'onSubmit',
  });

  const addAvailability = async (values: AvailabilityValues) => {
    if (!availabilityService?.id || !availabilityBranchId) return;
    const res = await servicesApi.availability.create(String(availabilityService.id), {
      branch_id: String(availabilityBranchId),
      day_of_week: values.day_of_week,
      start_time: values.start_time,
      end_time: values.end_time,
      slot_minutes: values.slot_minutes ?? null,
      is_active: true,
    });
    if ('error' in res && res.error) toastError(res.error);
    else {
      toastSuccess('Availability added.');
      availabilityForm.reset({ ...values });
      await loadAvailability(String(availabilityService.id), String(availabilityBranchId));
    }
  };

  const deleteAvailability = async (id: string) => {
    if (!availabilityService?.id) return;
    const ok = window.confirm('Delete this availability slot?');
    if (!ok) return;
    const res = await servicesApi.availability.delete(String(availabilityService.id), id);
    if ('error' in res && (res as any).error) toastError((res as any).error);
    else {
      toastSuccess('Availability deleted.');
      await loadAvailability(String(availabilityService.id), String(availabilityBranchId));
    }
  };

  const overrideSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
    is_closed: z.boolean().default(false),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:mm').optional().nullable(),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:mm').optional().nullable(),
    slot_minutes: z
      .preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().int().min(5).nullable())
      .optional(),
  }).superRefine((v, ctx) => {
    if (v.is_closed) return;
    if (!v.start_time || !v.end_time) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Start/end time required unless closed', path: ['start_time'] });
    } else if (v.start_time >= v.end_time) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'End time must be after start time', path: ['end_time'] });
    }
  });

  type OverrideValues = z.infer<typeof overrideSchema>;
  const overrideForm = useForm<OverrideValues>({
    resolver: zodResolver(overrideSchema),
    defaultValues: { date: rangeFrom, is_closed: false, start_time: '09:00', end_time: '17:00', slot_minutes: null },
    mode: 'onSubmit',
  });

  const addOverride = async (values: OverrideValues) => {
    if (!availabilityService?.id || !availabilityBranchId) return;
    const res = await servicesApi.overrides.create(String(availabilityService.id), {
      branch_id: String(availabilityBranchId),
      date: values.date,
      is_closed: values.is_closed,
      start_time: values.is_closed ? null : (values.start_time ?? null),
      end_time: values.is_closed ? null : (values.end_time ?? null),
      slot_minutes: values.slot_minutes ?? null,
    });
    if ('error' in res && res.error) toastError(res.error);
    else {
      toastSuccess('Override added.');
      await loadAvailability(String(availabilityService.id), String(availabilityBranchId));
    }
  };

  const deleteOverride = async (id: string) => {
    if (!availabilityService?.id) return;
    const ok = window.confirm('Delete this override?');
    if (!ok) return;
    const res = await servicesApi.overrides.delete(String(availabilityService.id), id);
    if ('error' in res && (res as any).error) toastError((res as any).error);
    else {
      toastSuccess('Override deleted.');
      await loadAvailability(String(availabilityService.id), String(availabilityBranchId));
    }
  };

  if (loading) return <p className="text-salon-stone">Loading services...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-salon-espresso">Services</h1>
          <p className="text-salon-stone text-sm mt-1">
            Create and manage services offered by your salon.
          </p>
        </div>
        <Button onClick={openCreate} className="rounded-xl h-11" disabled={saving}>
          New service
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-salon-stone mb-1">Search</label>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or description"
          />
        </div>
        <div className="w-full sm:w-44">
          <label className="block text-xs font-semibold text-salon-stone mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm overflow-hidden">
        {services.length === 0 ? (
          <p className="p-6 text-salon-stone text-center">No services found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-[140px]">Duration</TableHead>
                <TableHead className="w-[140px]">Price</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="text-right w-[220px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{s.name}</p>
                      {s.description ? (
                        <p className="text-xs text-muted-foreground truncate">
                          {String(s.description)}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {Number(s.duration_minutes ?? 0)} min
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {Number(s.price ?? 0).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                        s.is_active
                          ? 'bg-green-50 text-emerald-700 border-emerald-200'
                          : 'bg-salon-sand/30 text-salon-espresso border-salon-sand/60'
                      }`}
                    >
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-2">
                      <Button
                        variant="outline"
                        className="h-9 rounded-xl"
                        onClick={() => openEdit(s)}
                        disabled={saving}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-9 rounded-xl"
                        onClick={() => openAvailability(s)}
                        disabled={saving}
                      >
                        Availability
                      </Button>
                      <Button
                        variant="secondary"
                        className="h-9 rounded-xl"
                        onClick={() => toggleActive(s)}
                        disabled={saving}
                      >
                        {s.is_active ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="destructive"
                        className="h-9 rounded-xl"
                        onClick={() => onDelete(s)}
                        disabled={saving}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <Pagination meta={meta} onPageChange={(p) => load(p)} />

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-salon-sand/40">
            <div className="p-5 border-b border-salon-sand/40 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold text-salon-espresso">
                  {editing ? 'Edit service' : 'New service'}
                </h2>
                <p className="text-xs text-salon-stone mt-1">
                  {editing ? 'Update service details.' : 'Create a new service for your salon.'}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-5">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit, () =>
                    toastError('Please check the highlighted fields.'),
                  )}
                  className="space-y-4"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <RHFTextField
                      control={form.control}
                      name="name"
                      label="Name"
                      placeholder="Haircut"
                      disabled={saving}
                    />
                    <RHFTextField
                      control={form.control}
                      name="duration_minutes"
                      label="Duration (minutes)"
                      placeholder="30"
                      type="number"
                      inputMode="numeric"
                      disabled={saving}
                    />
                    <RHFTextField
                      control={form.control}
                      name="price"
                      label="Price"
                      placeholder="0"
                      type="number"
                      inputMode="decimal"
                      disabled={saving}
                    />
                    <RHFTextField
                      control={form.control}
                      name="cost"
                      label="Cost"
                      placeholder="0"
                      type="number"
                      inputMode="decimal"
                      disabled={saving}
                    />
                  </div>

                  <RHFTextareaField
                    control={form.control}
                    name="description"
                    label="Description"
                    placeholder="Optional description…"
                    disabled={saving}
                    rows={3}
                  />

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!form.watch('is_active')}
                      onChange={(e) => form.setValue('is_active', e.target.checked)}
                      className="size-4"
                      disabled={saving}
                    />
                    <span>Active</span>
                  </label>

                  <div className="pt-1 flex flex-col sm:flex-row gap-2 sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setModalOpen(false)}
                      disabled={saving}
                      className="rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving} className="rounded-xl">
                      {saving ? 'Saving…' : editing ? 'Save changes' : 'Create service'}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>
      ) : null}

      {availabilityOpen && availabilityService ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl border border-salon-sand/40 overflow-hidden">
            <div className="p-5 border-b border-salon-sand/40 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold text-salon-espresso truncate">
                  Availability · {availabilityService.name}
                </h2>
                <p className="text-xs text-salon-stone mt-1">
                  Configure weekly schedule and date overrides per branch.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setAvailabilityOpen(false)}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-salon-stone mb-1">Branch</p>
                  <Combobox
                    value={availabilityBranchId}
                    onValueChange={setAvailabilityBranchId}
                    options={branchOptions}
                    placeholder="Select branch"
                    searchPlaceholder="Search branches..."
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    type="button"
                    variant={availabilityTab === 'weekly' ? 'default' : 'outline'}
                    className="rounded-xl"
                    onClick={() => setAvailabilityTab('weekly')}
                  >
                    Weekly
                  </Button>
                  <Button
                    type="button"
                    variant={availabilityTab === 'overrides' ? 'default' : 'outline'}
                    className="rounded-xl"
                    onClick={() => setAvailabilityTab('overrides')}
                  >
                    Overrides
                  </Button>
                </div>
              </div>

              {availabilityLoading ? (
                <p className="text-sm text-salon-stone">Loading availability…</p>
              ) : availabilityTab === 'weekly' ? (
                <div className="space-y-3">
                  <div className="bg-salon-sand/20 rounded-xl border border-salon-sand/40 p-4">
                    <Form {...availabilityForm}>
                      <form
                        onSubmit={availabilityForm.handleSubmit(addAvailability, () =>
                          toastError('Please check the highlighted fields.'),
                        )}
                        className="grid gap-3 sm:grid-cols-4"
                      >
                        <div className="space-y-2">
                          <label className="text-sm font-medium leading-none">Day</label>
                          <select
                            value={availabilityForm.watch('day_of_week') as any}
                            onChange={(e) => availabilityForm.setValue('day_of_week', Number(e.target.value) as any)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {dayNames.map((d, idx) => (
                              <option key={d} value={idx}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>
                        <RHFTextField
                          control={availabilityForm.control}
                          name="start_time"
                          label="Start"
                          placeholder="09:00"
                        />
                        <RHFTextField
                          control={availabilityForm.control}
                          name="end_time"
                          label="End"
                          placeholder="17:00"
                        />
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <RHFTextField
                              control={availabilityForm.control}
                              name="slot_minutes"
                              label="Slot (min)"
                              placeholder={`${availabilityService.duration_minutes ?? 30}`}
                              type="number"
                              inputMode="numeric"
                            />
                          </div>
                          <Button type="submit" className="h-9 rounded-xl">
                            Add
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </div>

                  <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm overflow-hidden">
                    {availabilities.length === 0 ? (
                      <p className="p-6 text-salon-stone text-center text-sm">
                        No weekly availability yet.
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Day</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Slot</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {availabilities.map((a) => (
                            <TableRow key={a.id}>
                              <TableCell>{dayNames[Number(a.day_of_week) || 0]}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {a.start_time}–{a.end_time}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {a.slot_minutes ?? '—'}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  className="h-9 rounded-xl"
                                  onClick={() => deleteAvailability(String(a.id))}
                                >
                                  Delete
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-semibold text-salon-stone mb-1">
                        From
                      </label>
                      <Input value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-salon-stone mb-1">To</label>
                      <Input value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} />
                    </div>
                  </div>

                  <div className="bg-salon-sand/20 rounded-xl border border-salon-sand/40 p-4">
                    <Form {...overrideForm}>
                      <form
                        onSubmit={overrideForm.handleSubmit(addOverride, () =>
                          toastError('Please check the highlighted fields.'),
                        )}
                        className="grid gap-3 sm:grid-cols-5"
                      >
                        <RHFTextField
                          control={overrideForm.control}
                          name="date"
                          label="Date"
                          placeholder="YYYY-MM-DD"
                        />
                        <div className="flex items-end gap-2">
                          <label className="flex items-center gap-2 text-sm h-9">
                            <input
                              type="checkbox"
                              checked={!!overrideForm.watch('is_closed')}
                              onChange={(e) => overrideForm.setValue('is_closed', e.target.checked)}
                              className="size-4"
                            />
                            <span>Closed</span>
                          </label>
                        </div>
                        <RHFTextField
                          control={overrideForm.control}
                          name="start_time"
                          label="Start"
                          placeholder="09:00"
                          disabled={!!overrideForm.watch('is_closed')}
                        />
                        <RHFTextField
                          control={overrideForm.control}
                          name="end_time"
                          label="End"
                          placeholder="17:00"
                          disabled={!!overrideForm.watch('is_closed')}
                        />
                        <div className="flex items-end gap-2">
                          <Button type="submit" className="h-9 rounded-xl">
                            Add
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </div>

                  <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm overflow-hidden">
                    {overrides.length === 0 ? (
                      <p className="p-6 text-salon-stone text-center text-sm">
                        No overrides in this date range.
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {overrides.map((o) => (
                            <TableRow key={o.id}>
                              <TableCell>{o.date}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {o.is_closed ? 'Closed' : `${o.start_time}–${o.end_time}`}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  className="h-9 rounded-xl"
                                  onClick={() => deleteOverride(String(o.id))}
                                >
                                  Delete
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
