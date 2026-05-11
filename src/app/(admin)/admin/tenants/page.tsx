'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { adminUsersApi, tenantsApi, type AdminUserRow, type Tenant } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { type PaginationMeta } from '@/lib/api';
import { Pagination } from '@/components/data/Pagination';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { RHFTextField } from '@/components/fields/RHFTextField';
import { RHFTextareaField } from '@/components/fields/RHFTextareaField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Pencil, UserPlus, Users, X } from 'lucide-react';

const MapLocationPicker = dynamic(() => import('@/components/fields/MapLocationPicker'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-56 bg-muted flex items-center justify-center rounded-xl border border-border animate-pulse">
      <span className="text-xs text-muted-foreground">Preparing map interface...</span>
    </div>
  )
});

const statusClass: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  suspended: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30',
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
};

// ── Role badge colours ────────────────────────────────────────────────────────

const roleBadge: Record<string, string> = {
  super_admin:  'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30',
  salon_owner:  'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30',
  manager:      'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30',
  staff:        'bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30',
  customer:     'bg-muted text-muted-foreground border border-border',
};

function RoleBadge({ role }: { role?: string | null }) {
  const cls = roleBadge[(role ?? '').toLowerCase()] ?? 'bg-muted text-muted-foreground border border-border';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${cls}`}>
      {role ?? '—'}
    </span>
  );
}

// ── Tenant Users Slide-Over ───────────────────────────────────────────────────

function TenantUsersPanel({
  tenant,
  onClose,
}: {
  tenant: Tenant;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);

  const editSchema = z.object({
    name:     z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
    role:     z.enum(['salon_owner', 'manager', 'staff', 'customer']),
  });
  type EditValues = z.infer<typeof editSchema>;

  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: '', password: '', role: 'staff' },
    mode: 'onSubmit',
  });

  const inviteSchema = z.object({
    email: z.string().email('Enter a valid email'),
    name:  z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
    role:  z.enum(['salon_owner', 'manager', 'staff', 'customer']),
  });
  type InviteValues = z.infer<typeof inviteSchema>;

  const inviteForm = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', name: '', password: '', role: 'staff' },
    mode: 'onSubmit',
  });

  const loadUsers = async () => {
    setLoading(true);
    const res = await adminUsersApi.list({ tenant_id: String(tenant.id), per_page: 100 });
    setLoading(false);
    if (res.data?.users) setRows(res.data.users);
    else if (res.error) toastError(res.error);
  };

  useEffect(() => {
    if (editingUser) {
      editForm.reset({
        name:     editingUser.name ?? '',
        password: '',
        role:     (editingUser.role ?? 'staff') as EditValues['role'],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingUser]);

  useEffect(() => {
    loadUsers();
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !showInvite && !editingUser) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id, showInvite, editingUser]);

  const invite = async (values: InviteValues) => {
    setActionLoading(true);
    const { error } = await adminUsersApi.invite({
      email:     values.email.trim(),
      name:      values.name?.trim() || undefined,
      password:  values.password?.trim() || undefined,
      role:      values.role,
      tenant_id: String(tenant.id),
    });
    setActionLoading(false);
    if (error) { toastError(error); return; }
    toastSuccess('User created successfully.');
    setShowInvite(false);
    inviteForm.reset({ email: '', name: '', password: '', role: 'staff' });
    await loadUsers();
  };

  const saveEdit = async (values: EditValues) => {
    if (!editingUser) return;
    setActionLoading(true);
    const body: Record<string, string> = { role: values.role };
    if (values.name?.trim()) body.name = values.name.trim();
    if (values.password?.trim()) body.password = values.password.trim();
    const { error } = await adminUsersApi.update(editingUser.id, body);
    setActionLoading(false);
    if (error) { toastError(error); return; }
    toastSuccess('User updated successfully.');
    setEditingUser(null);
    await loadUsers();
  };

  const remove = async (userId: string) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    setActionLoading(true);
    const { error } = await adminUsersApi.delete(userId);
    setActionLoading(false);
    if (error) { toastError(error); return; }
    toastSuccess('User deleted.');
    await loadUsers();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-[2px]" onClick={onClose} />

      {/* Drawer — wider to avoid email truncation */}
      <div className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-2xl bg-card shadow-2xl border-l border-border">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/40 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base font-semibold text-foreground leading-tight truncate">
                {tenant.name}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {loading ? 'Loading…' : `${rows.length} user${rows.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-4">
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-colors shadow-sm disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add user
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="elite-scrollbar flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-8">
              <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-muted-foreground/60" />
              </div>
              <p className="font-medium text-foreground text-sm">No users yet</p>
              <p className="text-muted-foreground text-xs mt-1 mb-4">This salon doesn't have any users assigned.</p>
              <button
                type="button"
                onClick={() => setShowInvite(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Invite first user
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((u) => (
                <div key={u.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/40 transition-colors group">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary uppercase">
                    {(u.name ?? u.email ?? '?')[0]}
                  </div>

                  {/* Email + name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{u.email}</p>
                    {u.name && <p className="text-xs text-muted-foreground mt-0.5 truncate">{u.name}</p>}
                  </div>

                  {/* Role badge */}
                  <RoleBadge role={u.role} />

                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => setEditingUser(u)}
                    disabled={actionLoading}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg border border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 transition-all"
                    title="Edit user"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => remove(u.id)}
                    disabled={actionLoading}
                    className="opacity-0 group-hover:opacity-100 px-2.5 py-1 rounded-lg border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300 text-xs font-medium hover:bg-red-500/20 disabled:opacity-50 transition-all"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer count ── */}
        {!loading && rows.length > 0 && (
          <div className="px-6 py-3 border-t border-border bg-muted/30 shrink-0">
            <p className="text-xs text-muted-foreground">{rows.length} user{rows.length !== 1 ? 's' : ''} in <span className="font-medium text-foreground">{tenant.name}</span></p>
          </div>
        )}
      </div>

      {/* ── Edit User Modal (layered above drawer) ── */}
      {editingUser && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={() => setEditingUser(null)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl w-full max-w-md border border-border overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Pencil className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-foreground">Edit user</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[220px]">{editingUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors mt-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5">
              <Form {...editForm}>
                <form
                  onSubmit={editForm.handleSubmit(saveEdit, () => toastError('Please check the highlighted fields.'))}
                  className="space-y-4"
                >
                  <RHFTextField
                    control={editForm.control}
                    name="name"
                    label="Full name"
                    placeholder="Jane Smith"
                    disabled={actionLoading}
                  />
                  <RHFTextField
                    control={editForm.control}
                    name="password"
                    label="New password (leave blank to keep current)"
                    placeholder="••••••••"
                    type="password"
                    disabled={actionLoading}
                  />
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</label>
                    <select
                      value={editForm.watch('role')}
                      onChange={(e) => editForm.setValue('role', e.target.value as EditValues['role'])}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground
                        focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
                      disabled={actionLoading}
                    >
                      <option value="salon_owner">Salon owner</option>
                      <option value="manager">Manager</option>
                      <option value="staff">Staff</option>
                      <option value="customer">Customer</option>
                    </select>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingUser(null)}
                      disabled={actionLoading}
                      className="rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={actionLoading}
                      className="rounded-xl"
                    >
                      {actionLoading
                        ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Saving…</>
                        : <><Pencil className="w-4 h-4 mr-1.5" />Save changes</>
                      }
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>
      )}

      {/* ── Invite Modal (layered above drawer) ── */}
      {showInvite && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={() => setShowInvite(false)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl w-full max-w-md border border-border overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <UserPlus className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-foreground">Add user</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Adding to <span className="font-medium text-foreground">{tenant.name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors mt-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5">
              <Form {...inviteForm}>
                <form
                  onSubmit={inviteForm.handleSubmit(invite, () => toastError('Please check the highlighted fields.'))}
                  className="space-y-4"
                >
                  <RHFTextField
                    control={inviteForm.control}
                    name="email"
                    label="Email address"
                    placeholder="user@example.com"
                    type="email"
                    disabled={actionLoading}
                  />
                  <RHFTextField
                    control={inviteForm.control}
                    name="name"
                    label="Full name (optional)"
                    placeholder="Jane Smith"
                    disabled={actionLoading}
                  />
                  <RHFTextField
                    control={inviteForm.control}
                    name="password"
                    label="Password (optional, min 8 chars)"
                    placeholder="••••••••"
                    type="password"
                    disabled={actionLoading}
                  />
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</label>
                    <select
                      value={inviteForm.watch('role')}
                      onChange={(e) => inviteForm.setValue('role', e.target.value as InviteValues['role'])}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground
                        focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
                      disabled={actionLoading}
                    >
                      <option value="salon_owner">Salon owner</option>
                      <option value="manager">Manager</option>
                      <option value="staff">Staff</option>
                      <option value="customer">Customer</option>
                    </select>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowInvite(false)}
                      disabled={actionLoading}
                      className="rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={actionLoading}
                      className="rounded-xl"
                    >
                      {actionLoading
                        ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Creating…</>
                        : <><UserPlus className="w-4 h-4 mr-1.5" />Create user</>
                      }
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'trial'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusActionTenantId, setStatusActionTenantId] = useState<string | null>(null);

  // Users panel state
  const [usersTenant, setUsersTenant] = useState<Tenant | null>(null);

  const createSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    domain: z.string().optional(),
    plan: z.enum(['basic', 'pro', 'enterprise']).default('basic'),
    timezone: z.string().optional(),
    currency: z
      .string()
      .min(3, 'Currency must be 3 letters')
      .max(3, 'Currency must be 3 letters')
      .default('USD'),
    phone: z.string().optional(),
    address: z.string().optional(),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
  });

  type CreateValues = z.infer<typeof createSchema>;

  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: '',
      domain: '',
      plan: 'basic',
      timezone: '',
      currency: 'USD',
      phone: '',
      address: '',
      latitude: null,
      longitude: null,
    },
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (editingTenant) {
      createForm.reset({
        name: editingTenant.name ?? '',
        domain: editingTenant.domain ?? '',
        plan: (editingTenant.plan as any) || 'basic',
        timezone: editingTenant.timezone ?? '',
        currency: editingTenant.currency ?? 'USD',
        phone: editingTenant.phone ?? '',
        address: editingTenant.address ?? '',
        latitude: editingTenant.latitude ?? null,
        longitude: editingTenant.longitude ?? null,
      });
    } else {
      createForm.reset({
        name: '',
        domain: '',
        plan: 'basic',
        timezone: '',
        currency: 'USD',
        phone: '',
        address: '',
        latitude: null,
        longitude: null,
      });
    }
  }, [editingTenant, createForm]);

  const load = async (p = page) => {
    setLoading(true);
    const { data, error: err, meta: m } = await tenantsApi.list({ page: p, per_page: 20 });
    setLoading(false);
    if (err) toastError(err);
    else if (data?.tenants) {
      setTenants(data.tenants);
      setMeta(m ?? null);
      setPage(p);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tenants.filter((t) => {
      const name = t.name?.toLowerCase() ?? '';
      const slug = (t.slug ?? '').toLowerCase();
      const status = (t.status ?? '').toLowerCase();
      const matchesSearch = !q || name.includes(q) || slug.includes(q) || status.includes(q);
      const matchesStatus = statusFilter === 'all' ? true : status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, tenants, statusFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground text-sm">Loading tenants...</p>
      </div>
    );
  }

  const total = tenants.length;
  const activeCount = tenants.filter((t) => t.status === 'active').length;
  const suspendedCount = tenants.filter((t) => t.status === 'suspended').length;

  const saveTenant = async (values: CreateValues) => {
    setActionLoading(true);
    const payload: any = { name: values.name.trim() };
    if (values.domain?.trim()) payload.domain = values.domain.trim();
    else if (editingTenant) payload.domain = null; // Explicitly clear existing domain on edit only
    if (values.plan) payload.plan = values.plan;
    if (values.timezone?.trim()) payload.timezone = values.timezone.trim();
    if (values.currency?.trim()) payload.currency = values.currency.trim().toUpperCase().slice(0, 3);
    if (values.phone?.trim()) payload.phone = values.phone.trim();
    if (values.address?.trim()) payload.address = values.address.trim();
    if (typeof values.latitude === 'number') payload.latitude = values.latitude;
    if (typeof values.longitude === 'number') payload.longitude = values.longitude;

    let res;
    if (editingTenant) {
      res = await tenantsApi.update(String(editingTenant.id), payload);
    } else {
      res = await tenantsApi.create(payload);
    }
    
    setActionLoading(false);
    if ((res as any).error) {
      toastError((res as any).error);
    } else {
      setShowCreate(false);
      setEditingTenant(null);
      createForm.reset();
      await load();
      toastSuccess(editingTenant ? 'Tenant updated.' : 'Tenant created.');
    }
  };

  const toggleStatus = async (t: Tenant) => {
    const id = String(t.id);
    const status = String(t.status ?? '').toLowerCase();
    const nextLabel = status === 'active' ? 'suspend' : 'activate';
    const ok = window.confirm(`Are you sure you want to ${nextLabel} "${t.name}"?`);
    if (!ok) return;

    setStatusActionTenantId(id);
    try {
      const res =
        status === 'active'
          ? await tenantsApi.suspend(id)
          : await tenantsApi.activate(id);
      if ((res as any).error) toastError((res as any).error);
      else {
        const updated = (res as any)?.data?.tenant ?? (res as any)?.data ?? null;
        if (updated?.id) {
          setTenants((prev) =>
            prev.map((x) => (String(x.id) === String(updated.id) ? { ...x, ...updated } : x)),
          );
        }
        toastSuccess(status === 'active' ? 'Tenant suspended.' : 'Tenant activated.');
      }
    } finally {
      setStatusActionTenantId(null);
    }
  };

  return (
    <>
    <div className="space-y-6">
      {/* Header + summary cards */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Salons</h1>
          <p className="text-muted-foreground text-sm mt-1">All salon tenants onboarded to the platform.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-card rounded-xl border border-border shadow-sm px-4 py-3 text-sm">
            <p className="text-muted-foreground">Total salons</p>
            <p className="font-display text-lg font-semibold text-foreground">{total}</p>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-sm px-4 py-3 text-sm hidden sm:block">
            <p className="text-muted-foreground">Active</p>
            <p className="font-display text-lg font-semibold text-foreground">
              {activeCount} <span className="text-xs text-muted-foreground">/ {total}</span>
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-sm px-4 py-3 text-sm hidden sm:block">
            <p className="text-muted-foreground">Suspended</p>
            <p className="font-display text-lg font-semibold text-foreground">{suspendedCount}</p>
          </div>
        </div>
      </div>

      {/* Search + actions bar */}
      <div className="bg-card rounded-xl border border-border shadow-sm px-4 py-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Search salons</label>
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, slug, or status"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="w-full sm:w-40 bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="trial">Trial</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors"
          >
            Export
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-colors"
            onClick={() => setShowCreate(true)}
          >
            New salon
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <p className="p-6 text-muted-foreground text-center text-sm">No tenants match your search.</p>
        ) : (
          <table className="min-w-full divide-y divide-border hidden md:table">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{t.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{t.slug ?? '—'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                        statusClass[(t.status ?? '').toLowerCase()] ?? 'bg-muted text-foreground border-border'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <div className="inline-flex items-center gap-2">
                      {/* Users button */}
                      <button
                        type="button"
                        onClick={() => setUsersTenant(t)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-medium hover:bg-muted/40 transition-colors"
                      >
                        <Users className="w-3.5 h-3.5" />
                        Users
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingTenant(t)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-medium hover:bg-muted/40 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>

                      {/* Suspend / Activate */}
                      {String(t.status ?? '').toLowerCase() === 'active' ? (
                        <button
                          type="button"
                          onClick={() => toggleStatus(t)}
                          disabled={statusActionTenantId === String(t.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300 text-xs font-medium hover:bg-red-500/20 disabled:opacity-50"
                        >
                          {statusActionTenantId === String(t.id) ? 'Working…' : 'Suspend'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleStatus(t)}
                          disabled={statusActionTenantId === String(t.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-medium hover:bg-emerald-500/20 disabled:opacity-50"
                        >
                          {statusActionTenantId === String(t.id) ? 'Working…' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Mobile cards */}
        {filtered.length > 0 && (
          <div className="md:hidden divide-y divide-border">
            {filtered.map((t) => (
              <div key={t.id} className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.slug ?? '—'}</p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                      statusClass[(t.status ?? '').toLowerCase()] ?? 'bg-muted text-foreground border-border'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setUsersTenant(t)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-medium hover:bg-muted/40 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Users
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTenant(t)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-medium hover:bg-muted/40 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  {String(t.status ?? '').toLowerCase() === 'active' ? (
                    <button
                      type="button"
                      onClick={() => toggleStatus(t)}
                      disabled={statusActionTenantId === String(t.id)}
                      className="px-2.5 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300 text-xs font-medium hover:bg-red-500/20 disabled:opacity-50"
                    >
                      {statusActionTenantId === String(t.id) ? 'Working…' : 'Suspend'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleStatus(t)}
                      disabled={statusActionTenantId === String(t.id)}
                      className="px-2.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-medium hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      {statusActionTenantId === String(t.id) ? 'Working…' : 'Activate'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Pagination meta={meta} onPageChange={(p) => load(p)} />

    </div>

    {/* Create/Edit tenant modal — outside space-y-6 so fixed overlay gets no margin from parent */}
    {(showCreate || editingTenant) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-[1px] p-2 sm:p-4" onClick={() => { setShowCreate(false); setEditingTenant(null); }}>
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-2xl border border-border" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-border flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold text-foreground">{editingTenant ? 'Edit tenant' : 'Create tenant'}</h2>
                <p className="text-xs text-muted-foreground mt-1">{editingTenant ? `Updating details for ${editingTenant.name}.` : 'Add a new salon to the platform.'}</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setEditingTenant(null); }}
                disabled={actionLoading}
                className="p-2 rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-50"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <Form {...createForm}>
                <form
                  onSubmit={createForm.handleSubmit(saveTenant, () =>
                    toastError('Please check the highlighted fields.'),
                  )}
                  className="space-y-4"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <RHFTextField control={createForm.control} name="name" label="Name" placeholder="Luxe Salon" disabled={actionLoading} />
                    <RHFTextField control={createForm.control} name="domain" label="Domain (optional)" placeholder="luxe.example" disabled={actionLoading} />
                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none">Plan</label>
                      <select
                        value={createForm.watch('plan')}
                        onChange={(e) => createForm.setValue('plan', e.target.value as any)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={actionLoading}
                      >
                        <option value="basic">Basic</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                      {createForm.formState.errors.plan?.message && (
                        <p className="text-sm font-medium text-destructive">{createForm.formState.errors.plan?.message as any}</p>
                      )}
                    </div>
                    <RHFTextField control={createForm.control} name="currency" label="Currency" placeholder="USD" disabled={actionLoading} />
                    <RHFTextField control={createForm.control} name="timezone" label="Timezone" placeholder="UTC" disabled={actionLoading} />
                    <RHFTextField control={createForm.control} name="phone" label="Phone" placeholder="+1 555 000 0000" disabled={actionLoading} />
                  </div>
                  <RHFTextareaField control={createForm.control} name="address" label="Address" placeholder="Street, city, country" disabled={actionLoading} rows={2} />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium leading-none">Location on Map</label>
                      {createForm.watch('latitude') && (
                        <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                          {createForm.watch('latitude')?.toFixed(5)}, {createForm.watch('longitude')?.toFixed(5)}
                        </span>
                      )}
                    </div>
                    <MapLocationPicker
                      lat={createForm.watch('latitude')}
                      lng={createForm.watch('longitude')}
                      onChange={(lat, lng) => {
                        createForm.setValue('latitude', lat);
                        createForm.setValue('longitude', lng);
                      }}
                    />
                  </div>

                  <div className="pt-1 flex flex-col sm:flex-row gap-2 sm:justify-end">
                    <Button type="button" variant="outline" onClick={() => { setShowCreate(false); setEditingTenant(null); }} disabled={actionLoading} className="rounded-xl">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={actionLoading} className="rounded-xl">
                      {actionLoading ? 'Saving…' : editingTenant ? 'Save changes' : 'Create'}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>
      )}

    {/* Tenant users slide-over — outside space-y-6 so fixed overlay gets no margin from parent */}
    {usersTenant && (
      <TenantUsersPanel
        tenant={usersTenant}
        onClose={() => setUsersTenant(null)}
      />
    )}
    </>
  );
}
