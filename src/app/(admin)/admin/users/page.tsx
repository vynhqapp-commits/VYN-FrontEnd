'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { adminUsersApi, tenantsApi, type AdminUserRow, type Tenant, type PaginationMeta } from '@/lib/api';
import { Pagination } from '@/components/data/Pagination';
import { toastError, toastSuccess } from '@/lib/toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { RHFTextField } from '@/components/fields/RHFTextField';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);

  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('all');
  const [q, setQ] = useState('');

  const [showInvite, setShowInvite] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const inviteSchema = z.object({
    email: z.string().email('Enter a valid email'),
    name: z.string().optional(),
    role: z.enum(['super_admin', 'salon_owner', 'manager', 'staff', 'customer']),
    tenant_id: z.string().optional(),
  });
  type InviteValues = z.infer<typeof inviteSchema>;

  const inviteForm = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      name: '',
      role: 'staff',
      tenant_id: '',
    },
    mode: 'onSubmit',
  });

  const load = async (p = page) => {
    setLoading(true);
    setError(null);
    const [tRes, uRes] = await Promise.all([tenantsApi.list(), adminUsersApi.list({
      role: roleFilter === 'all' ? undefined : roleFilter,
      tenant_id: tenantFilter === 'all' ? undefined : tenantFilter,
      q: q.trim() ? q.trim() : undefined,
      page: p,
      per_page: 50,
    })]);

    if (!('error' in tRes) && tRes.data?.tenants) setTenants(tRes.data.tenants);
    if ('error' in uRes && uRes.error) setError(uRes.error);
    else if (uRes.data?.users) {
      setRows(uRes.data.users);
      setMeta((uRes as any).meta ?? null);
      setPage(p);
    }
    setLoading(false);
  };

  useEffect(() => {
    tenantsApi.list().then((r) => {
      if (!('error' in r) && r.data?.tenants) {
        setTenants(r.data.tenants);
        inviteForm.setValue('tenant_id', r.data.tenants[0]?.id ?? '');
      }
    });
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, tenantFilter]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => (r.email ?? '').toLowerCase().includes(needle) || (r.name ?? '').toLowerCase().includes(needle));
  }, [rows, q]);

  const invite = async (values: InviteValues) => {
    setActionLoading(true);
    const { error: err } = await adminUsersApi.invite({
      email: values.email.trim(),
      name: values.name?.trim() || undefined,
      role: values.role,
      tenant_id: values.role === 'super_admin' ? undefined : (values.tenant_id || undefined),
    });
    setActionLoading(false);
    if (err) toastError(err);
    else {
      setShowInvite(false);
      inviteForm.reset({
        email: '',
        name: '',
        role: 'staff',
        tenant_id: tenants[0]?.id ?? '',
      });
      toastSuccess('User invited/created.');
      await load();
    }
  };

  const remove = async (id: string) => {
    setActionLoading(true);
    const { error: err } = await adminUsersApi.delete(id);
    setActionLoading(false);
    if (err) toastError(err);
    else {
      toastSuccess('User deleted.');
      await load();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-salon-espresso">Users</h1>
          <p className="text-salon-stone text-sm mt-1">
            Platform-wide users across all salons. Filter by role, tenant, and status.
          </p>
        </div>
        <div className="text-xs text-salon-stone">
          Logged in as <span className="font-medium text-salon-espresso">{user?.email}</span> (Admin)
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap gap-2 justify-between items-center text-sm">
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm"
            >
              <option value="all">All roles</option>
              <option value="super_admin">Admin</option>
              <option value="salon_owner">Salon owner</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
              <option value="customer">Customer</option>
            </select>
            <select
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
              className="border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm"
            >
              <option value="all">All tenants</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search email/name"
              className="border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowInvite(true)}
            className="px-4 py-2 rounded-xl bg-salon-gold text-white text-sm font-medium disabled:opacity-50"
            disabled={actionLoading}
          >
            Invite user
          </button>
        </div>

        <div className="overflow-x-auto border border-salon-sand/40 rounded-xl max-h-80">
          <table className="min-w-full text-xs md:text-sm">
            <thead className="bg-salon-cream/70 text-salon-stone">
              <tr>
                <th className="py-2 px-3 text-left font-medium">Email</th>
                <th className="py-2 px-3 text-left font-medium">Role</th>
                <th className="py-2 px-3 text-left font-medium">Tenant</th>
                <th className="py-2 px-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-salon-sand/40">
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td className="py-2 px-3 text-salon-espresso">{u.email}</td>
                  <td className="py-2 px-3 text-salon-stone">{u.role ?? '—'}</td>
                  <td className="py-2 px-3 text-salon-stone">
                    {tenants.find((t) => t.id === u.tenant_id)?.name ?? (u.tenant_id ?? '—')}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => remove(u.id)}
                      disabled={actionLoading}
                      className="text-[11px] px-2 py-1 rounded-lg bg-red-50 text-red-700 border border-red-100 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td className="py-3 px-3 text-center text-salon-stone" colSpan={4}>
                    {loading ? 'Loading...' : 'No users match these filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination meta={meta} onPageChange={(p) => load(p)} />

      {showInvite && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="font-display text-xl font-semibold text-salon-espresso">Invite user</h2>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                disabled={actionLoading}
                className="text-salon-stone hover:text-salon-espresso disabled:opacity-50"
              >
                ✕
              </button>
            </div>
            <Form {...inviteForm}>
              <form
                onSubmit={inviteForm.handleSubmit(invite, () =>
                  toastError('Please check the highlighted fields.'),
                )}
                className="space-y-4"
              >
                <RHFTextField
                  control={inviteForm.control}
                  name="email"
                  label="Email"
                  placeholder="user@example.com"
                  type="email"
                  disabled={actionLoading}
                />
                <RHFTextField
                  control={inviteForm.control}
                  name="name"
                  label="Name (optional)"
                  placeholder="Full name"
                  disabled={actionLoading}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">Role</label>
                    <select
                      value={inviteForm.watch('role')}
                      onChange={(e) => inviteForm.setValue('role', e.target.value as any)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={actionLoading}
                    >
                      <option value="super_admin">Admin</option>
                      <option value="salon_owner">Salon owner</option>
                      <option value="manager">Manager</option>
                      <option value="staff">Staff</option>
                      <option value="customer">Customer</option>
                    </select>
                    {inviteForm.formState.errors.role?.message && (
                      <p className="text-sm font-medium text-destructive">
                        {inviteForm.formState.errors.role?.message as any}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">Tenant</label>
                    <Combobox
                      value={inviteForm.watch('tenant_id') || ''}
                      onValueChange={(v) => inviteForm.setValue('tenant_id', v)}
                      options={tenants.map((t) => ({
                        value: String(t.id),
                        label: String(t.name ?? 'Unnamed tenant'),
                      }))}
                      placeholder="Select tenant"
                      searchPlaceholder="Search tenants..."
                      disabled={actionLoading || inviteForm.watch('role') === 'super_admin'}
                    />
                    {inviteForm.watch('role') === 'super_admin' ? (
                      <p className="text-xs text-muted-foreground">
                        Admin users aren’t assigned to a tenant.
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="pt-1 flex justify-end gap-2">
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
                    {actionLoading ? 'Saving…' : 'Invite'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}


