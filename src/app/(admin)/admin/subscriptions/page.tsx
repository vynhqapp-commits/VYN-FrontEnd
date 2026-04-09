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
          <h1 className="font-display text-2xl font-semibold text-salon-espresso">Subscriptions &amp; plans</h1>
          <p className="text-salon-stone text-sm mt-1">
            Define the SaaS packages your salons can subscribe to.
          </p>
        </div>
        <div className="text-xs text-salon-stone">
          Logged in as <span className="font-medium text-salon-espresso">{user?.email}</span> (Admin)
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">{error}</div>
      )}
      {savedMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-sm">{savedMsg}</div>
      )}

      <div className="bg-card rounded-2xl border border-salon-sand/40 shadow-sm p-5 space-y-4">
        {loading ? (
          <p className="text-sm text-salon-stone">Loading subscriptions...</p>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="block text-sm">
                <span className="text-xs font-medium text-salon-stone">Tenant</span>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="mt-1 w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-xs font-medium text-salon-stone">Plan</span>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as any)}
                  className="mt-1 w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm"
                >
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-xs font-medium text-salon-stone">Status</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="mt-1 w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="suspended">Suspended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-salon-stone">
                Current: <span className="font-medium text-salon-espresso">{selectedSub?.plan ?? '—'}</span> ·{' '}
                <span className="font-medium text-salon-espresso">{selectedSub?.status ?? '—'}</span>
              </p>
              <button
                type="button"
                onClick={save}
                disabled={actionLoading || !selectedTenantId}
                className="px-4 py-2 rounded-xl bg-salon-gold text-white text-sm font-medium disabled:opacity-50"
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


