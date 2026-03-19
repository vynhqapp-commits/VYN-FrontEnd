'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { adminReportsApi } from '@/lib/api';

export default function AdminFranchiseKpisPage() {
  const { user } = useAuth();
  const [from, setFrom] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    adminReportsApi.franchiseKpis(from, to).then((r) => {
      setLoading(false);
      if (r.error) setError(r.error);
      else setRows((r.data as any)?.rows ?? []);
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-salon-espresso">Franchise KPIs</h1>
        <p className="text-salon-stone text-sm mt-1">
          Multi-location performance dashboard: revenue, utilization, and underperforming branches.
        </p>
      </div>
      <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <label className="text-xs font-medium text-salon-stone">
          From
          <input value={from} onChange={(e) => setFrom(e.target.value)} type="date" className="mt-1 border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm" />
        </label>
        <label className="text-xs font-medium text-salon-stone">
          To
          <input value={to} onChange={(e) => setTo(e.target.value)} type="date" className="mt-1 border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm" />
        </label>
        <button type="button" onClick={load} disabled={loading} className="px-4 py-2 rounded-xl bg-salon-gold text-white text-sm font-medium disabled:opacity-50">
          {loading ? 'Loading…' : 'Refresh'}
        </button>
        <div className="ml-auto text-xs text-salon-stone">
          Logged in as <span className="font-medium text-salon-espresso">{user?.email}</span> (Admin).
        </div>
      </div>
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">{error}</div>
      )}
      <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-5 text-sm text-salon-stone">
        {rows.length === 0 ? (
          <p>No data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs md:text-sm">
              <thead className="border-b border-salon-sand/40 text-salon-stone">
                <tr>
                  <th className="py-2 text-left font-medium">Tenant</th>
                  <th className="py-2 text-left font-medium">Plan</th>
                  <th className="py-2 text-left font-medium">Status</th>
                  <th className="py-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-salon-sand/30">
                {rows.map((r) => (
                  <tr key={r.tenant_id}>
                    <td className="py-2 text-salon-espresso">{r.tenant_name}</td>
                    <td className="py-2 text-salon-stone">{r.plan}</td>
                    <td className="py-2 text-salon-stone">{r.status}</td>
                    <td className="py-2 text-right text-salon-espresso">{Number(r.revenue ?? 0).toFixed(2)}</td>
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

