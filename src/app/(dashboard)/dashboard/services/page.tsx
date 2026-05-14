'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2, X, Package, CreditCard, Plus, Ticket, Layers, Search } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { locationsApi, servicesApi, settingsApi, catalogApi, couponsApi, addOnsApi, productsApi, staffApi, type Location, type Service, type ServicePricingTier, type ServiceAddOn, type PackageTemplate, type MembershipPlanTemplate, type Coupon, type Product, type StaffMember } from '@/lib/api';
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select';
import { useAuth } from '@/lib/auth-context';
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
  const { user } = useAuth();
  const canManageCatalog = user?.role === 'salon_owner' || user?.role === 'manager';

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

  /* ── Pricing tiers local state (managed outside react-hook-form) ── */
  const [tiers, setTiers] = useState<{ tier_label: string; price: number }[]>([]);

  /* ── Product requirements local state ── */
  const [products, setProducts] = useState<Product[]>([]);
  const [productRequirements, setProductRequirements] = useState<{ product_id: string; quantity: number }[]>([]);

  /* ── Staff assignment local state ── */
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  /* ── Top-level tab ── */
  const [activeTab, setActiveTab] = useState<'services' | 'packages' | 'memberships' | 'coupons'>('services');

  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: String(p.id),
        label: p.name ?? 'Unnamed product',
      })),
    [products],
  );

  /* ── Packages state ── */
  const [packages, setPackages] = useState<PackageTemplate[]>([]);
  const [pkgLoading, setPkgLoading] = useState(false);
  const [pkgModalOpen, setPkgModalOpen] = useState(false);
  const [pkgServiceIds, setPkgServiceIds] = useState<string[]>([]);
  const [pkgServiceSessions, setPkgServiceSessions] = useState<Record<string, number>>({});
  const [editingPkg, setEditingPkg] = useState<PackageTemplate | null>(null);
  const [pkgSaving, setPkgSaving] = useState(false);
  const [pkgSearch, setPkgSearch] = useState('');
  const [pkgTotalSessions, setPkgTotalSessions] = useState<string>('10');

  /* ── Memberships state ── */
  const [memberships, setMemberships] = useState<MembershipPlanTemplate[]>([]);
  const [memLoading, setMemLoading] = useState(false);
  const [memModalOpen, setMemModalOpen] = useState(false);
  const [editingMem, setEditingMem] = useState<MembershipPlanTemplate | null>(null);
  const [memSaving, setMemSaving] = useState(false);
  const [memServiceIds, setMemServiceIds] = useState<string[]>([]);
  const [memServiceSessions, setMemServiceSessions] = useState<Record<string, number>>({});
  const [memTotalSessions, setMemTotalSessions] = useState<string>('');
  const [memSearch, setMemSearch] = useState('');

  /* ── Coupons state ── */
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponSaving, setCouponSaving] = useState(false);
  const [couponType, setCouponType] = useState<'flat' | 'percent'>('flat');

  /* ── Add-ons state ── */
  const [addOnsOpen, setAddOnsOpen] = useState(false);
  const [addOnsService, setAddOnsService] = useState<Service | null>(null);
  const [addOns, setAddOns] = useState<ServiceAddOn[]>([]);
  const [addOnsLoading, setAddOnsLoading] = useState(false);
  const [addOnModalOpen, setAddOnModalOpen] = useState(false);
  const [editingAddOn, setEditingAddOn] = useState<ServiceAddOn | null>(null);
  const [addOnSaving, setAddOnSaving] = useState(false);

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
 
  // Auto-calculate total sessions when specific services are selected
  useEffect(() => {
    if (pkgServiceIds.length > 0) {
      const sum = pkgServiceIds.reduce((acc, sid) => {
        return acc + (pkgServiceSessions[sid] ?? 1);
      }, 0);
      setPkgTotalSessions(String(sum));
    }
  }, [pkgServiceIds, pkgServiceSessions]);

  useEffect(() => {
    if (memServiceIds.length > 0) {
      const sum = memServiceIds.reduce((acc, sid) => {
        return acc + (memServiceSessions[sid] ?? 1);
      }, 0);
      setMemTotalSessions(String(sum));
    }
  }, [memServiceIds, memServiceSessions]);

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
    productsApi.list().then((r) => {
      if (!('error' in r) && r.data?.products) setProducts(r.data.products);
    });
    staffApi.list().then((r) => {
      if (!('error' in r) && r.data) setStaff(r.data);
    });
    settingsApi.get().then((r) => {
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
    if (!canManageCatalog) return;
    setEditing(null);
    setTiers([]);
    setProductRequirements([]);
    setSelectedStaffIds([]);
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
    if (!canManageCatalog) return;
    setEditing(s);
    setTiers((s.pricing_tiers ?? []).map((t) => ({ tier_label: t.tier_label, price: Number(t.price) })));
    setProductRequirements((s.product_requirements ?? []).map((p) => ({ product_id: String(p.product_id), quantity: Number(p.quantity) })));
    setSelectedStaffIds((s.assigned_staff ?? []).map((st) => String(st.id)));
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
      const payload = {
        name: values.name,
        description: values.description ?? null,
        duration_minutes: values.duration_minutes,
        price: values.price,
        deposit_amount: values.deposit_amount ?? 0,
        cost: values.cost ?? 0,
        is_active: values.is_active,
        pricing_tiers: tiers.filter((t) => t.tier_label.trim()),
        product_requirements: productRequirements.filter((p) => p.product_id),
        staff_ids: selectedStaffIds,
      } as any;
      if (editing?.id) {
        const res = await servicesApi.update(String(editing.id), payload);
        if ('error' in res && res.error) toastError(res.error);
        else {
          toastSuccess('Service updated.');
          setModalOpen(false);
          await load();
        }
      } else {
        const res = await servicesApi.create(payload);
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
      total_sessions: Number(pkgTotalSessions),
      validity_days: fd.get('validity_days') ? Number(fd.get('validity_days')) : null,
      is_active: fd.get('is_active') === 'on',
      service_ids: pkgServiceIds.length > 0 ? pkgServiceIds : [],
      services: pkgServiceIds.map(sid => ({
        service_id: sid,
        sessions: pkgServiceSessions[sid] ?? 1
      }))
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
      service_ids: memServiceIds.length > 0 ? memServiceIds : [],
      services: memServiceIds.map(sid => ({
        service_id: sid,
        sessions: memServiceSessions[sid] ?? 1
      })),
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
    if (!window.confirm(`Delete membership "${m.name}"? Note: This will deactivate the plan.`)) return;
    const res = await catalogApi.deleteMembership(m.id);
    if ('error' in res && res.error) toastError(res.error);
    else { toastSuccess('Membership deactivated.'); loadMemberships(); }
  };

  const toggleMemStatus = async (m: MembershipPlanTemplate) => {
    const res = await catalogApi.updateMembership(m.id, { is_active: !m.is_active });
    if ('error' in res && res.error) toastError(res.error);
    else { toastSuccess(`Membership ${!m.is_active ? 'activated' : 'deactivated'}.`); loadMemberships(); }
  };

  /* ── Coupon CRUD helpers ── */
  const loadCoupons = async () => {
    setCouponLoading(true);
    const res = await couponsApi.list();
    setCouponLoading(false);
    if ('error' in res && res.error) toastError(res.error);
    else setCoupons((res as any).data?.coupons ?? []);
  };

  const saveCoupon = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body: any = {
      code: String(fd.get('code') ?? '').toUpperCase(),
      name: String(fd.get('name') ?? '') || null,
      type: String(fd.get('type') ?? 'flat'),
      value: Number(fd.get('value') ?? 0),
      min_subtotal: fd.get('min_subtotal') ? Number(fd.get('min_subtotal')) : null,
      starts_at: String(fd.get('starts_at') ?? '') || null,
      ends_at: String(fd.get('ends_at') ?? '') || null,
      usage_limit: fd.get('usage_limit') ? Number(fd.get('usage_limit')) : null,
      is_active: fd.get('is_active') === 'on',
      description: String(fd.get('description') ?? '') || null,
    };
    if (!body.code) { toastError('Code is required'); return; }
    setCouponSaving(true);
    const res = editingCoupon
      ? await couponsApi.update(editingCoupon.id, body)
      : await couponsApi.create(body);
    setCouponSaving(false);
    if ('error' in res && res.error) toastError(res.error);
    else { toastSuccess(editingCoupon ? 'Coupon updated.' : 'Coupon created.'); setCouponModalOpen(false); loadCoupons(); }
  };

  const deleteCoupon = async (c: Coupon) => {
    if (!window.confirm(`Delete coupon "${c.code}"?`)) return;
    const res = await couponsApi.delete(c.id);
    if ('error' in res && res.error) toastError(res.error);
    else { toastSuccess('Coupon deleted.'); loadCoupons(); }
  };

  /* ── Add-ons helpers ── */
  const openAddOns = async (s: Service) => {
    if (!canManageCatalog) return;
    setAddOnsService(s);
    setAddOnsOpen(true);
    setAddOnsLoading(true);
    const res = await addOnsApi.list(String(s.id));
    setAddOnsLoading(false);
    if ('error' in res && res.error) toastError(res.error);
    else setAddOns((res as any).data?.add_ons ?? []);
  };

  const saveAddOn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!addOnsService) return;
    const fd = new FormData(e.currentTarget);
    const body: any = {
      name: String(fd.get('name') ?? ''),
      description: String(fd.get('description') ?? '') || null,
      price: Number(fd.get('price') ?? 0),
      duration_minutes: Number(fd.get('duration_minutes') ?? 0),
      is_active: fd.get('is_active') === 'on',
    };
    if (!body.name) { toastError('Name is required'); return; }
    setAddOnSaving(true);
    const res = editingAddOn
      ? await addOnsApi.update(String(addOnsService.id), String(editingAddOn.id), body)
      : await addOnsApi.create(String(addOnsService.id), body);
    setAddOnSaving(false);
    if ('error' in res && res.error) toastError(res.error);
    else {
      toastSuccess(editingAddOn ? 'Add-on updated.' : 'Add-on created.');
      setAddOnModalOpen(false);
      const reload = await addOnsApi.list(String(addOnsService.id));
      if (!('error' in reload)) setAddOns((reload as any).data?.add_ons ?? []);
      await load();
    }
  };

  const deleteAddOn = async (a: ServiceAddOn) => {
    if (!addOnsService || !window.confirm(`Delete add-on "${a.name}"?`)) return;
    const res = await addOnsApi.delete(String(addOnsService.id), String(a.id));
    if ('error' in res && res.error) toastError(res.error);
    else {
      toastSuccess('Add-on deleted.');
      const reload = await addOnsApi.list(String(addOnsService.id));
      if (!('error' in reload)) setAddOns((reload as any).data?.add_ons ?? []);
      await load();
    }
  };

  useEffect(() => {
    if (activeTab === 'packages' && packages.length === 0 && !pkgLoading) loadPackages();
    if (activeTab === 'memberships' && memberships.length === 0 && !memLoading) loadMemberships();
    if (activeTab === 'coupons' && coupons.length === 0 && !couponLoading) loadCoupons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const openAvailability = async (s: Service) => {
    if (!canManageCatalog) return;
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
    if (availabilityOpen && !canManageCatalog) setAvailabilityOpen(false);
  }, [availabilityOpen, canManageCatalog]);

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
          !canManageCatalog ? (
            <span className="text-xs text-muted-foreground">View only</span>
          ) : activeTab === 'services' ? (
            <Button onClick={openCreate} className="rounded-xl h-11" disabled={saving}>New service</Button>
          ) : activeTab === 'packages' ? (
            <Button onClick={() => { 
              setEditingPkg(null); 
              setPkgServiceIds([]); 
              setPkgServiceSessions({});
              setPkgSearch('');
              setPkgTotalSessions('10');
              setPkgModalOpen(true); 
            }} className="rounded-xl h-11">New package</Button>
          ) : activeTab === 'coupons' ? (
            <Button onClick={() => { setEditingCoupon(null); setCouponType('flat'); setCouponModalOpen(true); }} className="rounded-xl h-11">New coupon</Button>
          ) : (
            <Button onClick={() => { 
              setEditingMem(null); 
              setMemServiceIds([]);
              setMemServiceSessions({});
              setMemTotalSessions('');
              setMemSearch('');
              setMemModalOpen(true); 
            }} className="rounded-xl h-11">New membership</Button>
          )
        }
      />

      {/* ── Tab bar ── */}
      <div className="flex gap-1 border-b border-[var(--elite-border)] pb-0">
        {([
          { key: 'services' as const, label: 'Services', icon: <Pencil className="w-3.5 h-3.5" /> },
          { key: 'packages' as const, label: 'Packages', icon: <Package className="w-3.5 h-3.5" /> },
          { key: 'memberships' as const, label: 'Memberships', icon: <CreditCard className="w-3.5 h-3.5" /> },
          { key: 'coupons' as const, label: 'Coupons', icon: <Ticket className="w-3.5 h-3.5" /> },
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
          <Combobox
            value={status}
            onValueChange={(value) => setStatus(value as any)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            placeholder="Select status"
            searchPlaceholder="Search status..."
            emptyText="No status found."
            className="w-full"
          />
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
                <TableHead className="w-[160px]">Tiers</TableHead>
                <TableHead className="w-[100px]">Add-Ons</TableHead>
                <TableHead className="w-[120px]">Products</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                {canManageCatalog && <TableHead className="text-right w-[220px]">Actions</TableHead>}
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
                  <TableCell className="text-muted-foreground text-xs">
                    {s.pricing_tiers && s.pricing_tiers.length > 0
                      ? s.pricing_tiers.map((t) => `${t.tier_label}: ${Number(t.price).toLocaleString('en-US', { style: 'currency', currency })}`).join(', ')
                      : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {s.add_ons && s.add_ons.length > 0 ? `${s.add_ons.length}` : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {s.product_requirements && s.product_requirements.length > 0 ? `${s.product_requirements.length}` : '—'}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => toggleActive(s)}
                      disabled={saving}
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80 ${
                        s.is_active
                          ? 'bg-green-50 text-emerald-700 border-emerald-200'
                          : 'bg-muted/40 text-foreground border-border'
                      }`}
                    >
                      {s.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </TableCell>
                  {canManageCatalog && (
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEdit(s)} disabled={saving} title="Edit">
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-9 rounded-xl"
                        onClick={() => openAddOns(s)}
                        disabled={saving}
                      >
                        <Layers className="size-3.5 mr-1" />Add-Ons
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
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <Pagination meta={meta} onPageChange={(p) => load(p)} />

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[1px] p-2 sm:p-4 overflow-y-auto elite-scrollbar">
          <div className="bg-[var(--elite-card)] rounded-2xl shadow-xl w-full max-w-2xl border border-[var(--elite-border)] my-auto">
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

            <div className="p-5 pb-32">
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
                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none">Assigned Staff</label>
                      <MultiSelect
                        options={staff.map((s) => ({ label: s.name, value: String(s.id) }))}
                        selected={selectedStaffIds}
                        onChange={setSelectedStaffIds}
                        placeholder="Select staff..."
                        className="h-10"
                      />
                    </div>
                  </div>

                  <RHFTextareaField
                    control={form.control}
                    name="description"
                    label="Description"
                    placeholder="Optional description…"
                    disabled={saving}
                    rows={3}
                  />

                  {/* Pricing Tiers */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium leading-none">Pricing Tiers</label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-lg text-xs gap-1"
                        onClick={() => setTiers((prev) => [...prev, { tier_label: '', price: 0 }])}
                        disabled={saving}
                      >
                        <Plus className="size-3" /> Add tier
                      </Button>
                    </div>
                    {tiers.length === 0 && (
                      <p className="text-xs text-muted-foreground">No tiers — base price applies to all staff.</p>
                    )}
                    {tiers.map((tier, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          value={tier.tier_label}
                          onChange={(e) => setTiers((prev) => prev.map((t, i) => i === idx ? { ...t, tier_label: e.target.value } : t))}
                          placeholder="e.g. Junior"
                          className="flex-1"
                          disabled={saving}
                        />
                        <Input
                          value={tier.price}
                          onChange={(e) => setTiers((prev) => prev.map((t, i) => i === idx ? { ...t, price: Number(e.target.value) || 0 } : t))}
                          placeholder="Price"
                          type="number"
                          inputMode="decimal"
                          className="w-28"
                          disabled={saving}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => setTiers((prev) => prev.filter((_, i) => i !== idx))}
                          disabled={saving}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Product Usage (Informative) */}
                  <div className="space-y-2 pt-2 border-t border-[var(--elite-border)]">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium leading-none">Product Usage <span className="text-[10px] text-muted-foreground uppercase ml-1">(Informative)</span></label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-lg text-xs gap-1"
                        onClick={() => setProductRequirements((prev) => [...prev, { product_id: '', quantity: 1 }])}
                        disabled={saving}
                      >
                        <Plus className="size-3" /> Add product
                      </Button>
                    </div>
                    {productRequirements.length === 0 && (
                      <p className="text-xs text-muted-foreground">No products associated with this service.</p>
                    )}
                    {productRequirements.map((req, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="flex-1">
                          <Combobox
                            value={req.product_id}
                            onValueChange={(val) => setProductRequirements((prev) => prev.map((p, i) => i === idx ? { ...p, product_id: val } : p))}
                            options={productOptions}
                            placeholder="Select product..."
                            className="w-full"
                          />
                        </div>
                        <div className="w-24">
                          <Input
                            value={req.quantity}
                            onChange={(e) => setProductRequirements((prev) => prev.map((p, i) => i === idx ? { ...p, quantity: Number(e.target.value) || 1 } : p))}
                            placeholder="Qty"
                            type="number"
                            min="0"
                            step="0.1"
                            disabled={saving}
                            className="h-10"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 shrink-0"
                          onClick={() => setProductRequirements((prev) => prev.filter((_, i) => i !== idx))}
                          disabled={saving}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>

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
                          <Combobox
                            value={String(availabilityForm.watch('day_of_week') ?? '')}
                            onValueChange={(value) => availabilityForm.setValue('day_of_week', Number(value) as any)}
                            options={dayNames.map((d, idx) => ({
                              value: String(idx),
                              label: d,
                            }))}
                            placeholder="Select day"
                            searchPlaceholder="Search days..."
                            emptyText="No days found."
                            className="w-full"
                          />
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
                    <TableHead className="w-[140px]">Services</TableHead>
                    <TableHead className="w-[120px]">Validity</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    {canManageCatalog && <TableHead className="text-right w-[140px]">Actions</TableHead>}
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
                      <TableCell className="text-muted-foreground">
                        {p.services?.length ? `${p.services.length} services` : 'All services'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.validity_days ? `${p.validity_days} days` : 'No expiry'}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => togglePkgStatus(p)}
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80 ${p.is_active ? 'bg-green-50 text-emerald-700 border-emerald-200' : 'bg-muted/40 text-foreground border-border'}`}
                        >
                          {p.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </TableCell>
                      {canManageCatalog && (
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => { 
                            setEditingPkg(p); 
                            setPkgServiceIds(p.services?.map(s => String(s.id)) ?? []); 
                            const sessions: Record<string, number> = {};
                            p.services?.forEach(s => {
                              sessions[String(s.id)] = s.pivot?.sessions_count ?? 1;
                            });
                            setPkgServiceSessions(sessions);
                            setPkgTotalSessions(String(p.total_sessions));
                            setPkgSearch('');
                            setPkgModalOpen(true); 
                          }} title="Edit">
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="destructive" size="icon" className="h-8 w-8 rounded-lg" onClick={() => deletePkg(p)} title="Delete">
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                      )}
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
                      <Input 
                        name="total_sessions" 
                        type="number" 
                        min="1" 
                        value={pkgTotalSessions}
                        onChange={(e) => setPkgTotalSessions(e.target.value)}
                        placeholder="10" 
                        required 
                        disabled={pkgServiceIds.length > 0}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1.5">Validity (days)</label>
                      <Input name="validity_days" type="number" min="1" defaultValue={editingPkg?.validity_days ?? ''} placeholder="Leave empty for no expiry" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-foreground">Applicable Services <span className="text-[10px] text-muted-foreground ml-1">(Check to include)</span></label>
                      <div className="relative w-40">
                        <Input 
                          placeholder="Search..." 
                          value={pkgSearch} 
                          onChange={(e) => setPkgSearch(e.target.value)} 
                          className="h-8 text-[10px] rounded-lg pr-8"
                        />
                        {pkgSearch && <X className="size-3 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground" onClick={() => setPkgSearch('')} />}
                      </div>
                    </div>
                    
                    <div className="elite-panel-soft p-1 space-y-1 rounded-xl border border-[var(--elite-border)] bg-muted/10 max-h-[250px] overflow-y-auto">
                      {services.filter(s => s.name.toLowerCase().includes(pkgSearch.toLowerCase())).map(svc => {
                        const sid = String(svc.id);
                        const isSelected = pkgServiceIds.includes(sid);
                        return (
                          <div key={sid} className={`flex items-center justify-between gap-3 p-2 rounded-lg transition-colors ${isSelected ? 'bg-background/80 shadow-sm border border-[var(--elite-border)]/20' : 'hover:bg-background/40'}`}>
                            <label className="flex items-center gap-3 flex-1 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setPkgServiceIds(prev => [...prev, sid]);
                                    if (pkgServiceSessions[sid] === undefined) {
                                      setPkgServiceSessions(prev => ({ ...prev, [sid]: 1 }));
                                    }
                                  } else {
                                    setPkgServiceIds(prev => prev.filter(id => id !== sid));
                                  }
                                }}
                                className="size-4 rounded border-muted"
                              />
                              <span className="text-xs font-medium">{svc.name}</span>
                            </label>
                            {isSelected && (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-tight">Sessions:</span>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  className="w-16 h-8 text-xs rounded-md border-[var(--elite-orange)]/30 focus:border-[var(--elite-orange)]"
                                  value={pkgServiceSessions[sid] ?? 1}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 1;
                                    setPkgServiceSessions(prev => ({ ...prev, [sid]: val }));
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {services.filter(s => s.name.toLowerCase().includes(pkgSearch.toLowerCase())).length === 0 && (
                        <p className="text-[10px] text-muted-foreground text-center py-6">No services found matching &quot;{pkgSearch}&quot;</p>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">Note: If no services are selected, the package applies to all services with the total session count above.</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm pt-2">
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
                    {canManageCatalog && <TableHead className="text-right w-[140px]">Actions</TableHead>}
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
                        <button
                          onClick={() => toggleMemStatus(m)}
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80 ${m.is_active ? 'bg-green-50 text-emerald-700 border-emerald-200' : 'bg-muted/40 text-foreground border-border'}`}
                        >
                          {m.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </TableCell>
                      {canManageCatalog && (
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => { 
                            setEditingMem(m); 
                            setMemServiceIds(m.services?.map(s => String(s.id)) ?? []); 
                            const sessions: Record<string, number> = {};
                            m.services?.forEach(s => {
                              sessions[String(s.id)] = s.pivot?.sessions_count ?? 1;
                            });
                            setMemServiceSessions(sessions);
                            setMemTotalSessions(String(m.credits_per_renewal));
                            setMemSearch('');
                            setMemModalOpen(true); 
                          }} title="Edit">
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="destructive" size="icon" className="h-8 w-8 rounded-lg" onClick={() => deleteMem(m)} title="Delete">
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                      )}
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
                      <label className="block text-xs font-medium text-foreground mb-1.5">Interval (mo)</label>
                      <Input name="interval_months" type="number" min="1" defaultValue={editingMem?.interval_months ?? 1} placeholder="1" required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1.5">Sessions / Renewal</label>
                      <Input 
                        name="credits_per_renewal" 
                        type="number" 
                        min="0" 
                        value={memTotalSessions}
                        onChange={(e) => setMemTotalSessions(e.target.value)}
                        placeholder="Unlimited" 
                        disabled={memServiceIds.length > 0}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-foreground">Applicable Services <span className="text-[10px] text-muted-foreground ml-1">(Check to include)</span></label>
                      <div className="relative w-40">
                        <Input 
                          placeholder="Search..." 
                          value={memSearch} 
                          onChange={(e) => setMemSearch(e.target.value)} 
                          className="h-8 text-[10px] rounded-lg pr-8"
                        />
                        <Search className="absolute right-2.5 top-2 size-3.5 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto border border-[var(--elite-border)] rounded-xl p-3 space-y-2 bg-black/5">
                      {services.filter(s => s.name.toLowerCase().includes(memSearch.toLowerCase())).map(s => {
                        const sid = String(s.id);
                        const isSelected = memServiceIds.includes(sid);
                        return (
                          <div key={sid} className="flex items-center justify-between gap-3 p-1">
                            <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                              <input 
                                type="checkbox" 
                                checked={isSelected} 
                                onChange={() => {
                                  if (isSelected) setMemServiceIds(memServiceIds.filter(id => id !== sid));
                                  else setMemServiceIds([...memServiceIds, sid]);
                                }}
                                className="size-3.5 rounded-md border-muted accent-[var(--elite-orange)]"
                              />
                              <span className="text-xs text-foreground truncate">{s.name}</span>
                            </label>
                            {isSelected && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] text-muted-foreground">Sessions:</span>
                                <input 
                                  type="number" 
                                  min="1" 
                                  value={memServiceSessions[sid] ?? 1}
                                  onChange={(e) => setMemServiceSessions({...memServiceSessions, [sid]: parseInt(e.target.value) || 1})}
                                  className="w-10 h-6 text-[10px] bg-white dark:bg-black/40 border border-[var(--elite-border)] rounded px-1 text-center"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {services.length === 0 && (
                        <p className="text-[10px] text-center text-muted-foreground py-2">No services found.</p>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">Note: If no services are selected, the membership applies to all services with the total session count above.</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm pt-2">
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

      {/* ═══════════════════ Coupons Tab ═══════════════════ */}
      {activeTab === 'coupons' && (
        <>
          <div className="elite-panel overflow-hidden">
            {couponLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ) : coupons.length === 0 ? (
              <p className="p-6 text-muted-foreground text-center">No coupons yet. Create your first coupon code.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead className="w-[100px]">Value</TableHead>
                    <TableHead className="w-[120px]">Usage</TableHead>
                    <TableHead className="w-[120px]">Min Subtotal</TableHead>
                    <TableHead className="w-[180px]">Valid Period</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    {canManageCatalog && <TableHead className="text-right w-[140px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-mono font-medium text-foreground">{c.code}</p>
                          {c.name && <p className="text-xs text-muted-foreground truncate">{c.name}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground capitalize">{c.type}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.type === 'percent' ? `${Number(c.value)}%` : Number(c.value).toLocaleString('en-US', { style: 'currency', currency })}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.used_count}{c.usage_limit != null ? ` / ${c.usage_limit}` : ''}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.min_subtotal != null ? Number(c.min_subtotal).toLocaleString('en-US', { style: 'currency', currency }) : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {c.starts_at ? new Date(c.starts_at).toLocaleDateString() : '—'} → {c.ends_at ? new Date(c.ends_at).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => toggleCouponStatus(c)}
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80 ${c.is_active ? 'bg-green-50 text-emerald-700 border-emerald-200' : 'bg-muted/40 text-foreground border-border'}`}
                        >
                          {c.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </TableCell>
                      {canManageCatalog && (
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => { setEditingCoupon(c); setCouponType(c.type as any); setCouponModalOpen(true); }} title="Edit">
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="destructive" size="icon" className="h-8 w-8 rounded-lg" onClick={() => deleteCoupon(c)} title="Delete">
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {couponModalOpen && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[1px] p-2 sm:p-4">
              <div className="bg-[var(--elite-card)] rounded-2xl shadow-xl w-full max-w-lg border border-[var(--elite-border)]">
                <div className="p-5 border-b border-[var(--elite-border)] flex items-start justify-between gap-3">
                  <h2 className="font-display text-xl font-semibold elite-title">{editingCoupon ? 'Edit coupon' : 'New coupon'}</h2>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setCouponModalOpen(false)} aria-label="Close"><X className="w-4 h-4" /></Button>
                </div>
                <form onSubmit={saveCoupon} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1.5">Code</label>
                      <Input name="code" defaultValue={editingCoupon?.code ?? ''} placeholder="e.g. SUMMER20" required className="font-mono uppercase" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1.5">Name</label>
                      <Input name="name" defaultValue={editingCoupon?.name ?? ''} placeholder="Optional label" />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1.5">Type</label>
                      <Combobox
                        value={couponType}
                        onValueChange={(value) => setCouponType(value as any)}
                        options={[
                          { value: 'flat', label: 'Flat ($)' },
                          { value: 'percent', label: 'Percent (%)' },
                        ]}
                        placeholder="Select type"
                        searchPlaceholder="Search types..."
                        emptyText="No types found."
                        className="w-full"
                      />
                      <input type="hidden" name="type" value={couponType} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1.5">Value</label>
                      <Input name="value" type="number" step="0.01" min="0" defaultValue={editingCoupon ? Number(editingCoupon.value) : ''} placeholder="10" required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1.5">Min subtotal</label>
                      <Input name="min_subtotal" type="number" step="0.01" min="0" defaultValue={editingCoupon?.min_subtotal != null ? Number(editingCoupon.min_subtotal) : ''} placeholder="Optional" />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1.5">Starts at</label>
                      <Input name="starts_at" type="date" defaultValue={editingCoupon?.starts_at ? editingCoupon.starts_at.slice(0, 10) : ''} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1.5">Ends at</label>
                      <Input name="ends_at" type="date" defaultValue={editingCoupon?.ends_at ? editingCoupon.ends_at.slice(0, 10) : ''} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1.5">Usage limit</label>
                      <Input name="usage_limit" type="number" min="1" defaultValue={editingCoupon?.usage_limit ?? ''} placeholder="Unlimited" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Description</label>
                    <Input name="description" defaultValue={editingCoupon?.description ?? ''} placeholder="Optional description" />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="is_active" defaultChecked={editingCoupon?.is_active ?? true} className="size-4" />
                    <span>Active</span>
                  </label>
                  <div className="flex gap-2 justify-end pt-1">
                    <Button type="button" variant="outline" onClick={() => setCouponModalOpen(false)} className="rounded-xl">Cancel</Button>
                    <Button type="submit" disabled={couponSaving} className="rounded-xl">{couponSaving ? 'Saving…' : editingCoupon ? 'Save changes' : 'Create coupon'}</Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════ Add-Ons Modal ═══════════════════ */}
      {addOnsOpen && addOnsService && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[1px] p-2 sm:p-4">
          <div className="bg-[var(--elite-card)] rounded-2xl shadow-xl w-full max-w-2xl border border-[var(--elite-border)] overflow-hidden">
            <div className="p-5 border-b border-[var(--elite-border)] flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold elite-title truncate">
                  Add-Ons · {addOnsService.name}
                </h2>
                <p className="text-xs elite-subtle mt-1">Manage optional upsells for this service.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" className="rounded-xl gap-1" onClick={() => { setEditingAddOn(null); setAddOnModalOpen(true); }}>
                  <Plus className="size-3" /> Add
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => setAddOnsOpen(false)} aria-label="Close">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="p-5">
              {addOnsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full rounded-xl" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              ) : addOns.length === 0 ? (
                <p className="text-muted-foreground text-center text-sm py-6">No add-ons yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-[100px]">Price</TableHead>
                      <TableHead className="w-[100px]">Duration</TableHead>
                      <TableHead className="w-[80px]">Status</TableHead>
                      <TableHead className="text-right w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {addOns.map((a) => (
                      <TableRow key={String(a.id)}>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{a.name}</p>
                            {a.description && <p className="text-xs text-muted-foreground truncate">{String(a.description)}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {Number(a.price).toLocaleString('en-US', { style: 'currency', currency })}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{a.duration_minutes} min</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${a.is_active ? 'bg-green-50 text-emerald-700 border-emerald-200' : 'bg-muted/40 text-foreground border-border'}`}>
                            {a.is_active ? 'Active' : 'Off'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => { setEditingAddOn(a); setAddOnModalOpen(true); }} title="Edit">
                              <Pencil className="size-4" />
                            </Button>
                            <Button variant="destructive" size="icon" className="h-8 w-8 rounded-lg" onClick={() => deleteAddOn(a)} title="Delete">
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
          </div>
        </div>
      )}

      {addOnModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[1px] p-2 sm:p-4">
          <div className="bg-[var(--elite-card)] rounded-2xl shadow-xl w-full max-w-md border border-[var(--elite-border)]">
            <div className="p-5 border-b border-[var(--elite-border)] flex items-start justify-between gap-3">
              <h2 className="font-display text-xl font-semibold elite-title">{editingAddOn ? 'Edit add-on' : 'New add-on'}</h2>
              <Button type="button" variant="ghost" size="icon" onClick={() => setAddOnModalOpen(false)} aria-label="Close"><X className="w-4 h-4" /></Button>
            </div>
            <form onSubmit={saveAddOn} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Name</label>
                <Input name="name" defaultValue={editingAddOn?.name ?? ''} placeholder="e.g. Deep Conditioning" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Description</label>
                <Input name="description" defaultValue={editingAddOn?.description ?? ''} placeholder="Optional" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Price</label>
                  <Input name="price" type="number" step="0.01" min="0" defaultValue={editingAddOn ? Number(editingAddOn.price) : ''} placeholder="15" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Extra duration (min)</label>
                  <Input name="duration_minutes" type="number" min="0" defaultValue={editingAddOn?.duration_minutes ?? 0} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="is_active" defaultChecked={editingAddOn?.is_active ?? true} className="size-4" />
                <span>Active</span>
              </label>
              <div className="flex gap-2 justify-end pt-1">
                <Button type="button" variant="outline" onClick={() => setAddOnModalOpen(false)} className="rounded-xl">Cancel</Button>
                <Button type="submit" disabled={addOnSaving} className="rounded-xl">{addOnSaving ? 'Saving…' : editingAddOn ? 'Save changes' : 'Create add-on'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
