'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { transactionsApi, type Transaction } from '@/lib/api';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    transactionsApi.list().then((res) => {
      setLoading(false);
      if ('error' in res && res.error) setError(res.error);
      else if (res.data?.transactions) setTransactions(res.data.transactions);
    });
  }, []);

  if (loading) return <p className="text-salon-stone">Loading transactions...</p>;
  if (error) return <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl">{error}</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h1 className="font-display text-2xl font-semibold text-salon-espresso">POS / Sales</h1>
        <Link
          href="/dashboard/pos"
          className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-salon-gold text-white text-sm font-semibold hover:bg-salon-goldLight transition-colors"
        >
          New sale (POS)
        </Link>
      </div>
      <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-salon-sand/60">
          <thead className="bg-salon-sand/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Location</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Total</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-salon-sand/60">
            {transactions.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3 text-sm text-salon-stone">{t.created_at ? new Date(t.created_at).toLocaleString() : '—'}</td>
                <td className="px-4 py-3 text-sm text-salon-espresso">{t.Location?.name ?? t.location_id}</td>
                <td className="px-4 py-3 text-sm text-salon-stone">{Number(t.total).toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-salon-stone">{t.status}</td>
                <td className="px-4 py-3 text-sm">
                  <Link href={`/dashboard/transactions/${t.id}/receipt`} className="text-salon-gold font-medium hover:text-salon-goldLight transition-colors">Receipt</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {transactions.length === 0 && (
          <p className="p-6 text-salon-stone text-center">No transactions found.</p>
        )}
      </div>
    </div>
  );
}
