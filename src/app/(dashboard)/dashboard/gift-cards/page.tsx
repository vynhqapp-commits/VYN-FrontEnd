'use client';

import { useEffect, useState } from 'react';
import { giftCardsApi, GiftCard } from '@/lib/api';

export default function GiftCardsPage() {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [expiresAt, setExpiresAt] = useState('');
  const [code, setCode] = useState('');

  const [creating, setCreating] = useState(false);

  const loadCards = () => {
    setLoading(true);
    setError(null);
    giftCardsApi.list().then(({ data, error }) => {
      setLoading(false);
      if (error) setError(error);
      else if (data) setCards(data.gift_cards || []);
    });
  };

  useEffect(() => {
    loadCards();
  }, []);

  const handleCreate = async () => {
    if (!amount) return;
    setCreating(true);
    const { error } = await giftCardsApi.create({
      initial_balance: Number(amount),
      currency: currency || undefined,
      expires_at: expiresAt || undefined,
      code: code || undefined,
    });
    setCreating(false);
    if (error) setError(error);
    else {
      setAmount('');
      setCurrency('USD');
      setExpiresAt('');
      setCode('');
      loadCards();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-salon-espresso">Gift cards</h1>
        <p className="text-salon-stone text-sm mt-1">
          Sell beautifully branded gift cards and track redemptions over time.
        </p>
      </div>

      <section className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-4 space-y-3">
        <h2 className="font-display text-lg font-semibold text-salon-espresso">Create gift card</h2>
        <div className="grid gap-3 md:grid-cols-4 text-sm">
          <label className="md:col-span-1">
            <span className="block text-xs text-salon-stone mb-1">Amount</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm"
            />
          </label>
          <label className="md:col-span-1">
            <span className="block text-xs text-salon-stone mb-1">Currency</span>
            <input
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm"
            />
          </label>
          <label className="md:col-span-1">
            <span className="block text-xs text-salon-stone mb-1">Expires at</span>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm"
            />
          </label>
          <label className="md:col-span-1">
            <span className="block text-xs text-salon-stone mb-1">Custom code (optional)</span>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Will be auto-generated if empty"
              className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!amount || creating}
          className="mt-2 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-salon-gold text-white text-sm font-medium disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'Create gift card'}
        </button>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </section>

      <section className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-salon-espresso">Issued cards</h2>
          {loading && <p className="text-xs text-salon-stone">Loading…</p>}
        </div>
        <div className="overflow-x-auto max-h-80 border border-salon-sand/40 rounded-xl">
          <table className="min-w-full text-xs md:text-sm">
            <thead className="bg-salon-cream/70 text-salon-stone">
              <tr>
                <th className="py-2 px-3 text-left font-medium">Code</th>
                <th className="py-2 px-3 text-right font-medium">Initial</th>
                <th className="py-2 px-3 text-right font-medium">Current</th>
                <th className="py-2 px-3 text-left font-medium">Currency</th>
                <th className="py-2 px-3 text-left font-medium">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-salon-sand/40">
              {cards.map((card) => (
                <tr key={card.id}>
                  <td className="py-2 px-3 font-mono text-salon-espresso">{card.code}</td>
                  <td className="py-2 px-3 text-right text-salon-espresso">
                    {Number(card.initial_balance).toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-right text-salon-espresso">
                    {Number(card.current_balance).toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-salon-stone">{card.currency}</td>
                  <td className="py-2 px-3 text-salon-stone">
                    {card.expires_at ? new Date(card.expires_at).toLocaleDateString() : 'No expiry'}
                  </td>
                </tr>
              ))}
              {!cards.length && !loading && (
                <tr>
                  <td className="py-3 px-3 text-center text-salon-stone" colSpan={5}>
                    No gift cards issued yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

