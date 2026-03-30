'use client';

import { useEffect, useState } from 'react';
import { ledgerApi, LedgerEntryRow } from '@/lib/api';
import { toast } from 'sonner';
import { BookOpen, Search, Lock, Unlock } from 'lucide-react';

function typeBadge(type: string) {
  return type === 'credit' ? (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Credit</span>
  ) : (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">Debit</span>
  );
}

export default function LedgerPage() {
  const [entries, setEntries]       = useState<LedgerEntryRow[]>([]);
  const [loading, setLoading]       = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [category, setCategory]     = useState('');
  const [from, setFrom]             = useState('');
  const [to, setTo]                 = useState('');
  const [locked, setLocked]         = useState('');

  const load = async (overrides?: Partial<{ type: string; category: string; from: string; to: string; is_locked: string }>) => {
    setLoading(true);
    const { data, error } = await ledgerApi.list({
      type:      overrides?.type      ?? (typeFilter || undefined),
      category:  overrides?.category  ?? (category  || undefined),
      from:      overrides?.from      ?? (from      || undefined),
      to:        overrides?.to        ?? (to        || undefined),
      is_locked: overrides?.is_locked ?? (locked    || undefined),
    });
    setLoading(false);
    if (error) toast.error(error);
    else if (data) setEntries(data.entries ?? []);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(); };

  const totalCredit = entries.filter((e) => e.type === 'credit').reduce((s, e) => s + e.amount, 0);
  const totalDebit  = entries.filter((e) => e.type === 'debit' ).reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-semibold text-salon-espresso">Ledger</h1>
        <p className="text-salon-stone text-sm mt-0.5">
          Read-only audit of all financial entries. Locked entries belong to closed periods.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm p-4">
          <p className="text-xs text-salon-stone">Credits (shown)</p>
          <p className="font-display text-xl font-semibold text-emerald-700 mt-1">${totalCredit.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm p-4">
          <p className="text-xs text-salon-stone">Debits (shown)</p>
          <p className="font-display text-xl font-semibold text-red-600 mt-1">${totalDebit.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm p-4">
          <p className="text-xs text-salon-stone">Net (shown)</p>
          <p className={`font-display text-xl font-semibold mt-1 ${totalCredit - totalDebit >= 0 ? 'text-salon-espresso' : 'text-red-600'}`}>
            ${(totalCredit - totalDebit).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm p-4 flex flex-wrap gap-2 items-end">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-salon-stone/60" />
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Filter by category…"
              className="w-full pl-8 pr-3 py-2 border border-salon-sand/60 rounded-xl text-sm bg-salon-cream/50 focus:outline-none focus:ring-2 focus:ring-salon-gold/30"
            />
          </div>
          <button type="submit" className="px-3 py-2 rounded-xl border border-salon-sand/60 text-salon-espresso text-sm hover:bg-salon-sand/30 transition-colors">
            Search
          </button>
        </form>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); load({ type: e.target.value || undefined }); }}
          className="border border-salon-sand/60 rounded-xl px-3 py-2 text-sm bg-salon-cream/50 focus:outline-none focus:ring-2 focus:ring-salon-gold/30"
        >
          <option value="">All types</option>
          <option value="credit">Credit</option>
          <option value="debit">Debit</option>
        </select>
        <select
          value={locked}
          onChange={(e) => { setLocked(e.target.value); load({ is_locked: e.target.value || undefined }); }}
          className="border border-salon-sand/60 rounded-xl px-3 py-2 text-sm bg-salon-cream/50 focus:outline-none focus:ring-2 focus:ring-salon-gold/30"
        >
          <option value="">All entries</option>
          <option value="true">Locked</option>
          <option value="false">Unlocked</option>
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="border border-salon-sand/60 rounded-xl px-3 py-2 text-sm bg-salon-cream/50 focus:outline-none focus:ring-2 focus:ring-salon-gold/30"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="border border-salon-sand/60 rounded-xl px-3 py-2 text-sm bg-salon-cream/50 focus:outline-none focus:ring-2 focus:ring-salon-gold/30"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-salon-sand/30">
          <BookOpen className="size-4 text-salon-gold" />
          <span className="text-sm font-medium text-salon-espresso">Ledger entries</span>
          <span className="ml-auto text-xs text-salon-stone">{entries.length} shown</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-salon-cream/60 text-xs text-salon-stone">
              <tr>
                <th className="py-3 px-4 text-left font-medium">Date</th>
                <th className="py-3 px-4 text-left font-medium">Type</th>
                <th className="py-3 px-4 text-left font-medium">Category</th>
                <th className="py-3 px-4 text-left font-medium">Description</th>
                <th className="py-3 px-4 text-right font-medium">Amount</th>
                <th className="py-3 px-4 text-right font-medium">Tax</th>
                <th className="py-3 px-4 text-center font-medium">Locked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-salon-sand/30">
              {entries.map((entry) => (
                <tr key={entry.id} className={`hover:bg-salon-cream/30 transition-colors ${entry.is_locked ? 'opacity-80' : ''}`}>
                  <td className="py-3 px-4 text-salon-stone text-xs">
                    {entry.entry_date ? new Date(entry.entry_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 px-4">{typeBadge(entry.type)}</td>
                  <td className="py-3 px-4 text-salon-espresso text-xs capitalize">{entry.category ?? '—'}</td>
                  <td className="py-3 px-4 text-salon-stone text-xs max-w-[200px] truncate">
                    {entry.description ?? '—'}
                  </td>
                  <td className={`py-3 px-4 text-right font-semibold tabular-nums text-sm ${entry.type === 'credit' ? 'text-emerald-700' : 'text-red-600'}`}>
                    {entry.type === 'credit' ? '+' : '-'}${Number(entry.amount).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right text-salon-stone tabular-nums text-xs">
                    {entry.tax_amount > 0 ? `$${Number(entry.tax_amount).toFixed(2)}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {entry.is_locked
                      ? <Lock   className="size-3.5 text-amber-500 mx-auto" />
                      : <Unlock className="size-3.5 text-salon-stone/40 mx-auto" />
                    }
                  </td>
                </tr>
              ))}

              {!entries.length && !loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-salon-stone">
                      <BookOpen className="size-8 opacity-30" />
                      <p className="text-sm">No ledger entries found.</p>
                    </div>
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-salon-stone text-sm">Loading…</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
