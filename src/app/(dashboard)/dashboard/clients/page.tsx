'use client';

import { useEffect, useState } from 'react';
import { Mail, MessageCircle, Phone, RefreshCw, X } from 'lucide-react';
import { clientsApi, debtApi, salonProfileApi, type Client, type ClientMembership, type ClientPackage, type ClientStats } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [writeOffReason, setWriteOffReason] = useState('');

  // CRM tracking modal sections (Packages, Memberships, Stats, Contact)
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  const [packages, setPackages] = useState<ClientPackage[]>([]);

  const [membershipsLoading, setMembershipsLoading] = useState(false);
  const [membershipsError, setMembershipsError] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<ClientMembership[]>([]);

  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [stats, setStats] = useState<ClientStats | null>(null);

  const [renewLoadingId, setRenewLoadingId] = useState<string | null>(null);
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    salonProfileApi.get().then((r) => {
      if (!('error' in r) && r.data?.salon?.currency) setCurrency(r.data.salon.currency);
    });
  }, []);

  const fmt = (amount: number) =>
    amount.toLocaleString('en-US', { style: 'currency', currency });

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

    // Load CRM tracking sections (packages, memberships, stats)
    setPackagesLoading(true);
    setPackagesError(null);
    const pkgRes = await clientsApi.packages(c.id);
    setPackagesLoading(false);
    if (!('error' in pkgRes) && pkgRes.data?.packages) {
      setPackages(pkgRes.data.packages as ClientPackage[]);
    } else if ('error' in pkgRes && pkgRes.error) {
      setPackagesError(pkgRes.error);
      setPackages([]);
    }

    setMembershipsLoading(true);
    setMembershipsError(null);
    const memRes = await clientsApi.memberships(c.id);
    setMembershipsLoading(false);
    if (!('error' in memRes) && memRes.data?.memberships) {
      setMemberships(memRes.data.memberships as ClientMembership[]);
    } else if ('error' in memRes && memRes.error) {
      setMembershipsError(memRes.error);
      setMemberships([]);
    }

    setStatsLoading(true);
    setStatsError(null);
    const statsRes = await clientsApi.stats(c.id);
    setStatsLoading(false);
    if (!('error' in statsRes) && statsRes.data?.stats) {
      setStats(statsRes.data.stats as ClientStats);
    } else if ('error' in statsRes && statsRes.error) {
      setStatsError(statsRes.error);
      setStats(null);
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

  const handleRenewMembership = async (membershipId: string) => {
    if (!openClient) return;
    setRenewLoadingId(membershipId);
    setMembershipsError(null);

    const res = await clientsApi.renewMembership(openClient.id, membershipId);
    setRenewLoadingId(null);

    if ('error' in res && res.error) {
      setMembershipsError(res.error);
      return;
    }

    // Reload CRM sections after renewal.
    setPackagesLoading(true);
    setPackagesError(null);
    const pkgRes = await clientsApi.packages(openClient.id);
    setPackagesLoading(false);
    if (!('error' in pkgRes) && pkgRes.data?.packages) {
      setPackages(pkgRes.data.packages as ClientPackage[]);
    }

    setMembershipsLoading(true);
    setMembershipsError(null);
    const memRes = await clientsApi.memberships(openClient.id);
    setMembershipsLoading(false);
    if (!('error' in memRes) && memRes.data?.memberships) {
      setMemberships(memRes.data.memberships as ClientMembership[]);
    }

    setStatsLoading(true);
    setStatsError(null);
    const statsRes = await clientsApi.stats(openClient.id);
    setStatsLoading(false);
    if (!('error' in statsRes) && statsRes.data?.stats) {
      setStats(statsRes.data.stats as ClientStats);
    }
  };

  const handleDebtPayment = async () => {
    if (!openClient) return;
    const amt = Number(debtPaymentAmount);
    if (!amt || amt <= 0) return;
    if (!debtEntries.length) return;
    const targetDebt = (debtEntries as any[]).find((e) => e?.debt_id || e?.debtId) ?? (debtEntries as any)[0];
    const targetDebtId = String(targetDebt?.debt_id ?? targetDebt?.debtId ?? targetDebt?.id ?? '');
    if (!targetDebtId) return;
    const res = await debtApi.addPayment({
      client_id: openClient.id,
      amount: amt,
      debt_id: targetDebtId,
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

  const handleRequestWriteOff = async () => {
    if (!openClient || debtBalance <= 0) return;
    const targetDebt = (debtEntries as any[]).find((e) => e?.debt_id || e?.debtId) ?? (debtEntries as any)[0];
    const targetDebtId = String(targetDebt?.debt_id ?? targetDebt?.debtId ?? targetDebt?.id ?? '');
    if (!targetDebtId) return;
    const res = await debtApi.requestWriteOff(targetDebtId, writeOffReason || undefined);
    if ('error' in res && res.error) {
      setError(res.error);
      return;
    }
    setWriteOffReason('');
    const debtRes = await debtApi.list(openClient.id);
    if (!('error' in debtRes) && debtRes.data) {
      const entries = debtRes.data.entries ?? [];
      setDebtEntries(entries as any);
      const bal = (debtRes.data as any).balance ?? entries.reduce((acc: number, e: any) => acc + Number(e.amount ?? 0), 0);
      setDebtBalance(Number(bal));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    );
  }
  if (error) return <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl">{error}</div>;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-salon-espresso mb-4">Clients</h1>
      {/* Mobile list (cards) */}
      <div className="md:hidden space-y-3">
        {clients.length === 0 ? (
          <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-6 text-salon-stone text-center">
            No clients found.
          </div>
        ) : (
          clients.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-salon-espresso truncate">
                    {c.full_name}
                  </p>
                  <p className="text-xs text-salon-stone mt-1 truncate">
                    <a
                      href={c.phone ? `tel:${c.phone}` : '#'}
                      onClick={(e) => {
                        if (!c.phone) e.preventDefault();
                      }}
                      className={c.phone ? 'hover:underline' : 'cursor-default'}
                    >
                      {c.phone ?? '—'}
                    </a>{' '}
                    ·{' '}
                    <a
                      href={c.email ? `mailto:${c.email}` : '#'}
                      onClick={(e) => {
                        if (!c.email) e.preventDefault();
                      }}
                      className={c.email ? 'hover:underline' : 'cursor-default'}
                    >
                      {c.email ?? '—'}
                    </a>
                  </p>
                  <p className="text-xs text-salon-stone mt-1 truncate">
                    Tags: {c.tags ?? '—'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openDetails(c)}
                  className="shrink-0 px-4 py-2 rounded-xl bg-salon-gold text-white text-sm font-semibold hover:bg-salon-goldLight"
                >
                  View
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-salon-sand/40 shadow-sm overflow-hidden">
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
                <td className="px-4 py-3 text-sm text-salon-stone">
                  {c.phone ? (
                    <a className="hover:underline" href={`tel:${c.phone}`}>
                      {c.phone}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-salon-stone">
                  {c.email ? (
                    <a className="hover:underline" href={`mailto:${c.email}`}>
                      {c.email}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpenClient(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-salon-sand/50 px-4 sm:px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-semibold text-salon-espresso">{openClient.full_name}</h2>
                  <p className="text-salon-stone text-sm">{openClient.email ?? '—'} · {openClient.phone ?? '—'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenClient(null)}
                  className="p-2 rounded-xl text-salon-stone hover:bg-salon-sand/40 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-4 sm:px-6 py-6 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white border border-salon-sand/60 rounded-2xl p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-salon-espresso mb-1">Tags</h3>
                  <p className="text-xs text-salon-stone mb-3">Comma separated (e.g. VIP, color, prefers_morning)</p>
                  <input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-white text-salon-espresso focus:outline-none focus:ring-2 focus:ring-salon-gold/30 focus:border-salon-gold"
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

                <div className="bg-white border border-salon-sand/60 rounded-2xl p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-salon-espresso mb-3">Notes</h3>
                  <div className="border border-salon-sand/50 rounded-xl p-3 bg-salon-cream/40 max-h-64 overflow-auto">
                    {detailLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full rounded-xl" />
                        <Skeleton className="h-12 w-full rounded-xl" />
                      </div>
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

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      className="flex-1 w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-white text-salon-espresso focus:outline-none focus:ring-2 focus:ring-salon-gold/30 focus:border-salon-gold"
                      placeholder="Add a note..."
                    />
                    <button
                      type="button"
                      onClick={addNote}
                      disabled={savingNote || !noteText.trim()}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-salon-espresso text-white font-semibold text-sm hover:bg-salon-bark disabled:opacity-40"
                    >
                      {savingNote ? 'Adding…' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-6">
                <div className="bg-white border border-salon-sand/60 rounded-2xl p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-salon-espresso mb-3">Debt</h3>
                  <div className="border border-salon-sand/50 rounded-xl p-3 bg-salon-cream/40 space-y-2">
                  {debtLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-10 w-full rounded-xl" />
                    </div>
                  ) : (
                    <>
                      <p className="text-sm">
                        Outstanding balance:{' '}
                        <span className="font-semibold text-salon-espresso">
                          {fmt(typeof debtBalance === 'number' ? debtBalance : Number(debtBalance || 0))}
                        </span>
                      </p>
                      {debtBalance > 0 && (
                        <>
                          <div className="flex flex-col gap-2 mt-2 sm:flex-row">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={debtPaymentAmount}
                              onChange={(e) => setDebtPaymentAmount(e.target.value)}
                              className="flex-1 w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-white text-salon-espresso text-sm focus:outline-none focus:ring-2 focus:ring-salon-gold/30 focus:border-salon-gold"
                              placeholder="Payment amount"
                            />
                            <button
                              type="button"
                              disabled={!debtPaymentAmount}
                              onClick={handleDebtPayment}
                              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-salon-gold text-white text-sm font-semibold hover:bg-salon-goldLight disabled:opacity-40"
                            >
                              Record payment
                            </button>
                          </div>
                          <p className="text-[11px] text-salon-stone mt-1">
                            Applies to the oldest open debt entry.
                          </p>
                          <div className="flex flex-col gap-2 mt-2 sm:flex-row">
                            <input
                              type="text"
                              value={writeOffReason}
                              onChange={(e) => setWriteOffReason(e.target.value)}
                              className="flex-1 w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-white text-salon-espresso text-sm focus:outline-none focus:ring-2 focus:ring-salon-gold/30 focus:border-salon-gold"
                              placeholder="Write-off reason (optional)"
                            />
                            <button
                              type="button"
                              onClick={handleRequestWriteOff}
                              className="w-full sm:w-auto px-4 py-2 rounded-xl border border-amber-300 text-amber-700 text-sm font-semibold hover:bg-amber-50"
                            >
                              Request write-off
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="bg-white border border-salon-sand/60 rounded-2xl p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-salon-espresso mb-3">Packages</h3>
                    <div className="border border-salon-sand/50 rounded-xl p-3 bg-salon-cream/40 space-y-2">
                    {packagesLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full rounded-xl" />
                        <Skeleton className="h-12 w-full rounded-xl" />
                      </div>
                    ) : packages.length === 0 ? (
                      <p className="text-sm text-salon-stone">No packages found.</p>
                    ) : (
                      <div className="space-y-2">
                        {packages.map((p) => (
                          <div
                            key={p.id}
                            className="bg-white border border-salon-sand/40 rounded-xl p-3"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-sm font-semibold text-salon-espresso">
                                  {p.name ?? 'Package'}
                                </p>
                                <p className="text-xs text-salon-stone mt-1">
                                  Expires: {p.expires_at ? p.expires_at : '—'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-salon-espresso">
                                  {p.remaining_services}
                                </p>
                                <p className="text-[11px] text-salon-stone">Remaining</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {packagesError && <p className="text-sm text-red-600">{packagesError}</p>}
                  </div>
                  </div>

                  <div className="bg-white border border-salon-sand/60 rounded-2xl p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-salon-espresso mb-3">Membership</h3>
                    <div className="border border-salon-sand/50 rounded-xl p-3 bg-salon-cream/40 space-y-2">
                    {membershipsLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full rounded-xl" />
                        <Skeleton className="h-12 w-full rounded-xl" />
                      </div>
                    ) : memberships.length === 0 ? (
                      <p className="text-sm text-salon-stone">No memberships found.</p>
                    ) : (
                      <div className="space-y-2">
                        {memberships.map((m) => (
                          <div
                            key={m.id}
                            className="bg-white border border-salon-sand/40 rounded-xl p-3"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-sm font-semibold text-salon-espresso">
                                  {m.name ?? m.plan ?? 'Membership'}
                                </p>
                                <p className="text-xs text-salon-stone mt-1">
                                  Next renewal: {m.renewal_date ? m.renewal_date : '—'}
                                </p>
                                <p className="text-xs text-salon-stone mt-1">
                                  Remaining credits: {m.remaining_services}
                                </p>
                              </div>
                              {m.status === 'active' && (
                                <button
                                  type="button"
                                  disabled={renewLoadingId === m.id}
                                  onClick={() => handleRenewMembership(m.id)}
                                  className="shrink-0 px-4 py-2 rounded-xl bg-salon-gold text-white text-sm font-semibold hover:bg-salon-goldLight disabled:opacity-40"
                                >
                                  {renewLoadingId === m.id ? 'Renewing…' : (
                                    <span className="inline-flex items-center gap-2">
                                      <RefreshCw className="w-4 h-4" />
                                      Renew
                                    </span>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {membershipsError && <p className="text-sm text-red-600">{membershipsError}</p>}
                  </div>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="bg-white border border-salon-sand/60 rounded-2xl p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-salon-espresso mb-3">Stats</h3>
                    <div className="border border-salon-sand/50 rounded-xl p-3 bg-salon-cream/40 space-y-2">
                    {statsLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ) : stats ? (
                      <div className="space-y-1">
                        <p className="text-sm">
                          Total spent:{' '}
                          <span className="font-semibold text-salon-espresso">
                            {fmt(Number(stats.total_spent ?? 0))}
                          </span>
                        </p>
                        <p className="text-sm">
                          Avg ticket:{' '}
                          <span className="font-semibold text-salon-espresso">
                            {fmt(Number(stats.avg_ticket ?? 0))}
                          </span>
                        </p>
                        <p className="text-xs text-salon-stone">
                          Invoice count: {stats.invoice_count ?? 0}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-salon-stone">No stats yet.</p>
                    )}
                    {statsError && <p className="text-sm text-red-600">{statsError}</p>}
                  </div>
                  </div>

                  <div className="bg-white border border-salon-sand/60 rounded-2xl p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-salon-espresso mb-3">Contact</h3>
                    <div className="border border-salon-sand/50 rounded-xl p-3 bg-salon-cream/40 space-y-2">
                    <div className="flex flex-col gap-2">
                      <a
                        href={openClient?.phone ? `tel:${openClient.phone}` : '#'}
                        onClick={(e) => {
                          if (!openClient?.phone) e.preventDefault();
                        }}
                        className="w-full px-4 py-2 rounded-xl bg-white border border-salon-sand/60 text-salon-espresso text-sm font-semibold hover:bg-salon-sand/40 disabled:opacity-40 inline-flex items-center justify-center gap-2"
                      >
                        <Phone className="w-4 h-4" />
                        Call
                      </a>
                      <a
                        href={openClient?.phone ? `sms:${openClient.phone}` : '#'}
                        onClick={(e) => {
                          if (!openClient?.phone) e.preventDefault();
                        }}
                        className="w-full px-4 py-2 rounded-xl bg-white border border-salon-sand/60 text-salon-espresso text-sm font-semibold hover:bg-salon-sand/40 disabled:opacity-40 inline-flex items-center justify-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        SMS
                      </a>
                      <a
                        href={openClient?.email ? `mailto:${openClient.email}` : '#'}
                        onClick={(e) => {
                          if (!openClient?.email) e.preventDefault();
                        }}
                        className="w-full px-4 py-2 rounded-xl bg-white border border-salon-sand/60 text-salon-espresso text-sm font-semibold hover:bg-salon-sand/40 disabled:opacity-40 inline-flex items-center justify-center gap-2"
                      >
                        <Mail className="w-4 h-4" />
                        Email
                      </a>
                    </div>
                    {( !openClient?.phone && !openClient?.email) && (
                      <p className="text-sm text-salon-stone">No phone/email available.</p>
                    )}
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
