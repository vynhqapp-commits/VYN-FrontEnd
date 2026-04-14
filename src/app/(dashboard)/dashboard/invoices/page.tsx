'use client';

import { useEffect, useState } from 'react';
import { invoicesApi, InvoiceData, settingsApi } from '@/lib/api';
import { toast } from 'sonner';
import { FileText, Search, X, Ban, Eye, CheckCircle2, AlertCircle, Clock, Receipt } from 'lucide-react';
import FlowTopbar from '@/components/layout/FlowTopbar';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { Skeleton } from '@/components/ui/skeleton';

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

function formatMoney(amount: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  } catch {
    return `${Number(amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currencyCode}`;
  }
}

type InvoiceLineItem = {
  id: string;
  item_type?: string | null;
  name?: string | null;
  description?: string | null;
  quantity?: number;
  unit_price?: number;
  total?: number;
};

function lineItemName(item: InvoiceLineItem) {
  const fallback = item.item_type?.toLowerCase() === 'service' ? 'Service' : item.item_type?.toLowerCase() === 'product' ? 'Product' : 'Item';
  return item.name?.trim() || fallback;
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function InvoiceDetail({ invoiceId, currency, onClose, onVoided }: { invoiceId: string; currency: string; onClose: () => void; onVoided: () => void }) {
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" />
      <div
        className="relative elite-scrollbar bg-[var(--elite-card)] rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-[var(--elite-border)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--elite-border)] sticky top-0 bg-[var(--elite-card)] rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-[var(--elite-orange-dim)] flex items-center justify-center">
              <Receipt className="size-4 text-[var(--elite-orange)]" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold elite-title">
                {loading ? 'Loading…' : invoice?.invoice_number ?? 'Invoice'}
              </h2>
              {invoice && <p className="text-xs elite-subtle">{new Date(invoice.created_at ?? '').toLocaleDateString()}</p>}
            </div>
          </div>
          <button onClick={onClose} className="size-7 flex items-center justify-center rounded-lg elite-subtle hover:bg-[var(--elite-card-2)] transition-colors">
            <X className="size-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div>
        ) : invoice ? (
          <div className="p-6 space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="font-medium text-foreground">{invoice.customer?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="mt-0.5">{statusBadge(invoice.status)}</div>
              </div>
            </div>

            {/* Line items */}
            {Array.isArray(invoice.items) && invoice.items.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Items</p>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="min-w-full text-xs">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="py-2 px-3 text-left font-medium">Description</th>
                        <th className="py-2 px-3 text-right font-medium">Qty</th>
                        <th className="py-2 px-3 text-right font-medium">Price</th>
                        <th className="py-2 px-3 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(invoice.items as InvoiceLineItem[]).map((item, i) => (
                        <tr key={item.id ?? i}>
                          <td className="py-2 px-3 text-foreground">
                            <div className="font-medium">{lineItemName(item)}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {item.description?.trim() || '—'}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right">{item.quantity ?? 1}</td>
                          <td className="py-2 px-3 text-right">{formatMoney(item.unit_price ?? 0, currency)}</td>
                          <td className="py-2 px-3 text-right font-medium">{formatMoney(item.total ?? 0, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="rounded-xl bg-muted/40 border border-border p-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>{formatMoney(invoice.subtotal, currency)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span><span>-{formatMoney(invoice.discount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span><span>{formatMoney(invoice.tax, currency)}</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1.5 mt-1.5">
                <span>Total</span><span>{formatMoney(invoice.total, currency)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 text-xs">
                <span>Paid</span><span>{formatMoney(invoice.paid_amount, currency)}</span>
              </div>
              {invoice.total - invoice.paid_amount > 0.01 && (
                <div className="flex justify-between text-red-600 text-xs font-medium">
                  <span>Balance due</span><span>{formatMoney(invoice.total - invoice.paid_amount, currency)}</span>
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
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading]   = useState(true);
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
  useEffect(() => {
    settingsApi.get().then((r) => {
      if (!('error' in r) && r.data?.salon?.currency) {
        const c = String(r.data.salon.currency).trim().toUpperCase().slice(0, 3);
        if (c) setCurrency(c);
      }
    });
  }, []);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(); };

  return (
    <>
      <div className="space-y-5 elite-shell min-h-[calc(100vh-120px)] -mx-4 sm:-mx-6 px-4 sm:px-6 py-4">
        <FlowTopbar />
        {/* Header */}
        <DashboardPageHeader
          title="Invoices"
          description="View and manage all invoices generated from POS sales."
          icon={<Receipt className="w-5 h-5" />}
        />

        {/* Filters */}
        <div className="elite-panel p-4 flex flex-wrap gap-2 items-end">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice # or customer…"
                className="w-full pl-8 pr-3 py-2 elite-input rounded-xl text-sm"
              />
            </div>
            <button type="submit" className="px-3 py-2 rounded-xl elite-btn-ghost text-sm transition-colors">
              Search
            </button>
          </form>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); load({ status: e.target.value || undefined }); }}
            className="elite-input rounded-xl px-3 py-2 text-sm"
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
            className="elite-input rounded-xl px-3 py-2 text-sm"
            placeholder="From"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="elite-input rounded-xl px-3 py-2 text-sm"
            placeholder="To"
          />
        </div>

        {/* Table */}
        <div className="elite-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs">
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
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[var(--elite-text-strong)] text-xs font-medium">{inv.invoice_number ?? '—'}</span>
                    </td>
                    <td className="py-3 px-4 elite-subtle text-xs">
                      {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4">{inv.customer?.name ?? '—'}</td>
                    <td className="py-3 px-4 text-right font-semibold tabular-nums">
                      {formatMoney(inv.total, currency)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-700 tabular-nums text-xs">
                      {formatMoney(inv.paid_amount, currency)}
                    </td>
                    <td className="py-3 px-4">{statusBadge(inv.status)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setDetailId(inv.id)}
                        aria-label="View invoice details"
                        title="View invoice details"
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-[var(--elite-border-2)] text-[var(--elite-text)] hover:bg-[var(--elite-card-2)] transition-colors"
                      >
                        <Eye className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {!invoices.length && !loading && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FileText className="size-8 opacity-30" />
                        <p className="text-sm">No invoices found.</p>
                      </div>
                    </td>
                  </tr>
                )}
                {loading && invoices.length === 0 && (
                  <>
                    <tr><td colSpan={7} className="px-4 py-3"><Skeleton className="h-8 w-full rounded-lg" /></td></tr>
                    <tr><td colSpan={7} className="px-4 py-3"><Skeleton className="h-8 w-full rounded-lg" /></td></tr>
                    <tr><td colSpan={7} className="px-4 py-3"><Skeleton className="h-8 w-full rounded-lg" /></td></tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {detailId && (
        <InvoiceDetail
          invoiceId={detailId}
          currency={currency}
          onClose={() => setDetailId(null)}
          onVoided={() => load()}
        />
      )}
    </>
  );
}
