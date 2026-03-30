'use client';

import { useEffect, useState } from 'react';
import { invoicesApi, InvoiceData } from '@/lib/api';
import { toast } from 'sonner';
import { FileText, Search, X, Ban, Eye, CheckCircle2, AlertCircle, Clock, Receipt } from 'lucide-react';

// ─── helpers ─────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    paid:     { label: 'Paid',     cls: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="size-3" /> },
    partial:  { label: 'Partial',  cls: 'bg-amber-100   text-amber-700',  icon: <Clock        className="size-3" /> },
    unpaid:   { label: 'Unpaid',   cls: 'bg-red-100     text-red-600',    icon: <AlertCircle  className="size-3" /> },
    void:     { label: 'Void',     cls: 'bg-gray-100    text-gray-500',   icon: <Ban          className="size-3" /> },
  };
  const s = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500', icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {s.icon}{s.label}
    </span>
  );
}

function fmt(n: number) {
  return Number(n).toFixed(2);
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function InvoiceDetail({ invoiceId, onClose, onVoided }: { invoiceId: string; onClose: () => void; onVoided: () => void }) {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [voiding, setVoiding] = useState(false);

  useEffect(() => {
    setLoading(true);
    invoicesApi.get(invoiceId).then(({ data, error }) => {
      setLoading(false);
      if (error) toast.error(error);
      else if (data) setInvoice(data.invoice);
    });
  }, [invoiceId]);

  const handleVoid = async () => {
    if (!invoice) return;
    if (!confirm(`Void invoice ${invoice.invoice_number}? This cannot be undone.`)) return;
    setVoiding(true);
    const { error } = await invoicesApi.void(invoice.id);
    setVoiding(false);
    if (error) { toast.error(error); return; }
    toast.success('Invoice voided.');
    onVoided();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-salon-sand/40 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-salon-gold/10 flex items-center justify-center">
              <Receipt className="size-4 text-salon-gold" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-salon-espresso">
                {loading ? 'Loading…' : invoice?.invoice_number ?? 'Invoice'}
              </h2>
              {invoice && <p className="text-xs text-salon-stone">{new Date(invoice.created_at ?? '').toLocaleDateString()}</p>}
            </div>
          </div>
          <button onClick={onClose} className="size-7 flex items-center justify-center rounded-lg text-salon-stone hover:bg-salon-sand/40 transition-colors">
            <X className="size-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-salon-stone text-sm">Loading…</div>
        ) : invoice ? (
          <div className="p-6 space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-salon-stone">Customer</p>
                <p className="font-medium text-salon-espresso">{invoice.customer?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-salon-stone">Status</p>
                <div className="mt-0.5">{statusBadge(invoice.status)}</div>
              </div>
            </div>

            {/* Line items */}
            {Array.isArray(invoice.items) && invoice.items.length > 0 && (
              <div>
                <p className="text-xs font-medium text-salon-stone mb-2">Items</p>
                <div className="rounded-xl border border-salon-sand/40 overflow-hidden">
                  <table className="min-w-full text-xs">
                    <thead className="bg-salon-cream/60 text-salon-stone">
                      <tr>
                        <th className="py-2 px-3 text-left font-medium">Description</th>
                        <th className="py-2 px-3 text-right font-medium">Qty</th>
                        <th className="py-2 px-3 text-right font-medium">Price</th>
                        <th className="py-2 px-3 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-salon-sand/30">
                      {(invoice.items as { id: string; description?: string; quantity?: number; unit_price?: number; total?: number }[]).map((item, i) => (
                        <tr key={item.id ?? i}>
                          <td className="py-2 px-3 text-salon-espresso">{item.description ?? '—'}</td>
                          <td className="py-2 px-3 text-right">{item.quantity ?? 1}</td>
                          <td className="py-2 px-3 text-right">${fmt(item.unit_price ?? 0)}</td>
                          <td className="py-2 px-3 text-right font-medium">${fmt(item.total ?? 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="rounded-xl bg-salon-cream/50 border border-salon-sand/40 p-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-salon-stone">
                <span>Subtotal</span><span>${fmt(invoice.subtotal)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-salon-stone">
                  <span>Discount</span><span>-${fmt(invoice.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-salon-stone">
                <span>Tax</span><span>${fmt(invoice.tax)}</span>
              </div>
              <div className="flex justify-between font-semibold text-salon-espresso border-t border-salon-sand/40 pt-1.5 mt-1.5">
                <span>Total</span><span>${fmt(invoice.total)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 text-xs">
                <span>Paid</span><span>${fmt(invoice.paid_amount)}</span>
              </div>
              {invoice.total - invoice.paid_amount > 0.01 && (
                <div className="flex justify-between text-red-600 text-xs font-medium">
                  <span>Balance due</span><span>${fmt(invoice.total - invoice.paid_amount)}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            {invoice.status !== 'void' && (
              <div className="flex justify-end">
                <button
                  onClick={handleVoid}
                  disabled={voiding}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  <Ban className="size-3.5" />
                  {voiding ? 'Voiding…' : 'Void invoice'}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [from, setFrom]         = useState('');
  const [to, setTo]             = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = async (params?: { search?: string; status?: string; from?: string; to?: string }) => {
    setLoading(true);
    const { data, error } = await invoicesApi.list({
      search:  params?.search  ?? (search  || undefined),
      status:  params?.status  ?? (statusFilter || undefined),
      from:    params?.from    ?? (from    || undefined),
      to:      params?.to      ?? (to      || undefined),
    });
    setLoading(false);
    if (error) toast.error(error);
    else if (data) setInvoices(data.invoices ?? []);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(); };

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-semibold text-salon-espresso">Invoices</h1>
          <p className="text-salon-stone text-sm mt-0.5">View and manage all invoices generated from POS sales.</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm p-4 flex flex-wrap gap-2 items-end">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-salon-stone/60" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice # or customer…"
                className="w-full pl-8 pr-3 py-2 border border-salon-sand/60 rounded-xl text-sm bg-salon-cream/50 focus:outline-none focus:ring-2 focus:ring-salon-gold/30"
              />
            </div>
            <button type="submit" className="px-3 py-2 rounded-xl border border-salon-sand/60 text-salon-espresso text-sm hover:bg-salon-sand/30 transition-colors">
              Search
            </button>
          </form>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); load({ status: e.target.value || undefined }); }}
            className="border border-salon-sand/60 rounded-xl px-3 py-2 text-sm bg-salon-cream/50 focus:outline-none focus:ring-2 focus:ring-salon-gold/30"
          >
            <option value="">All statuses</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid</option>
            <option value="void">Void</option>
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border border-salon-sand/60 rounded-xl px-3 py-2 text-sm bg-salon-cream/50 focus:outline-none focus:ring-2 focus:ring-salon-gold/30"
            placeholder="From"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border border-salon-sand/60 rounded-xl px-3 py-2 text-sm bg-salon-cream/50 focus:outline-none focus:ring-2 focus:ring-salon-gold/30"
            placeholder="To"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-salon-cream/60 text-xs text-salon-stone">
                <tr>
                  <th className="py-3 px-4 text-left font-medium">Invoice #</th>
                  <th className="py-3 px-4 text-left font-medium">Date</th>
                  <th className="py-3 px-4 text-left font-medium">Customer</th>
                  <th className="py-3 px-4 text-right font-medium">Total</th>
                  <th className="py-3 px-4 text-right font-medium">Paid</th>
                  <th className="py-3 px-4 text-left font-medium">Status</th>
                  <th className="py-3 px-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-salon-sand/30">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-salon-cream/30 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono text-salon-espresso text-xs font-medium">{inv.invoice_number ?? '—'}</span>
                    </td>
                    <td className="py-3 px-4 text-salon-stone text-xs">
                      {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-salon-espresso">{inv.customer?.name ?? '—'}</td>
                    <td className="py-3 px-4 text-right font-semibold text-salon-espresso tabular-nums">
                      ${fmt(inv.total)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-700 tabular-nums text-xs">
                      ${fmt(inv.paid_amount)}
                    </td>
                    <td className="py-3 px-4">{statusBadge(inv.status)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setDetailId(inv.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-salon-stone border border-salon-sand/60 hover:bg-salon-sand/30 transition-colors"
                      >
                        <Eye className="size-3" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}

                {!invoices.length && !loading && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-salon-stone">
                        <FileText className="size-8 opacity-30" />
                        <p className="text-sm">No invoices found.</p>
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

      {detailId && (
        <InvoiceDetail
          invoiceId={detailId}
          onClose={() => setDetailId(null)}
          onVoided={() => load()}
        />
      )}
    </>
  );
}
