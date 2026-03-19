'use client';

import { useEffect, useState } from 'react';
import { debtApi, type DebtAgingRow } from '@/lib/api';

export default function DebtAgingPage() {
  const [aging, setAging] = useState<DebtAgingRow[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    debtApi.aging().then((res) => {
      setLoading(false);
      if ('error' in res && res.error) setError(res.error);
      else if (res.data) {
        setAging(res.data.aging);
        setSummary(res.data.summary || {});
      }
    });
  }, []);

  if (loading) return <p className="text-salon-stone">Loading...</p>;
  if (error) return <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl">{error}</div>;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-salon-espresso mb-4">Debt aging report</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-5">
          <p className="text-sm text-salon-stone">Current (0–30 days)</p>
          <p className="text-xl font-semibold text-salon-espresso mt-1">{(summary.current ?? 0).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-5">
          <p className="text-sm text-salon-stone">31–60 days</p>
          <p className="text-xl font-semibold text-salon-espresso mt-1">{(summary.days30 ?? 0).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-5">
          <p className="text-sm text-salon-stone">61–90 days</p>
          <p className="text-xl font-semibold text-salon-espresso mt-1">{(summary.days60 ?? 0).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-5">
          <p className="text-sm text-salon-stone">90+ days</p>
          <p className="text-xl font-semibold text-salon-espresso mt-1">{(summary.days90Plus ?? 0).toFixed(2)}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-salon-sand/60">
          <thead className="bg-salon-sand/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Client</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Contact</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-salon-stone uppercase tracking-wider">Balance</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-salon-stone uppercase tracking-wider">Days overdue</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Bucket</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-salon-sand/60">
            {aging.map((row) => (
              <tr key={row.client_id}>
                <td className="px-4 py-3 text-sm text-salon-espresso">{row.client?.full_name ?? row.client_id}</td>
                <td className="px-4 py-3 text-sm text-salon-stone">{row.client?.phone || row.client?.email || '—'}</td>
                <td className="px-4 py-3 text-sm text-right text-salon-stone">{row.balance.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-right text-salon-stone">{row.oldest_debt_days}</td>
                <td className="px-4 py-3 text-sm text-salon-stone">{row.bucket}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {aging.length === 0 && <p className="p-6 text-salon-stone text-center">No outstanding debt.</p>}
      </div>
    </div>
  );
}
