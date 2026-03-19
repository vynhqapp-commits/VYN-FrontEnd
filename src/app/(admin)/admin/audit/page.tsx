'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { adminAuditApi, tenantsApi, type AdminAuditLogRow, type Tenant } from '@/lib/api';

export default function AdminAuditPage() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [logs, setLogs] = useState<AdminAuditLogRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [tenantId, setTenantId] = useState('all');
  const [action, setAction] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await adminAuditApi.list({
      from: from || undefined,
      to: to || undefined,
      tenant_id: tenantId === 'all' ? undefined : tenantId,
      action: action.trim() ? action.trim() : undefined,
    });
    setLoading(false);
    if ('error' in res && res.error) setError(res.error);
    else setLogs(res.data?.logs ?? []);
  };

  useEffect(() => {
    tenantsApi.list().then((r) => {
      if (!('error' in r) && r.data?.tenants) setTenants(r.data.tenants);
    });
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-salon-espresso">Audit logs</h1>
        <p className="text-salon-stone text-sm mt-1">
          Immutable activity and financial audit logs for complete platform traceability.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <label className="text-xs font-medium text-salon-stone">
          From
          <input value={from} onChange={(e) => setFrom(e.target.value)} type="date" className="mt-1 border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm" />
        </label>
        <label className="text-xs font-medium text-salon-stone">
          To
          <input value={to} onChange={(e) => setTo(e.target.value)} type="date" className="mt-1 border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm" />
        </label>
        <label className="text-xs font-medium text-salon-stone">
          Tenant
          <select value={tenantId} onChange={(e) => setTenantId(e.target.value)} className="mt-1 border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm">
            <option value="all">All</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-salon-stone">
          Action
          <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="admin.tenant.suspend" className="mt-1 border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm" />
        </label>
        <button type="button" onClick={load} disabled={loading} className="px-4 py-2 rounded-xl bg-salon-gold text-white text-sm font-medium disabled:opacity-50">
          {loading ? 'Loading…' : 'Refresh'}
        </button>
        <div className="ml-auto text-xs text-salon-stone">
          Logged in as <span className="font-medium text-salon-espresso">{user?.email}</span> (Admin).
        </div>
      </div>

      <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-5 text-sm text-salon-stone">
        {logs.length === 0 ? (
          <p>No audit logs.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs md:text-sm">
              <thead className="border-b border-salon-sand/40 text-salon-stone">
                <tr>
                  <th className="py-2 text-left font-medium">When</th>
                  <th className="py-2 text-left font-medium">Action</th>
                  <th className="py-2 text-left font-medium">Actor</th>
                  <th className="py-2 text-left font-medium">Tenant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-salon-sand/30">
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2">{l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td>
                    <td className="py-2 text-salon-espresso">{l.action}</td>
                    <td className="py-2">{l.actor?.email ?? '—'}</td>
                    <td className="py-2">{l.tenant?.name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

