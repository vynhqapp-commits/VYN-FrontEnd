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
        <h1 className="font-display text-2xl font-semibold text-foreground">Global reports</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Platform-wide revenue, expenses, P&amp;L, VAT, and franchise comparison dashboards.
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
        <button
          type="button"
          onClick={loadFinancial}
          disabled={loadingFinancial}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          {loadingFinancial ? 'Loading…' : 'Refresh'}
        </button>
        <div className="ml-auto text-xs text-muted-foreground">
          Logged in as <span className="font-medium text-foreground">{user?.email}</span> (Admin).
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tenants</p>
          <p className="font-display text-2xl font-semibold text-foreground mt-1">{kpis?.total_tenants ?? '—'}</p>
          <p className="text-[11px] text-muted-foreground">{kpis?.active_tenants ?? 0} active · {kpis?.suspended_tenants ?? 0} suspended</p>
        </div>
        <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Users</p>
          <p className="font-display text-2xl font-semibold text-foreground mt-1">{kpis?.total_users ?? '—'}</p>
          <p className="text-[11px] text-muted-foreground">All accounts</p>
        </div>
        <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Revenue</p>
          <p className="font-display text-2xl font-semibold text-foreground mt-1">{revenueTotal.toFixed(2)}</p>
          <p className="text-[11px] text-muted-foreground">From ledger (range)</p>
        </div>
        <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Profit</p>
          <p className="font-display text-2xl font-semibold text-foreground mt-1">{profit.toFixed(2)}</p>
          <p className="text-[11px] text-muted-foreground">Revenue - expenses</p>
        </div>
      </div>

      {/* Breakdown table */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 text-sm text-muted-foreground">
        {financial.length === 0 ? (
          <p>No financial rows for selected range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs md:text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-2 text-left font-medium">Type</th>
                  <th className="py-2 text-left font-medium">Category</th>
                  <th className="py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {financial.map((r) => (
                  <tr key={`${r.type}-${r.category}`}>
                    <td className="py-2 text-foreground">{r.type}</td>
                    <td className="py-2 text-muted-foreground">{r.category || '—'}</td>
                    <td className="py-2 text-right text-foreground">{Number(r.total ?? 0).toFixed(2)}</td>
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

