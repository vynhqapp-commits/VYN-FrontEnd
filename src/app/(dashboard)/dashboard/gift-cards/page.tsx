'use client';

import { useEffect, useState } from 'react';
import { giftCardsApi, GiftCard } from '@/lib/api';
import { toast } from 'sonner';
import { Gift, Plus, Search, X, Ban, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    active:    { label: 'Active',    cls: 'bg-emerald-100 text-emerald-700' },
    exhausted: { label: 'Exhausted', cls: 'bg-gray-100   text-gray-600'    },
    expired:   { label: 'Expired',   cls: 'bg-amber-100  text-amber-700'   },
    void:      { label: 'Void',      cls: 'bg-red-100    text-red-600'     },
  };
  const s = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {status === 'active'    && <CheckCircle2 className="size-3" />}
      {status === 'exhausted' && <Clock        className="size-3" />}
      {status === 'expired'   && <AlertCircle  className="size-3" />}
      {status === 'void'      && <Ban          className="size-3" />}
      {s.label}
    </span>
  );
}

function fmt(n: string | number) {
  return Number(n).toFixed(2);
}

// ─── Issue Modal ─────────────────────────────────────────────────────────────

function IssueModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [amount, setAmount]     = useState('');
  const [currency, setCurrency] = useState('USD');
  const [expiresAt, setExpiresAt] = useState('');
  const [code, setCode]         = useState('');
  const [saving, setSaving]     = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }
    setSaving(true);
    const { error } = await giftCardsApi.create({
      initial_balance: Number(amount),
      currency:  currency || 'USD',
      expires_at: expiresAt || undefined,
      code:      code || undefined,
    });
    setSaving(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Gift card issued successfully.');
      onCreated();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />
      <form
        onSubmit={submit}
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-salon-gold/10 flex items-center justify-center">
              <Gift className="size-4 text-salon-gold" />
            </div>
            <h2 className="font-display text-lg font-semibold text-salon-espresso">Issue gift card</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-7 flex items-center justify-center rounded-lg text-salon-stone hover:bg-salon-sand/40 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-salon-stone mb-1">Amount <span className="text-red-500">*</span></label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 text-sm bg-salon-cream/50 focus:outline-none focus:ring-2 focus:ring-salon-gold/30"
              required
            />
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-salon-stone mb-1">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 text-sm bg-salon-cream/50 focus:outline-none focus:ring-2 focus:ring-salon-gold/30"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="INR">INR</option>
              <option value="AED">AED</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-salon-stone mb-1">Expires at <span className="text-salon-stone/60">(optional)</span></label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 text-sm bg-salon-cream/50 focus:outline-none focus:ring-2 focus:ring-salon-gold/30"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-salon-stone mb-1">Custom code <span className="text-salon-stone/60">(optional — auto-generated if blank)</span></label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. GIFT-XMAS"
              maxLength={64}
              className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 text-sm bg-salon-cream/50 font-mono focus:outline-none focus:ring-2 focus:ring-salon-gold/30"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-salon-sand/60 text-salon-espresso text-sm hover:bg-salon-sand/30 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-salon-gold text-white text-sm font-medium hover:bg-salon-gold/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Issuing…' : 'Issue gift card'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Verify Section ───────────────────────────────────────────────────────────

function VerifySection() {
  const [code, setCode]     = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<GiftCard | null>(null);
  const [err, setErr]       = useState<string | null>(null);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setChecking(true);
    setResult(null);
    setErr(null);
    const { data, error } = await giftCardsApi.getByCode(code.trim());
    setChecking(false);
    if (error) setErr(error);
    else if (data?.gift_card) setResult(data.gift_card);
  };

  return (
    <section className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Search className="size-4 text-salon-gold" />
        <h2 className="font-display text-base font-semibold text-salon-espresso">Verify a card</h2>
      </div>
      <form onSubmit={verify} className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter gift card code…"
          className="flex-1 border border-salon-sand/60 rounded-xl px-3 py-2 text-sm bg-salon-cream/50 font-mono focus:outline-none focus:ring-2 focus:ring-salon-gold/30"
        />
        <button
          type="submit"
          disabled={!code.trim() || checking}
          className="px-4 py-2 rounded-xl bg-salon-espresso text-white text-sm font-medium disabled:opacity-50 hover:bg-salon-espresso/90 transition-colors"
        >
          {checking ? 'Checking…' : 'Verify'}
        </button>
      </form>

      {err && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
          <AlertCircle className="size-4 shrink-0" />
          {err}
        </div>
      )}

      {result && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700 font-mono">{result.code}</span>
            {statusBadge(result.status)}
          </div>
          <div className="grid grid-cols-2 gap-1 text-xs text-emerald-800">
            <span>Initial balance: <strong>{fmt(result.initial_balance)} {result.currency}</strong></span>
            <span>Remaining: <strong>{fmt(result.current_balance ?? result.remaining_balance)} {result.currency}</strong></span>
            {result.expires_at && (
              <span className="col-span-2">Expires: <strong>{new Date(result.expires_at).toLocaleDateString()}</strong></span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GiftCardsPage() {
  const [cards, setCards]     = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const [search, setSearch]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [voidingId, setVoidingId] = useState<string | null>(null);

  const loadCards = async (s = search, st = filterStatus) => {
    setLoading(true);
    const { data, error } = await giftCardsApi.list({
      search: s || undefined,
      status: st || undefined,
    });
    setLoading(false);
    if (error) toast.error(error);
    else if (data) setCards(data.gift_cards ?? []);
  };

  useEffect(() => { loadCards(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadCards();
  };

  const handleVoid = async (card: GiftCard) => {
    if (!confirm(`Void gift card ${card.code}? This cannot be undone.`)) return;
    setVoidingId(card.id);
    const { error } = await giftCardsApi.void(card.id);
    setVoidingId(null);
    if (error) toast.error(error);
    else {
      toast.success(`Gift card ${card.code} voided.`);
      loadCards();
    }
  };

  return (
    <>
      <div className="space-y-5">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-salon-espresso">Gift Cards</h1>
            <p className="text-salon-stone text-sm mt-0.5">Issue, track, and manage gift cards for your clients.</p>
          </div>
          <button
            onClick={() => setShowIssue(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-salon-gold text-white text-sm font-medium hover:bg-salon-gold/90 transition-colors shadow-sm"
          >
            <Plus className="size-4" />
            Issue gift card
          </button>
        </div>

        {/* Verify section */}
        <VerifySection />

        {/* Filters + table */}
        <section className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-2 p-4 border-b border-salon-sand/40">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-salon-stone/60" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by code…"
                  className="w-full pl-8 pr-3 py-2 border border-salon-sand/60 rounded-xl text-sm bg-salon-cream/50 focus:outline-none focus:ring-2 focus:ring-salon-gold/30"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-2 rounded-xl border border-salon-sand/60 text-salon-espresso text-sm hover:bg-salon-sand/30 transition-colors"
              >
                Search
              </button>
            </form>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); loadCards(search, e.target.value); }}
              className="border border-salon-sand/60 rounded-xl px-3 py-2 text-sm bg-salon-cream/50 focus:outline-none focus:ring-2 focus:ring-salon-gold/30"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="exhausted">Exhausted</option>
              <option value="expired">Expired</option>
              <option value="void">Void</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-salon-cream/60 text-salon-stone text-xs">
                <tr>
                  <th className="py-3 px-4 text-left font-medium">Code</th>
                  <th className="py-3 px-4 text-right font-medium">Initial</th>
                  <th className="py-3 px-4 text-right font-medium">Remaining</th>
                  <th className="py-3 px-4 text-left font-medium">Currency</th>
                  <th className="py-3 px-4 text-left font-medium">Status</th>
                  <th className="py-3 px-4 text-left font-medium">Expires</th>
                  <th className="py-3 px-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-salon-sand/30">
                {cards.map((card) => (
                  <tr key={card.id} className="hover:bg-salon-cream/30 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono text-salon-espresso font-medium tracking-wide">{card.code}</span>
                    </td>
                    <td className="py-3 px-4 text-right text-salon-espresso tabular-nums">
                      {fmt(card.initial_balance)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      <span className={Number(card.current_balance ?? card.remaining_balance) <= 0 ? 'text-salon-stone' : 'text-salon-espresso font-medium'}>
                        {fmt(card.current_balance ?? card.remaining_balance)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-salon-stone text-xs">{card.currency}</td>
                    <td className="py-3 px-4">{statusBadge(card.status)}</td>
                    <td className="py-3 px-4 text-salon-stone text-xs">
                      {card.expires_at
                        ? new Date(card.expires_at).toLocaleDateString()
                        : <span className="text-salon-stone/50">No expiry</span>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {card.status === 'active' && (
                        <button
                          onClick={() => handleVoid(card)}
                          disabled={voidingId === card.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                          <Ban className="size-3" />
                          {voidingId === card.id ? 'Voiding…' : 'Void'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {!cards.length && !loading && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-salon-stone">
                        <Gift className="size-8 opacity-30" />
                        <p className="text-sm">No gift cards found.</p>
                        <button
                          onClick={() => setShowIssue(true)}
                          className="mt-1 text-xs text-salon-gold hover:underline"
                        >
                          Issue your first gift card
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-salon-stone text-sm">
                      Loading…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Issue modal — outside table container */}
      {showIssue && (
        <IssueModal
          onClose={() => setShowIssue(false)}
          onCreated={loadCards}
        />
      )}
    </>
  );
}
