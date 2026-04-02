'use client';

import { useEffect, useState } from 'react';
import { debtApi, type DebtAgingRow } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

export default function DebtAgingPage() {
  const [aging, setAging] = useState<DebtAgingRow[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [writeOffRequests, setWriteOffRequests] = useState<Array<{ id: string; debt_id: string; amount: string | number; status: string; reason?: string | null }>>([]);
  const [requestActionLoading, setRequestActionLoading] = useState<string | null>(null);

  const loadWriteOffRequests = async () => {
    const res = await debtApi.writeOffRequests('pending');
    if (!('error' in res) && res.data) {
      setWriteOffRequests((res.data.requests as any[]) ?? []);
    }
  };

  useEffect(() => {
    debtApi.aging().then((res) => {
      setLoading(false);
      if ('error' in res && res.error) setError(res.error);
      else if (res.data) {
        setAging(res.data.aging);
        setSummary(res.data.summary || {});
      }
    });
    loadWriteOffRequests();
  }, []);

  const handleApprove = async (id: string) => {
    setRequestActionLoading(id);
    const res = await debtApi.approveWriteOff(id);
    setRequestActionLoading(null);
    if ('error' in res && res.error) {
      setError(res.error);
      return;
    }
    loadWriteOffRequests();
  };

  const handleReject = async (id: string) => {
    setRequestActionLoading(id);
    const res = await debtApi.rejectWriteOff(id);
    setRequestActionLoading(null);
    if ('error' in res && res.error) {
      setError(res.error);
      return;
    }
    loadWriteOffRequests();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }
  if (error) return <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl">{error}</div>;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-salon-espresso mb-4">Debt aging report</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-5">
          <p className="text-sm text-salon-stone">Current (0–30 days)</p>
          <p className="text-xl font-semibold text-salon-espresso mt-1">{(summary['0_30'] ?? 0).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-5">
          <p className="text-sm text-salon-stone">31–60 days</p>
          <p className="text-xl font-semibold text-salon-espresso mt-1">{(summary['31_60'] ?? 0).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-5">
          <p className="text-sm text-salon-stone">61–90 days</p>
          <p className="text-xl font-semibold text-salon-espresso mt-1">{(summary['61_90'] ?? 0).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-5">
          <p className="text-sm text-salon-stone">90+ days</p>
          <p className="text-xl font-semibold text-salon-espresso mt-1">{(summary['90_plus'] ?? 0).toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-salon-sand/50">
          <h2 className="text-sm font-semibold text-salon-espresso">Pending write-off approvals</h2>
        </div>
        <table className="min-w-full divide-y divide-salon-sand/60">
          <thead className="bg-salon-sand/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Debt ID</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-salon-stone uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Reason</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-salon-sand/60">
            {writeOffRequests.map((req) => (
              <tr key={req.id}>
                <td className="px-4 py-3 text-sm text-salon-espresso">{req.debt_id}</td>
                <td className="px-4 py-3 text-sm text-right text-salon-stone">{Number(req.amount).toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-salon-stone">{req.reason || '—'}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(req.id)}
                      disabled={requestActionLoading === req.id}
                      className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      disabled={requestActionLoading === req.id}
                      className="px-3 py-1 rounded-lg bg-red-50 text-red-700 border border-red-100"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {writeOffRequests.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-sm text-center text-salon-stone">No pending write-off requests.</td>
              </tr>
            )}
          </tbody>
        </table>
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
