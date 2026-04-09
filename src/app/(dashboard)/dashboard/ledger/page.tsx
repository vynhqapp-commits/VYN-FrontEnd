'use client';

import { useEffect, useState } from 'react';
import { ledgerApi, LedgerEntryRow } from '@/lib/api';
import { toast } from 'sonner';
import { BookOpen, Search, Lock, Unlock } from 'lucide-react';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

function typeBadge(type: string) {
  return type === 'credit' ? (
    <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">Credit</span>
  ) : (
    <span className="inline-flex rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-800 dark:text-red-200">Debit</span>
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
    <div className="space-y-5 elite-shell">
      {/* Header */}
      <DashboardPageHeader
        title="Ledger"
        description="Read-only audit of all financial entries. Locked entries belong to closed periods."
        icon={<BookOpen className="w-5 h-5" />}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Credits (shown)</p>
          <p className="mt-1 font-display text-xl font-semibold text-emerald-700 dark:text-emerald-400">${totalCredit.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Debits (shown)</p>
          <p className="mt-1 font-display text-xl font-semibold text-red-600 dark:text-red-400">${totalDebit.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Net (shown)</p>
          <p className={`mt-1 font-display text-xl font-semibold ${totalCredit - totalDebit >= 0 ? 'text-foreground' : 'text-red-600 dark:text-red-400'}`}>
            ${(totalCredit - totalDebit).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="elite-panel p-4 flex flex-wrap gap-2 items-end">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Filter by category…"
              className="w-full rounded-xl border border-border bg-muted/40 py-2 pl-8 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <button type="submit" className="rounded-xl border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent">
            Search
          </button>
        </form>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); load({ type: e.target.value || undefined }); }}
          className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        >
          <option value="">All types</option>
          <option value="credit">Credit</option>
          <option value="debit">Debit</option>
        </select>
        <select
          value={locked}
          onChange={(e) => { setLocked(e.target.value); load({ is_locked: e.target.value || undefined }); }}
          className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        >
          <option value="">All entries</option>
          <option value="true">Locked</option>
          <option value="false">Unlocked</option>
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>

      {/* Table */}
      <div className="elite-panel overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <BookOpen className="size-4 text-[var(--elite-orange)]" />
          <span className="text-sm font-medium elite-title">Ledger entries</span>
          <span className="ml-auto text-xs text-muted-foreground">{entries.length} shown</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs">
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
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className={entry.is_locked ? 'opacity-80' : ''}>
                  <td className="py-3 px-4 text-xs text-muted-foreground">
                    {entry.entry_date ? new Date(entry.entry_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 px-4">{typeBadge(entry.type)}</td>
                  <td className="py-3 px-4 text-xs capitalize">{entry.category ?? '—'}</td>
                  <td className="max-w-[200px] truncate py-3 px-4 text-xs text-muted-foreground">
                    {entry.description ?? '—'}
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-semibold tabular-nums">
                    <span className={entry.type === 'credit' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                      {entry.type === 'credit' ? '+' : '-'}${Number(entry.amount).toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-xs tabular-nums text-muted-foreground">
                    {entry.tax_amount > 0 ? `$${Number(entry.tax_amount).toFixed(2)}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {entry.is_locked
                      ? <Lock   className="mx-auto size-3.5 text-amber-500" />
                      : <Unlock className="mx-auto size-3.5 text-muted-foreground/50" />
                    }
                  </td>
                </tr>
              ))}

              {!entries.length && !loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <BookOpen className="size-8 opacity-30" />
                      <p className="text-sm">No ledger entries found.</p>
                    </div>
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Loading…</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
