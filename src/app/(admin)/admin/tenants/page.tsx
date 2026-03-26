'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Loader2, UserPlus, Users, X } from 'lucide-react';

const statusClass: Record<string, string> = {
  active: 'bg-green-50 text-emerald-700 border-emerald-200',
  suspended: 'bg-red-50 text-red-700 border-red-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
};

// ── Role badge colours ────────────────────────────────────────────────────────

const roleBadge: Record<string, string> = {
  super_admin:  'bg-purple-50 text-purple-700 border border-purple-200',
  salon_owner:  'bg-amber-50  text-amber-700  border border-amber-200',
  manager:      'bg-blue-50   text-blue-700   border border-blue-200',
  staff:        'bg-teal-50   text-teal-700   border border-teal-200',
  customer:     'bg-gray-50   text-gray-600   border border-gray-200',
};

function RoleBadge({ role }: { role?: string | null }) {
  const cls = roleBadge[(role ?? '').toLowerCase()] ?? 'bg-gray-50 text-gray-500 border border-gray-200';
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

  const inviteSchema = z.object({
    email: z.string().email('Enter a valid email'),
    name:  z.string().optional(),
    role:  z.enum(['salon_owner', 'manager', 'staff', 'customer']),
  });
  type InviteValues = z.infer<typeof inviteSchema>;

  const inviteForm = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', name: '', role: 'staff' },
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
    loadUsers();
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !showInvite) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id, showInvite]);

  const invite = async (values: InviteValues) => {
    setActionLoading(true);
    const { error } = await adminUsersApi.invite({
      email:     values.email.trim(),
      name:      values.name?.trim() || undefined,
      role:      values.role,
      tenant_id: String(tenant.id),
    });
    setActionLoading(false);
    if (error) { toastError(error); return; }
    toastSuccess('User invited.');
    setShowInvite(false);
    inviteForm.reset({ email: '', name: '', role: 'staff' });
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
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Drawer — wider to avoid email truncation */}
      <div className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-2xl bg-white shadow-2xl border-l border-gray-100">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-salon-gold/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-salon-gold" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base font-semibold text-salon-espresso leading-tight truncate">
                {tenant.name}
              </h2>
              <p className="text-xs text-salon-stone mt-0.5">
                {loading ? 'Loading…' : `${rows.length} user${rows.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-4">
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-salon-gold text-white text-xs font-semibold hover:bg-salon-goldLight transition-colors shadow-sm disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Invite user
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-salon-stone hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-salon-stone" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-8">
              <div className="w-14 h-14 rounded-2xl bg-salon-sand/30 flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-salon-stone/40" />
              </div>
              <p className="font-medium text-salon-espresso text-sm">No users yet</p>
              <p className="text-salon-stone text-xs mt-1 mb-4">This salon doesn't have any users assigned.</p>
              <button
                type="button"
                onClick={() => setShowInvite(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-salon-gold text-white text-xs font-semibold hover:bg-salon-goldLight transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Invite first user
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {rows.map((u) => (
                <div key={u.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/60 transition-colors group">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-salon-gold/10 flex items-center justify-center shrink-0 text-xs font-bold text-salon-gold uppercase">
                    {(u.name ?? u.email ?? '?')[0]}
                  </div>

                  {/* Email + name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-salon-espresso truncate">{u.email}</p>
                    {u.name && <p className="text-xs text-salon-stone mt-0.5 truncate">{u.name}</p>}
                  </div>

                  {/* Role badge */}
                  <RoleBadge role={u.role} />

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => remove(u.id)}
                    disabled={actionLoading}
                    className="opacity-0 group-hover:opacity-100 px-2.5 py-1 rounded-lg border border-red-100 bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 disabled:opacity-50 transition-all"
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
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 shrink-0">
            <p className="text-xs text-salon-stone">{rows.length} user{rows.length !== 1 ? 's' : ''} in <span className="font-medium text-salon-espresso">{tenant.name}</span></p>
          </div>
        )}
      </div>

      {/* ── Invite Modal (layered above drawer) ── */}
      {showInvite && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={() => setShowInvite(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-salon-gold/10 flex items-center justify-center shrink-0">
                  <UserPlus className="w-4.5 h-4.5 text-salon-gold" />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-salon-espresso">Invite user</h3>
                  <p className="text-xs text-salon-stone mt-0.5">
                    Adding to <span className="font-medium text-salon-espresso">{tenant.name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="p-1.5 rounded-lg text-salon-stone hover:bg-gray-100 transition-colors mt-0.5"
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
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-salon-stone uppercase tracking-wide">Role</label>
                    <select
                      value={inviteForm.watch('role')}
                      onChange={(e) => inviteForm.setValue('role', e.target.value as InviteValues['role'])}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-salon-espresso
                        focus:outline-none focus:ring-2 focus:ring-salon-gold/30 focus:border-salon-gold/60 transition-colors"
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
                      className="rounded-xl bg-salon-gold hover:bg-salon-goldLight"
                    >
                      {actionLoading
                        ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Inviting…</>
                        : <><UserPlus className="w-4 h-4 mr-1.5" />Send invite</>
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
    },
    mode: 'onSubmit',
  });

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
        <p className="text-salon-stone text-sm">Loading tenants...</p>
      </div>
    );
  }

  const total = tenants.length;
  const activeCount = tenants.filter((t) => t.status === 'active').length;
  const suspendedCount = tenants.filter((t) => t.status === 'suspended').length;

  const createTenant = async (values: CreateValues) => {
    setActionLoading(true);
    const payload: any = { name: values.name.trim() };
    if (values.domain?.trim()) payload.domain = values.domain.trim();
    if (values.plan) payload.plan = values.plan;
    if (values.timezone?.trim()) payload.timezone = values.timezone.trim();
    if (values.currency?.trim()) payload.currency = values.currency.trim().toUpperCase().slice(0, 3);
    if (values.phone?.trim()) payload.phone = values.phone.trim();
    if (values.address?.trim()) payload.address = values.address.trim();

    const res = await tenantsApi.create(payload);
    setActionLoading(false);
    if ((res as any).error) {
      toastError((res as any).error);
    } else {
      setShowCreate(false);
      createForm.reset();
      await load();
      toastSuccess('Tenant created.');
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
          <h1 className="font-display text-2xl font-semibold text-salon-espresso">Salons</h1>
          <p className="text-salon-stone text-sm mt-1">All salon tenants onboarded to the platform.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm px-4 py-3 text-sm">
            <p className="text-salon-stone">Total salons</p>
            <p className="font-display text-lg font-semibold text-salon-espresso">{total}</p>
          </div>
          <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm px-4 py-3 text-sm hidden sm:block">
            <p className="text-salon-stone">Active</p>
            <p className="font-display text-lg font-semibold text-salon-espresso">
              {activeCount} <span className="text-xs text-salon-stone">/ {total}</span>
            </p>
          </div>
          <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm px-4 py-3 text-sm hidden sm:block">
            <p className="text-salon-stone">Suspended</p>
            <p className="font-display text-lg font-semibold text-salon-espresso">{suspendedCount}</p>
          </div>
        </div>
      </div>

      {/* Search + actions bar */}
      <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm px-4 py-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-salon-stone mb-1">Search salons</label>
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, slug, or status"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-salon-stone mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="w-full sm:w-40 bg-salon-cream/40 border border-salon-sand/60 rounded-lg px-3 py-2 text-sm text-salon-espresso focus:outline-none focus:ring-2 focus:ring-salon-gold/40 focus:border-salon-gold"
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
            className="px-3 py-2 rounded-lg border border-salon-sand/60 text-sm text-salon-espresso hover:bg-salon-sand/40 transition-colors"
          >
            Export
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded-lg bg-salon-gold text-white text-sm font-medium hover:bg-salon-goldLight transition-colors"
            onClick={() => setShowCreate(true)}
          >
            New salon
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <p className="p-6 text-salon-stone text-center text-sm">No tenants match your search.</p>
        ) : (
          <table className="min-w-full divide-y divide-salon-sand/60 hidden md:table">
            <thead className="bg-salon-sand/30">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Created</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-salon-stone uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-salon-sand/60">
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 text-sm font-medium text-salon-espresso">{t.name}</td>
                  <td className="px-4 py-3 text-sm text-salon-stone">{t.slug ?? '—'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                        statusClass[(t.status ?? '').toLowerCase()] ?? 'bg-salon-sand/40 text-salon-espresso border-salon-sand/60'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-salon-stone">
                    {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <div className="inline-flex items-center gap-2">
                      {/* Users button */}
                      <button
                        type="button"
                        onClick={() => setUsersTenant(t)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-salon-sand/60 bg-white text-salon-espresso text-xs font-medium hover:bg-salon-sand/30 transition-colors"
                      >
                        <Users className="w-3.5 h-3.5" />
                        Users
                      </button>

                      {/* Suspend / Activate */}
                      {String(t.status ?? '').toLowerCase() === 'active' ? (
                        <button
                          type="button"
                          onClick={() => toggleStatus(t)}
                          disabled={statusActionTenantId === String(t.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 disabled:opacity-50"
                        >
                          {statusActionTenantId === String(t.id) ? 'Working…' : 'Suspend'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleStatus(t)}
                          disabled={statusActionTenantId === String(t.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 disabled:opacity-50"
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
          <div className="md:hidden divide-y divide-salon-sand/60">
            {filtered.map((t) => (
              <div key={t.id} className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-sm font-semibold text-salon-espresso">{t.name}</p>
                    <p className="text-xs text-salon-stone">{t.slug ?? '—'}</p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                      statusClass[(t.status ?? '').toLowerCase()] ?? 'bg-salon-sand/40 text-salon-espresso border-salon-sand/60'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setUsersTenant(t)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-salon-sand/60 bg-white text-salon-espresso text-xs font-medium hover:bg-salon-sand/30 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Users
                  </button>
                  {String(t.status ?? '').toLowerCase() === 'active' ? (
                    <button
                      type="button"
                      onClick={() => toggleStatus(t)}
                      disabled={statusActionTenantId === String(t.id)}
                      className="px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 disabled:opacity-50"
                    >
                      {statusActionTenantId === String(t.id) ? 'Working…' : 'Suspend'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleStatus(t)}
                      disabled={statusActionTenantId === String(t.id)}
                      className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 disabled:opacity-50"
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

    {/* Create tenant modal — outside space-y-6 so fixed overlay gets no margin from parent */}
    {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-salon-sand/40">
            <div className="p-5 border-b border-salon-sand/40 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold text-salon-espresso">Create tenant</h2>
                <p className="text-xs text-salon-stone mt-1">Add a new salon to the platform.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                disabled={actionLoading}
                className="p-2 rounded-lg text-salon-stone hover:bg-salon-sand/40 disabled:opacity-50"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <Form {...createForm}>
                <form
                  onSubmit={createForm.handleSubmit(createTenant, () =>
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
                  <RHFTextareaField control={createForm.control} name="address" label="Address" placeholder="Street, city, country" disabled={actionLoading} rows={3} />

                  <div className="pt-1 flex flex-col sm:flex-row gap-2 sm:justify-end">
                    <Button type="button" variant="outline" onClick={() => setShowCreate(false)} disabled={actionLoading} className="rounded-xl">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={actionLoading} className="rounded-xl">
                      {actionLoading ? 'Creating…' : 'Create'}
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
