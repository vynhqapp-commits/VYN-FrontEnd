'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { adminSubscriptionsApi, tenantsApi, type AdminSubscriptionRow, type Tenant } from '@/lib/api';

type Plan = {
  id: string;
  name: string;
  price: string;
  billingInterval: 'monthly' | 'yearly';
  features: string[];
};

export default function AdminSubscriptionsPage() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [subs, setSubs] = useState<AdminSubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [plan, setPlan] = useState<'basic' | 'pro' | 'enterprise'>('basic');
  const [status, setStatus] = useState<'active' | 'suspended' | 'trial' | 'cancelled'>('active');
  const [actionLoading, setActionLoading] = useState(false);

  const selectedSub = useMemo(
    () => subs.find((s) => s.tenant_id === selectedTenantId) ?? null,
    [subs, selectedTenantId],
  );

  useEffect(() => {
    Promise.all([tenantsApi.list(), adminSubscriptionsApi.list()]).then(([tRes, sRes]) => {
      if (!('error' in tRes) && tRes.data?.tenants) {
        setTenants(tRes.data.tenants);
        const first = tRes.data.tenants[0]?.id ?? '';
        setSelectedTenantId(first);
      }
      if ('error' in sRes && sRes.error) setError(sRes.error);
      else if (sRes.data?.subscriptions) setSubs(sRes.data.subscriptions);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedTenantId) return;
    const s = subs.find((x) => x.tenant_id === selectedTenantId);
    if (s) {
      setPlan((s.plan as any) ?? 'basic');
      setStatus((s.status as any) ?? 'active');
    }
  }, [selectedTenantId, subs]);

  const save = async () => {
    if (!selectedTenantId) return;
    setActionLoading(true);
    setError(null);
    setSavedMsg(null);
    const res = await adminSubscriptionsApi.upsertForTenant(selectedTenantId, { plan, status });
    setActionLoading(false);
    if ('error' in res && res.error) setError(res.error);
    else {
      const fresh = await adminSubscriptionsApi.list();
      if (!('error' in fresh) && fresh.data?.subscriptions) setSubs(fresh.data.subscriptions);
      setSavedMsg('Subscription updated.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Subscriptions &amp; plans</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Define the SaaS packages your salons can subscribe to.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          Logged in as <span className="font-medium text-foreground">{user?.email}</span> (Admin)
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 rounded-xl text-sm">{error}</div>
      )}
      {savedMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm">{savedMsg}</div>
      )}

      <div className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading subscriptions...</p>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="block text-sm">
                <span className="text-xs font-medium text-muted-foreground">Tenant</span>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="mt-1 w-full border border-input rounded-xl px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-xs font-medium text-muted-foreground">Plan</span>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as any)}
                  className="mt-1 w-full border border-input rounded-xl px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-xs font-medium text-muted-foreground">Status</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="mt-1 w-full border border-input rounded-xl px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="suspended">Suspended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Current: <span className="font-medium text-foreground">{selectedSub?.plan ?? '—'}</span> ·{' '}
                <span className="font-medium text-foreground">{selectedSub?.status ?? '—'}</span>
              </p>
              <button
                type="button"
                onClick={save}
                disabled={actionLoading || !selectedTenantId}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                {actionLoading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


