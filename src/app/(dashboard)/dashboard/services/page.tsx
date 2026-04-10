'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2, X, Package, CreditCard } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { locationsApi, servicesApi, salonProfileApi, catalogApi, type Location, type Service, type PackageTemplate, type MembershipPlanTemplate } from '@/lib/api';
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
import { Skeleton } from '@/components/ui/skeleton';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

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
  deposit_amount: z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number().min(0, 'Deposit must be 0 or more').optional(),
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
  const [currency, setCurrency] = useState('USD');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);

  /* ── Top-level tab ── */
  const [activeTab, setActiveTab] = useState<'services' | 'packages' | 'memberships'>('services');

  /* ── Packages state ── */
  const [packages, setPackages] = useState<PackageTemplate[]>([]);
  const [pkgLoading, setPkgLoading] = useState(false);
  const [pkgModalOpen, setPkgModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<PackageTemplate | null>(null);
  const [pkgSaving, setPkgSaving] = useState(false);

  /* ── Memberships state ── */
  const [memberships, setMemberships] = useState<MembershipPlanTemplate[]>([]);
  const [memLoading, setMemLoading] = useState(false);
  const [memModalOpen, setMemModalOpen] = useState(false);
  const [editingMem, setEditingMem] = useState<MembershipPlanTemplate | null>(null);
  const [memSaving, setMemSaving] = useState(false);

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
      deposit_amount: 0,
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
    salonProfileApi.get().then((r) => {
      if (!('error' in r) && r.data?.salon?.currency) setCurrency(r.data.salon.currency);
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
      deposit_amount: 0,
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
      deposit_amount: s.deposit_amount != null ? Number(s.deposit_amount) : 0,
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
          deposit_amount: values.deposit_amount ?? 0,
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
          deposit_amount: values.deposit_amount ?? 0,
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

  /* ── Package CRUD helpers ── */
  const loadPackages = async () => {
    setPkgLoading(true);
    const res = await catalogApi.listPackages();
    setPkgLoading(false);
    if ('error' in res && res.error) toastError(res.error);
    else setPackages((res as any).data?.packages ?? []);
  };

  const savePkg = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      name: String(fd.get('name') ?? ''),
      description: String(fd.get('description') ?? '') || undefined,
      price: Number(fd.get('price') ?? 0),
      total_sessions: Number(fd.get('total_sessions') ?? 1),
      validity_days: fd.get('validity_days') ? Number(fd.get('validity_days')) : null,
      is_active: fd.get('is_active') === 'on',
    };
    if (!body.name) { toastError('Name is required'); return; }
    setPkgSaving(true);
    const res = editingPkg
      ? await catalogApi.updatePackage(editingPkg.id, body)
      : await catalogApi.createPackage(body as any);
    setPkgSaving(false);
    if ('error' in res && res.error) toastError(res.error);
    else { toastSuccess(editingPkg ? 'Package updated.' : 'Package created.'); setPkgModalOpen(false); loadPackages(); }
  };

  const deletePkg = async (p: PackageTemplate) => {
    if (!window.confirm(`Delete package "${p.name}"?`)) return;
    const res = await catalogApi.deletePackage(p.id);
    if ('error' in res && res.error) toastError(res.error);
    else { toastSuccess('Package deleted.'); loadPackages(); }
  };

  /* ── Membership CRUD helpers ── */
  const loadMemberships = async () => {
    setMemLoading(true);
    const res = await catalogApi.listMemberships();
    setMemLoading(false);
    if ('error' in res && res.error) toastError(res.error);
    else setMemberships((res as any).data?.memberships ?? []);
  };

  const saveMem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      name: String(fd.get('name') ?? ''),
      description: String(fd.get('description') ?? '') || undefined,
      price: Number(fd.get('price') ?? 0),
      interval_months: Number(fd.get('interval_months') ?? 1),
      credits_per_renewal: Number(fd.get('credits_per_renewal') ?? 0),
      is_active: fd.get('is_active') === 'on',
    };
    if (!body.name) { toastError('Name is required'); return; }
    setMemSaving(true);
    const res = editingMem
      ? await catalogApi.updateMembership(editingMem.id, body)
      : await catalogApi.createMembership(body as any);
    setMemSaving(false);
    if ('error' in res && res.error) toastError(res.error);
    else { toastSuccess(editingMem ? 'Membership updated.' : 'Membership created.'); setMemModalOpen(false); loadMemberships(); }
  };

  const deleteMem = async (m: MembershipPlanTemplate) => {
    if (!window.confirm(`Delete membership "${m.name}"?`)) return;
    const res = await catalogApi.deleteMembership(m.id);
    if ('error' in res && res.error) toastError(res.error);
    else { toastSuccess('Membership deleted.'); loadMemberships(); }
  };

  useEffect(() => {
    if (activeTab === 'packages' && packages.length === 0 && !pkgLoading) loadPackages();
    if (activeTab === 'memberships' && memberships.length === 0 && !memLoading) loadMemberships();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 elite-shell">
      <DashboardPageHeader
        title="Services & Catalog"
        description="Manage services, packages, and membership plans."
        icon={<Pencil className="w-5 h-5" />}
        rightSlot={
          activeTab === 'services' ? (
            <Button onClick={openCreate} className="rounded-xl h-11" disabled={saving}>New service</Button>
          ) : activeTab === 'packages' ? (
            <Button onClick={() => { setEditingPkg(null); setPkgModalOpen(true); }} className="rounded-xl h-11">New package</Button>
          ) : (
            <Button onClick={() => { setEditingMem(null); setMemModalOpen(true); }} className="rounded-xl h-11">New membership</Button>
          )
        }
      />

      {/* ── Tab bar ── */}
      <div className="flex gap-1 border-b border-[var(--elite-border)] pb-0">
        {([
          { key: 'services' as const, label: 'Services', icon: <Pencil className="w-3.5 h-3.5" /> },
          { key: 'packages' as const, label: 'Packages', icon: <Package className="w-3.5 h-3.5" /> },
          { key: 'memberships' as const, label: 'Memberships', icon: <CreditCard className="w-3.5 h-3.5" /> },
        ]).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════ Services Tab ═══════════════════ */}
      {activeTab === 'services' && <>
      <div className="elite-panel p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex-1">
          <label className="block text-xs font-semibold elite-subtle mb-1">Search</label>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or description"
          />
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
        {services.length === 0 ? (
          <p className="p-6 text-muted-foreground text-center">No services found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-[140px]">Duration</TableHead>
                <TableHead className="w-[140px]">Price</TableHead>
                <TableHead className="w-[140px]">Deposit</TableHead>
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
                    {Number(s.price ?? 0).toLocaleString('en-US', { style: 'currency', currency })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {Number(s.deposit_amount ?? 0).toLocaleString('en-US', { style: 'currency', currency })}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                        s.is_active
                          ? 'bg-green-50 text-emerald-700 border-emerald-200'
                          : 'bg-muted/40 text-foreground border-border'
                      }`}
                    >
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEdit(s)} disabled={saving} title="Edit">
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-9 rounded-xl"
                        onClick={() => openAvailability(s)}
                        disabled={saving}
                      >
                        Availability
                      </Button>
                      <Button variant="secondary" className="h-9 rounded-xl" onClick={() => toggleActive(s)} disabled={saving}>
                        {s.is_active ? 'Disable' : 'Enable'}
                      </Button>
                      <Button variant="destructive" size="icon" className="h-8 w-8 rounded-lg" onClick={() => onDelete(s)} disabled={saving} title="Delete">
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
      <Pagination meta={meta} onPageChange={(p) => load(p)} />

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[1px] p-2 sm:p-4">
          <div className="bg-[var(--elite-card)] rounded-2xl shadow-xl w-full max-w-2xl border border-[var(--elite-border)]">
            <div className="p-5 border-b border-[var(--elite-border)] flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold elite-title">
                  {editing ? 'Edit service' : 'New service'}
                </h2>
                <p className="text-xs elite-subtle mt-1">
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
                    <RHFTextField
                      control={form.control}
                      name="deposit_amount"
                      label="Deposit amount"
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[1px] p-2 sm:p-4">
          <div className="bg-[var(--elite-card)] rounded-2xl shadow-xl w-full max-w-4xl border border-[var(--elite-border)] overflow-hidden">
            <div className="p-5 border-b border-[var(--elite-border)] flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold elite-title truncate">
                  Availability · {availabilityService.name}
                </h2>
                <p className="text-xs elite-subtle mt-1">
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
                  <p className="text-xs font-semibold elite-subtle mb-1">Branch</p>
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
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              ) : availabilityTab === 'weekly' ? (
                <div className="space-y-3">
                  <div className="elite-panel-soft p-4">
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

                  <div className="elite-panel overflow-hidden">
                    {availabilities.length === 0 ? (
                      <p className="p-6 text-muted-foreground text-center text-sm">
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
                      <label className="block text-xs font-semibold elite-subtle mb-1">
                        From
                      </label>
                      <Input value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold elite-subtle mb-1">To</label>
                      <Input value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} />
                    </div>
                  </div>

                  <div className="elite-panel-soft p-4">
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

                  <div className="elite-panel overflow-hidden">
                    {overrides.length === 0 ? (
                      <p className="p-6 text-muted-foreground text-center text-sm">
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
      </>}

      {/* ═══════════════════ Packages Tab ═══════════════════ */}
      {activeTab === 'packages' && (
        <>
          <div className="elite-panel overflow-hidden">
            {pkgLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ) : packages.length === 0 ? (
              <p className="p-6 text-muted-foreground text-center">No packages yet. Create your first package template.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-[120px]">Price</TableHead>
                    <TableHead className="w-[100px]">Sessions</TableHead>
                    <TableHead className="w-[120px]">Validity</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="text-right w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{p.name}</p>
                          {p.description && <p className="text-xs text-muted-foreground truncate">{p.description}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {Number(p.price).toLocaleString('en-US', { style: 'currency', currency })}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.total_sessions}</TableCell>
                      <TableCell className="text-muted-foreground">{p.validity_days ? `${p.validity_days} days` : 'No expiry'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${p.is_active ? 'bg-green-50 text-emerald-700 border-emerald-200' : 'bg-muted/40 text-foreground border-border'}`}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => { setEditingPkg(p); setPkgModalOpen(true); }} title="Edit">
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="destructive" size="icon" className="h-8 w-8 rounded-lg" onClick={() => deletePkg(p)} title="Delete">
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

          {pkgModalOpen && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[1px] p-2 sm:p-4">
              <div className="bg-[var(--elite-card)] rounded-2xl shadow-xl w-full max-w-lg border border-[var(--elite-border)]">
                <div className="p-5 border-b border-[var(--elite-border)] flex items-start justify-between gap-3">
                  <h2 className="font-display text-xl font-semibold elite-title">{editingPkg ? 'Edit package' : 'New package'}</h2>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setPkgModalOpen(false)} aria-label="Close"><X className="w-4 h-4" /></Button>
                </div>
                <form onSubmit={savePkg} className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Name</label>
                    <Input name="name" defaultValue={editingPkg?.name ?? ''} placeholder="e.g. 10 Haircuts Bundle" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Description</label>
                    <Input name="description" defaultValue={editingPkg?.description ?? ''} placeholder="Optional description" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1.5">Price</label>
                      <Input name="price" type="number" step="0.01" min="0" defaultValue={editingPkg ? Number(editingPkg.price) : ''} placeholder="150" required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1.5">Total sessions</label>
                      <Input name="total_sessions" type="number" min="1" defaultValue={editingPkg?.total_sessions ?? ''} placeholder="10" required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1.5">Validity (days)</label>
                      <Input name="validity_days" type="number" min="1" defaultValue={editingPkg?.validity_days ?? ''} placeholder="Leave empty for no expiry" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="is_active" defaultChecked={editingPkg?.is_active ?? true} className="size-4" />
                    <span>Active</span>
                  </label>
                  <div className="flex gap-2 justify-end pt-1">
                    <Button type="button" variant="outline" onClick={() => setPkgModalOpen(false)} className="rounded-xl">Cancel</Button>
                    <Button type="submit" disabled={pkgSaving} className="rounded-xl">{pkgSaving ? 'Saving…' : editingPkg ? 'Save changes' : 'Create package'}</Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════ Memberships Tab ═══════════════════ */}
      {activeTab === 'memberships' && (
        <>
          <div className="elite-panel overflow-hidden">
            {memLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ) : memberships.length === 0 ? (
              <p className="p-6 text-muted-foreground text-center">No membership plans yet. Create your first membership template.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-[120px]">Price</TableHead>
                    <TableHead className="w-[120px]">Interval</TableHead>
                    <TableHead className="w-[140px]">Credits / Renewal</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="text-right w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberships.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{m.name}</p>
                          {m.description && <p className="text-xs text-muted-foreground truncate">{m.description}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {Number(m.price).toLocaleString('en-US', { style: 'currency', currency })}
                      </TableCell>
                      <TableCell className="text-muted-foreground">Every {m.interval_months} mo</TableCell>
                      <TableCell className="text-muted-foreground">{m.credits_per_renewal} sessions</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${m.is_active ? 'bg-green-50 text-emerald-700 border-emerald-200' : 'bg-muted/40 text-foreground border-border'}`}>
                          {m.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => { setEditingMem(m); setMemModalOpen(true); }} title="Edit">
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="destructive" size="icon" className="h-8 w-8 rounded-lg" onClick={() => deleteMem(m)} title="Delete">
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

          {memModalOpen && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[1px] p-2 sm:p-4">
              <div className="bg-[var(--elite-card)] rounded-2xl shadow-xl w-full max-w-lg border border-[var(--elite-border)]">
                <div className="p-5 border-b border-[var(--elite-border)] flex items-start justify-between gap-3">
                  <h2 className="font-display text-xl font-semibold elite-title">{editingMem ? 'Edit membership plan' : 'New membership plan'}</h2>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setMemModalOpen(false)} aria-label="Close"><X className="w-4 h-4" /></Button>
                </div>
                <form onSubmit={saveMem} className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Name</label>
                    <Input name="name" defaultValue={editingMem?.name ?? ''} placeholder="e.g. Monthly Unlimited Blowouts" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Description</label>
                    <Input name="description" defaultValue={editingMem?.description ?? ''} placeholder="Optional description" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1.5">Price</label>
                      <Input name="price" type="number" step="0.01" min="0" defaultValue={editingMem ? Number(editingMem.price) : ''} placeholder="80" required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1.5">Interval (months)</label>
                      <Input name="interval_months" type="number" min="1" defaultValue={editingMem?.interval_months ?? 1} required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1.5">Credits per renewal</label>
                      <Input name="credits_per_renewal" type="number" min="0" defaultValue={editingMem?.credits_per_renewal ?? 0} required />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="is_active" defaultChecked={editingMem?.is_active ?? true} className="size-4" />
                    <span>Active</span>
                  </label>
                  <div className="flex gap-2 justify-end pt-1">
                    <Button type="button" variant="outline" onClick={() => setMemModalOpen(false)} className="rounded-xl">Cancel</Button>
                    <Button type="submit" disabled={memSaving} className="rounded-xl">{memSaving ? 'Saving…' : editingMem ? 'Save changes' : 'Create membership'}</Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
