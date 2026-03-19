'use client';

import { useEffect, useMemo, useState } from 'react';
import { tenantsApi, type Tenant } from '@/lib/api';
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

const statusClass: Record<string, string> = {
  active: 'bg-green-50 text-emerald-700 border-emerald-200',
  suspended: 'bg-red-50 text-red-700 border-red-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
};

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
      const matchesStatus =
        statusFilter === 'all' ? true : status === statusFilter;
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
    const payload: any = {
      name: values.name.trim(),
    };
    if (values.domain?.trim()) payload.domain = values.domain.trim();
    if (values.plan) payload.plan = values.plan;
    if (values.timezone?.trim()) payload.timezone = values.timezone.trim();
    if (values.currency?.trim())
      payload.currency = values.currency.trim().toUpperCase().slice(0, 3);
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
    const ok = window.confirm(
      `Are you sure you want to ${nextLabel} "${t.name}"?`,
    );
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
            <p className="font-display text-lg font-semibold text-salon-espresso">
              {suspendedCount}
            </p>
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
            onClick={() => {
              setShowCreate(true);
            }}
          >
            New salon
          </button>
        </div>
      </div>

      {/* Table / list */}
      <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <p className="p-6 text-salon-stone text-center text-sm">
            No tenants match your search.
          </p>
        ) : (
          <table className="min-w-full divide-y divide-salon-sand/60 hidden md:table">
            <thead className="bg-salon-sand/30">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-salon-stone uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-salon-sand/60">
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 text-sm text-salon-espresso">{t.name}</td>
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

        {/* Mobile cards */}        {filtered.length > 0 && (
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
                <div className="flex items-center gap-2">
                  {String(t.status ?? '').toLowerCase() === 'active' ? (
                    <button
                      type="button"
                      onClick={() => toggleStatus(t)}
                      disabled={statusActionTenantId === String(t.id)}
                      className="mt-1 px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 disabled:opacity-50"
                    >
                      {statusActionTenantId === String(t.id) ? 'Working…' : 'Suspend'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleStatus(t)}
                      disabled={statusActionTenantId === String(t.id)}
                      className="mt-1 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 disabled:opacity-50"
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
                ✕
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
                    <RHFTextField
                      control={createForm.control}
                      name="name"
                      label="Name"
                      placeholder="Luxe Salon"
                      disabled={actionLoading}
                    />
                    <RHFTextField
                      control={createForm.control}
                      name="domain"
                      label="Domain (optional)"
                      placeholder="luxe.example"
                      disabled={actionLoading}
                    />
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
                        <p className="text-sm font-medium text-destructive">
                          {createForm.formState.errors.plan?.message as any}
                        </p>
                      )}
                    </div>
                    <RHFTextField
                      control={createForm.control}
                      name="currency"
                      label="Currency"
                      placeholder="USD"
                      disabled={actionLoading}
                    />
                    <RHFTextField
                      control={createForm.control}
                      name="timezone"
                      label="Timezone"
                      placeholder="UTC"
                      disabled={actionLoading}
                    />
                    <RHFTextField
                      control={createForm.control}
                      name="phone"
                      label="Phone"
                      placeholder="+1 555 000 0000"
                      disabled={actionLoading}
                    />
                  </div>
                  <RHFTextareaField
                    control={createForm.control}
                    name="address"
                    label="Address"
                    placeholder="Street, city, country"
                    disabled={actionLoading}
                    rows={3}
                  />

                  <div className="pt-1 flex flex-col sm:flex-row gap-2 sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreate(false)}
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
                      {actionLoading ? 'Creating…' : 'Create'}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
