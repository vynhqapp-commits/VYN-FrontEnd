'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { adminReportsApi } from '@/lib/api';

export default function AdminGlobalReportsPage() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [financial, setFinancial] = useState<{ type: string; category: string; total: number }[]>([]);
  const [loadingFinancial, setLoadingFinancial] = useState(false);

  useEffect(() => {
    adminReportsApi.kpis().then((r) => {
      if (r.error) setError(r.error);
      else setKpis(r.data);
    });
  }, []);

  const loadFinancial = () => {
    setLoadingFinancial(true);
    setError(null);
    adminReportsApi.financial(from, to).then((r) => {
      setLoadingFinancial(false);
      if (r.error) setError(r.error);
      else setFinancial((r.data as any)?.rows ?? []);
    });
  };

  useEffect(() => {
    loadFinancial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revenueTotal = financial
    .filter((r) => r.type === 'revenue')
    .reduce((sum, r) => sum + Number(r.total ?? 0), 0);
  const expenseTotal = financial
    .filter((r) => r.type === 'expense')
    .reduce((sum, r) => sum + Number(r.total ?? 0), 0);
  const profit = revenueTotal - expenseTotal;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-salon-espresso">Global reports</h1>
        <p className="text-salon-stone text-sm mt-1">
          Platform-wide revenue, expenses, P&amp;L, VAT, and franchise comparison dashboards.
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
        <button
          type="button"
          onClick={loadFinancial}
          disabled={loadingFinancial}
          className="px-4 py-2 rounded-xl bg-salon-gold text-white text-sm font-medium disabled:opacity-50"
        >
          {loadingFinancial ? 'Loading…' : 'Refresh'}
        </button>
        <div className="ml-auto text-xs text-salon-stone">
          Logged in as <span className="font-medium text-salon-espresso">{user?.email}</span> (Admin).
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm p-4">
          <p className="text-xs font-semibold text-salon-stone uppercase tracking-wide">Tenants</p>
          <p className="font-display text-2xl font-semibold text-salon-espresso mt-1">{kpis?.total_tenants ?? '—'}</p>
          <p className="text-[11px] text-salon-stone">{kpis?.active_tenants ?? 0} active · {kpis?.suspended_tenants ?? 0} suspended</p>
        </div>
        <div className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm p-4">
          <p className="text-xs font-semibold text-salon-stone uppercase tracking-wide">Users</p>
          <p className="font-display text-2xl font-semibold text-salon-espresso mt-1">{kpis?.total_users ?? '—'}</p>
          <p className="text-[11px] text-salon-stone">All accounts</p>
        </div>
        <div className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm p-4">
          <p className="text-xs font-semibold text-salon-stone uppercase tracking-wide">Revenue</p>
          <p className="font-display text-2xl font-semibold text-salon-espresso mt-1">{revenueTotal.toFixed(2)}</p>
          <p className="text-[11px] text-salon-stone">From ledger (range)</p>
        </div>
        <div className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm p-4">
          <p className="text-xs font-semibold text-salon-stone uppercase tracking-wide">Profit</p>
          <p className="font-display text-2xl font-semibold text-salon-espresso mt-1">{profit.toFixed(2)}</p>
          <p className="text-[11px] text-salon-stone">Revenue - expenses</p>
        </div>
      </div>

      {/* Breakdown table */}
      <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-5 text-sm text-salon-stone">
        {financial.length === 0 ? (
          <p>No financial rows for selected range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs md:text-sm">
              <thead className="border-b border-salon-sand/40 text-salon-stone">
                <tr>
                  <th className="py-2 text-left font-medium">Type</th>
                  <th className="py-2 text-left font-medium">Category</th>
                  <th className="py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-salon-sand/30">
                {financial.map((r) => (
                  <tr key={`${r.type}-${r.category}`}>
                    <td className="py-2 text-salon-espresso">{r.type}</td>
                    <td className="py-2 text-salon-stone">{r.category || '—'}</td>
                    <td className="py-2 text-right text-salon-espresso">{Number(r.total ?? 0).toFixed(2)}</td>
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

