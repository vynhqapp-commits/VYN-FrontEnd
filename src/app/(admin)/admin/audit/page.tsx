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
        <h1 className="font-display text-2xl font-semibold text-foreground">Audit logs</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Immutable activity and financial audit logs for complete platform traceability.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 rounded-xl text-sm">{error}</div>
      )}

      <div className="bg-card rounded-xl border border-border shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <label className="text-xs font-medium text-muted-foreground">
          From
          <input value={from} onChange={(e) => setFrom(e.target.value)} type="date" className="mt-1 border border-input rounded-xl px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          To
          <input value={to} onChange={(e) => setTo(e.target.value)} type="date" className="mt-1 border border-input rounded-xl px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Tenant
          <select value={tenantId} onChange={(e) => setTenantId(e.target.value)} className="mt-1 border border-input rounded-xl px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="all">All</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Action
          <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="admin.tenant.suspend" className="mt-1 border border-input rounded-xl px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </label>
        <button type="button" onClick={load} disabled={loading} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
          {loading ? 'Loading…' : 'Refresh'}
        </button>
        <div className="ml-auto text-xs text-muted-foreground">
          Logged in as <span className="font-medium text-foreground">{user?.email}</span> (Admin).
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm p-5 text-sm text-muted-foreground">
        {logs.length === 0 ? (
          <p>No audit logs.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs md:text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-2 text-left font-medium">When</th>
                  <th className="py-2 text-left font-medium">Action</th>
                  <th className="py-2 text-left font-medium">Actor</th>
                  <th className="py-2 text-left font-medium">Tenant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2">{l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td>
                    <td className="py-2 text-foreground">{l.action}</td>
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

