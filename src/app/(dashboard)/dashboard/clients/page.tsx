'use client';

import { useEffect, useState } from 'react';
import { clientsApi, debtApi, type Client } from '@/lib/api';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openClient, setOpenClient] = useState<Client | null>(null);
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState<Array<{ id: string; note: string; created_at?: string; user?: { id: string; email?: string; name?: string } }>>([]);
  const [noteText, setNoteText] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingTags, setSavingTags] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [debtLoading, setDebtLoading] = useState(false);
  const [debtEntries, setDebtEntries] = useState<Array<{ id: string; amount: string | number; balance_after?: string | number; created_at?: string }>>([]);
  const [debtBalance, setDebtBalance] = useState(0);
  const [debtPaymentAmount, setDebtPaymentAmount] = useState('');

  const loadClients = () => {
    setLoading(true);
    clientsApi.list().then((res) => {
      setLoading(false);
      if ('error' in res && res.error) setError(res.error);
      else if (res.data?.clients) setClients(res.data.clients);
    });
  };

  useEffect(() => {
    loadClients();
  }, []);

  const openDetails = async (c: Client) => {
    setOpenClient(c);
    setTags(c.tags ?? '');
    setNotes([]);
    setNoteText('');
    setDetailLoading(true);
    const res = await clientsApi.notes(c.id);
    setDetailLoading(false);
    if ('error' in res && res.error) {
      setError(res.error);
      return;
    }
    setNotes(res.data?.notes ?? []);

    // Load debt info
    setDebtLoading(true);
    const debtRes = await debtApi.list(c.id);
    setDebtLoading(false);
    if (!('error' in debtRes) && debtRes.data) {
      const entries = debtRes.data.entries ?? [];
      setDebtEntries(entries as any);
      // Approximate balance from entries if backend doesn't send balance yet
      const bal = (debtRes.data as any).balance ?? entries.reduce((acc: number, e: any) => acc + Number(e.amount ?? 0), 0);
      setDebtBalance(Number(bal));
    } else if ('error' in debtRes && debtRes.error) {
      // don't hard-fail modal, just log inline
      setDebtEntries([]);
      setDebtBalance(0);
    }
  };

  const saveTags = async () => {
    if (!openClient) return;
    setSavingTags(true);
    const res = await clientsApi.update(openClient.id, { tags });
    setSavingTags(false);
    if ('error' in res && res.error) {
      setError(res.error);
      return;
    }
    setOpenClient(res.data?.client ?? openClient);
    loadClients();
  };

  const addNote = async () => {
    if (!openClient || !noteText.trim()) return;
    setSavingNote(true);
    const res = await clientsApi.addNote(openClient.id, noteText.trim());
    setSavingNote(false);
    if ('error' in res && res.error) {
      setError(res.error);
      return;
    }
    setNoteText('');
    const refreshed = await clientsApi.notes(openClient.id);
    if (!('error' in refreshed) && refreshed.data?.notes) setNotes(refreshed.data.notes);
  };

  const handleDebtPayment = async () => {
    if (!openClient) return;
    const amt = Number(debtPaymentAmount);
    if (!amt || amt <= 0) return;
    if (!debtEntries.length) return;
    const targetDebt = (debtEntries as any)[0];
    if (!targetDebt?.id) return;
    const res = await debtApi.addPayment({
      client_id: openClient.id,
      amount: amt,
      debt_id: targetDebt.id,
    });
    if ('error' in res && res.error) {
      setError(res.error);
      return;
    }
    setDebtPaymentAmount('');
    // Refresh debt list
    const debtRes = await debtApi.list(openClient.id);
    if (!('error' in debtRes) && debtRes.data) {
      const entries = debtRes.data.entries ?? [];
      setDebtEntries(entries as any);
      const bal = (debtRes.data as any).balance ?? entries.reduce((acc: number, e: any) => acc + Number(e.amount ?? 0), 0);
      setDebtBalance(Number(bal));
    }
  };

  if (loading) return <p className="text-salon-stone">Loading clients...</p>;
  if (error) return <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl">{error}</div>;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-salon-espresso mb-4">Clients</h1>
      <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-salon-sand/60">
          <thead className="bg-salon-sand/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Tags</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-salon-sand/60">
            {clients.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 text-sm text-salon-espresso">{c.full_name}</td>
                <td className="px-4 py-3 text-sm text-salon-stone">{c.phone ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-salon-stone">{c.email ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-salon-stone">{c.tags ?? '—'}</td>
                <td className="px-4 py-3 text-sm">
                  <button
                    type="button"
                    onClick={() => openDetails(c)}
                    className="px-3 py-1.5 rounded-lg border border-salon-sand/60 text-salon-espresso hover:border-salon-gold hover:bg-salon-gold/5 transition-colors text-sm"
                  >
                    View / Notes
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {clients.length === 0 && (
          <p className="p-6 text-salon-stone text-center">No clients found.</p>
        )}
      </div>

      {openClient && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpenClient(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-salon-espresso">{openClient.full_name}</h2>
                <p className="text-salon-stone text-sm">{openClient.email ?? '—'} · {openClient.phone ?? '—'}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpenClient(null)}
                className="text-salon-stone hover:text-salon-espresso"
              >
                ✕
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <h3 className="text-sm font-semibold text-salon-espresso mb-2">Tags</h3>
                <p className="text-xs text-salon-stone mb-2">Comma separated (e.g. VIP, color, prefers_morning)</p>
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-white text-salon-espresso"
                  placeholder="VIP, ..."
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={saveTags}
                    disabled={savingTags}
                    className="px-4 py-2 rounded-xl bg-salon-gold text-white font-semibold text-sm hover:bg-salon-goldLight disabled:opacity-40"
                  >
                    {savingTags ? 'Saving…' : 'Save tags'}
                  </button>
                </div>
              </div>

              <div className="md:col-span-1">
                <h3 className="text-sm font-semibold text-salon-espresso mb-2">Notes</h3>
                <div className="border border-salon-sand/60 rounded-xl p-3 bg-salon-cream/40 max-h-56 overflow-auto">
                  {detailLoading ? (
                    <p className="text-sm text-salon-stone">Loading notes…</p>
                  ) : notes.length === 0 ? (
                    <p className="text-sm text-salon-stone">No notes yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {notes.map((n) => (
                        <div key={n.id} className="bg-white border border-salon-sand/40 rounded-xl p-3">
                          <p className="text-sm text-salon-espresso">{n.note}</p>
                          <p className="text-xs text-salon-stone mt-1">
                            {n.user?.email ?? n.user?.name ?? 'Staff'}{n.created_at ? ` · ${new Date(n.created_at).toLocaleString()}` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <input
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="flex-1 border border-salon-sand/60 rounded-xl px-3 py-2 bg-white text-salon-espresso"
                    placeholder="Add a note..."
                  />
                  <button
                    type="button"
                    onClick={addNote}
                    disabled={savingNote || !noteText.trim()}
                    className="px-4 py-2 rounded-xl bg-salon-espresso text-white font-semibold text-sm hover:bg-salon-bark disabled:opacity-40"
                  >
                    {savingNote ? 'Adding…' : 'Add'}
                  </button>
                </div>
              </div>

              <div className="md:col-span-1">
                <h3 className="text-sm font-semibold text-salon-espresso mb-2">Debt</h3>
                <div className="border border-salon-sand/60 rounded-xl p-3 bg-salon-cream/40 space-y-2">
                  {debtLoading ? (
                    <p className="text-sm text-salon-stone">Loading debt…</p>
                  ) : (
                    <>
                      <p className="text-sm">
                        Outstanding balance:{' '}
                        <span className="font-semibold text-salon-espresso">
                          {debtBalance.toFixed ? debtBalance.toFixed(2) : Number(debtBalance || 0).toFixed(2)}
                        </span>
                      </p>
                      {debtBalance > 0 && (
                        <>
                          <div className="flex gap-2 mt-2">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={debtPaymentAmount}
                              onChange={(e) => setDebtPaymentAmount(e.target.value)}
                              className="flex-1 border border-salon-sand/60 rounded-xl px-3 py-2 bg-white text-salon-espresso text-sm"
                              placeholder="Payment amount"
                            />
                            <button
                              type="button"
                              disabled={!debtPaymentAmount}
                              onClick={handleDebtPayment}
                              className="px-4 py-2 rounded-xl bg-salon-gold text-white text-sm font-semibold hover:bg-salon-goldLight disabled:opacity-40"
                            >
                              Record payment
                            </button>
                          </div>
                          <p className="text-[11px] text-salon-stone mt-1">
                            Applies to the oldest open debt entry.
                          </p>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
