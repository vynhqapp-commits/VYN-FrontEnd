'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Download, Lock, TrendingUp, CreditCard, Package, BarChart2, Calendar } from 'lucide-react';
import { locationsApi, reportsApi, InventoryMovementRow, MonthlyClosing } from '@/lib/api';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

/* ─────────────── helpers ─────────────── */
function downloadCsv(url: string, filename: string, onError: (msg: string) => void) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('salon_token') : null;
  fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    .then((res) => {
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      return res.blob();
    })
    .then((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    })
    .catch((err) => onError(err.message ?? 'Export failed'));
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ─────────────── page ─────────────── */
export default function ReportsPage() {
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [locationId, setLocationId] = useState<string>('');
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);

  /* P&L */
  const [pnl, setPnl] = useState<{ revenue: number; expense: number; commission: number; profit: number } | null>(null);
  const [pnlLoading, setPnlLoading] = useState(false);
  const [pnlError, setPnlError] = useState<string | null>(null);

  /* VAT */
  const [vatTotal, setVatTotal] = useState<number | null>(null);
  const [vatRate, setVatRate] = useState<number | null>(null);
  const [estimatedVat, setEstimatedVat] = useState<number | null>(null);
  const [vatLoading, setVatLoading] = useState(false);
  const [vatError, setVatError] = useState<string | null>(null);

  /* Payment channels */
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [paymentBreakdown, setPaymentBreakdown] = useState<Record<string, number> | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  /* Inventory movement */
  const [inventory, setInventory] = useState<InventoryMovementRow[] | null>(null);
  const [inventorySummary, setInventorySummary] = useState<{ in: number; out: number; net: number } | null>(null);
  const [inventoryFrom, setInventoryFrom] = useState('');
  const [inventoryTo, setInventoryTo] = useState('');
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  /* Monthly closing */
  const [closeLoading, setCloseLoading] = useState(false);
  const [closeNotes, setCloseNotes] = useState('');
  const [closings, setClosings] = useState<MonthlyClosing[]>([]);
  const [closingsLoading, setClosingsLoading] = useState(false);

  /* Margins */
  const [marginFrom, setMarginFrom] = useState('');
  const [marginTo, setMarginTo] = useState('');
  const [margins, setMargins] = useState<
    { type: 'service' | 'product'; id: string; name: string; revenue: number; cost: number; margin: number; margin_pct: number; }[] | null
  >(null);
  const [marginsLoading, setMarginsLoading] = useState(false);
  const [marginsError, setMarginsError] = useState<string | null>(null);

  /* ── lazy-load locations ── */
  const ensureLocations = () => {
    if (locations.length) return;
    locationsApi.list().then((res) => {
      if (res.data?.locations?.length) {
        setLocations(res.data.locations);
        setLocationId(res.data.locations[0].id);
      }
    });
  };

  /* ── load past closings on mount ── */
  useEffect(() => {
    setClosingsLoading(true);
    reportsApi.monthlyClosings().then((res) => {
      setClosingsLoading(false);
      if (res.data) setClosings((res.data as any).data ?? []);
    });
  }, []);

  /* ── P&L ── */
  const loadPnl = () => {
    ensureLocations();
    setPnlLoading(true);
    setPnlError(null);
    reportsApi.pnl(period, locationId || undefined).then(({ data, error }) => {
      setPnlLoading(false);
      if (error) { setPnlError(error); toast.error(error); }
      else if (data) setPnl({ revenue: data.revenue, expense: data.expense, commission: data.commission, profit: data.profit });
    });
  };

  const exportPnlCsv = () => {
    downloadCsv(
      reportsApi.pnlExportUrl(period, locationId || undefined),
      `pnl-${period}.csv`,
      (msg) => { setPnlError(msg); toast.error(msg); },
    );
  };

  /* ── VAT ── */
  const loadVat = () => {
    ensureLocations();
    setVatLoading(true);
    setVatError(null);
    reportsApi.vat(period, locationId || undefined).then(({ data, error }) => {
      setVatLoading(false);
      if (error) { setVatError(error); toast.error(error); }
      else if (data) {
        setVatTotal(data.total_revenue);
        setVatRate((data as any).vat_rate ?? null);
        setEstimatedVat((data as any).estimated_vat ?? null);
      }
    });
  };

  const exportVatCsv = () => {
    downloadCsv(
      reportsApi.vatExportUrl(period, locationId || undefined),
      `vat-${period}.csv`,
      (msg) => { setVatError(msg); toast.error(msg); },
    );
  };

  /* ── Payment breakdown ── */
  const loadPaymentBreakdown = () => {
    ensureLocations();
    if (!from || !to) { setPaymentError('Select from/to dates'); return; }
    setPaymentLoading(true);
    setPaymentError(null);
    reportsApi.paymentBreakdown(from, to, locationId || undefined).then(({ data, error }) => {
      setPaymentLoading(false);
      if (error) { setPaymentError(error); toast.error(error); }
      else if (data) setPaymentBreakdown(data.by_method || {});
    });
  };

  const exportPaymentsCsv = () => {
    if (!from || !to) { toast.error('Select date range first'); return; }
    downloadCsv(
      reportsApi.paymentsExportUrl(from, to, locationId || undefined),
      `payments-${from}-${to}.csv`,
      (msg) => toast.error(msg),
    );
  };

  /* ── Inventory movement ── */
  const loadInventory = () => {
    ensureLocations();
    if (!inventoryFrom || !inventoryTo) { setInventoryError('Select from/to dates'); return; }
    setInventoryLoading(true);
    setInventoryError(null);
    reportsApi.inventoryMovement({ from: inventoryFrom, to: inventoryTo, location_id: locationId || undefined })
      .then((res) => {
        setInventoryLoading(false);
        if ('error' in res && res.error) { setInventoryError(res.error); toast.error(res.error); }
        else if (res.data) { setInventory(res.data.rows || []); setInventorySummary(res.data.summary || null); }
      });
  };

  /* ── Monthly close ── */
  const handleMonthlyClose = () => {
    if (!window.confirm(`Close period ${period}? All ledger entries for this month will be locked and cannot be modified.`)) return;
    setCloseLoading(true);
    reportsApi.monthlyClose(period, closeNotes || undefined).then(({ data, error }) => {
      setCloseLoading(false);
      if (error) {
        toast.error(error);
      } else if (data) {
        toast.success(`Period ${period} closed and ledger locked.`);
        setCloseNotes('');
        // Refresh closings list
        reportsApi.monthlyClosings().then((res) => {
          if (res.data) setClosings((res.data as any).data ?? []);
        });
      }
    });
  };

  /* ── Margins ── */
  const loadMargins = () => {
    ensureLocations();
    if (!marginFrom || !marginTo) { setMarginsError('Select from/to dates'); return; }
    setMarginsLoading(true);
    setMarginsError(null);
    reportsApi.margins(marginFrom, marginTo, locationId || undefined).then(({ data, error }) => {
      setMarginsLoading(false);
      if (error) { setMarginsError(error); toast.error(error); }
      else if (data) setMargins(data.rows || []);
    });
  };

  /* ── shared input class ── */
  const inputCls =
    'w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40';

  return (
    <div className="space-y-5 elite-shell">
      {/* ── header ── */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <DashboardPageHeader
          title="Reports"
          description="Financial health, VAT, payment channels, inventory movement, and period management."
          icon={<BarChart2 className="w-5 h-5" />}
        />
        <div className="flex flex-wrap gap-2 text-sm">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Period (YYYY-MM)</label>
            <input
              type="text"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="border border-border rounded-xl px-3 py-2 w-32 bg-muted/40 text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Location</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              onFocus={ensureLocations}
              className="min-w-[140px] rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-foreground"
            >
              <option value="">All</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── row 1: P&L + VAT ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* P&L */}
        <section className="elite-panel p-4 lg:col-span-2 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-foreground">Profit &amp; Loss</h2>
                <p className="text-xs text-muted-foreground">Revenue, expenses, and commissions for the selected period.</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={loadPnl}
                disabled={pnlLoading}
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-colors"
              >
                {pnlLoading ? 'Loading…' : 'Load'}
              </button>
              <button
                type="button"
                onClick={exportPnlCsv}
                className="px-3 py-1.5 border border-border rounded-xl text-xs text-foreground hover:bg-accent transition-colors flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> CSV
              </button>
            </div>
          </div>
          {pnlError && <p className="text-xs text-red-600">{pnlError}</p>}
          {pnl ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <MetricCard label="Net Revenue" value={pnl.revenue.toFixed(2)} />
              <MetricCard label="Expenses" value={pnl.expense.toFixed(2)} />
              <MetricCard label="Commission & Tips" value={pnl.commission.toFixed(2)} />
              <MetricCard label="Net Profit" value={pnl.profit.toFixed(2)} highlight />
            </div>
          ) : (
            !pnlLoading && <p className="text-xs text-muted-foreground">Load P&amp;L to see totals for this month.</p>
          )}
        </section>

        {/* VAT */}
        <section className="elite-panel p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-50">
                <BarChart2 className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-foreground">VAT</h2>
                <p className="text-xs text-muted-foreground">Taxable revenue for VAT submissions.</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={loadVat}
                disabled={vatLoading}
                className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
              >
                {vatLoading ? 'Loading…' : 'Load'}
              </button>
              <button
                type="button"
                onClick={exportVatCsv}
                className="px-3 py-1.5 border border-border rounded-xl text-xs text-foreground hover:bg-accent transition-colors flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> CSV
              </button>
            </div>
          </div>
          {vatError && <p className="text-xs text-red-600">{vatError}</p>}
          {vatTotal != null ? (
            <div className="space-y-2">
              <div className="rounded-xl bg-muted/50 border border-border px-3 py-3">
                <p className="text-xs text-muted-foreground">Total taxable revenue</p>
                <p className="font-display text-2xl text-foreground mt-1">{vatTotal.toFixed(2)}</p>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>VAT rate: <span className="text-foreground font-medium">{vatRate == null ? 'not set' : `${vatRate.toFixed(2)}%`}</span></p>
                {estimatedVat != null && (
                  <p>Estimated VAT: <span className="text-foreground font-medium">{estimatedVat.toFixed(2)}</span></p>
                )}
              </div>
            </div>
          ) : (
            !vatLoading && <p className="text-xs text-muted-foreground">Load VAT to see figures for this month.</p>
          )}
        </section>
      </div>

      {/* ── row 2: Payment channels + Monthly closing ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Payment channels */}
        <section className="elite-panel p-4 lg:col-span-2 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-50">
                <CreditCard className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-foreground">Payment channels</h2>
                <p className="text-xs text-muted-foreground">Which methods (cash, card, wallets) your guests use.</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={loadPaymentBreakdown}
                disabled={paymentLoading}
                className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
              >
                {paymentLoading ? 'Loading…' : 'Run'}
              </button>
              <button
                type="button"
                onClick={exportPaymentsCsv}
                className="px-3 py-1.5 border border-border rounded-xl text-xs text-foreground hover:bg-accent transition-colors flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> CSV
              </button>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-2 text-sm">
            <label className="flex-1">
              <span className="block text-xs text-muted-foreground mb-1">From</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
            </label>
            <label className="flex-1">
              <span className="block text-xs text-muted-foreground mb-1">To</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
            </label>
          </div>
          {paymentError && <p className="text-xs text-red-600">{paymentError}</p>}
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {paymentBreakdown
              ? Object.entries(paymentBreakdown).map(([method, amount]) => (
                  <div key={method} className="rounded-xl border border-border bg-muted/50 px-3 py-3 text-sm">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{method}</p>
                    <p className="font-display text-xl text-foreground mt-1">{amount.toFixed(2)}</p>
                  </div>
                ))
              : !paymentLoading && <p className="text-xs text-muted-foreground">Run the report to see payment mix.</p>}
          </div>
        </section>

        {/* Monthly closing */}
        <section className="elite-panel p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-50">
              <Lock className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-foreground">Monthly closing</h2>
              <p className="text-xs text-muted-foreground">Lock a period once reconciliation is complete.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Period to close</label>
            <input
              type="text"
              value={period}
              readOnly
              className="w-full border border-border rounded-xl px-3 py-2 bg-muted/40 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Notes (optional)</label>
            <textarea
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              rows={2}
              placeholder="Reconciliation notes…"
              className={inputCls + ' resize-none'}
            />
          </div>
          <button
            type="button"
            onClick={handleMonthlyClose}
            disabled={closeLoading}
            className="w-full px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <Lock className="w-3.5 h-3.5" />
            {closeLoading ? 'Closing…' : `Close ${period}`}
          </button>

          {/* Past closings */}
          <div className="mt-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Past closings</p>
            {closingsLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
            {!closingsLoading && closings.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No closed periods yet.</p>
            )}
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {closings.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="font-medium text-foreground">
                      {MONTH_NAMES[(c.month ?? 1) - 1]} {c.year}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${c.status === 'closed' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {c.status}
                    </span>
                    {c.closed_at && (
                      <span className="text-muted-foreground">
                        {new Date(c.closed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ── Inventory movement ── */}
      <section className="elite-panel p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-50">
              <Package className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-foreground">Inventory movement</h2>
              <p className="text-xs text-muted-foreground">Track stock ins, outs, and service deductions.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadInventory}
            disabled={inventoryLoading}
            className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
          >
            {inventoryLoading ? 'Loading…' : 'Load'}
          </button>
        </div>
        <div className="flex flex-col md:flex-row gap-2 text-sm">
          <label className="flex-1">
            <span className="block text-xs text-muted-foreground mb-1">From</span>
            <input type="date" value={inventoryFrom} onChange={(e) => setInventoryFrom(e.target.value)} className={inputCls} />
          </label>
          <label className="flex-1">
            <span className="block text-xs text-muted-foreground mb-1">To</span>
            <input type="date" value={inventoryTo} onChange={(e) => setInventoryTo(e.target.value)} className={inputCls} />
          </label>
        </div>
        {inventorySummary && (
          <div className="grid gap-2 sm:grid-cols-3 text-xs">
            <div className="rounded-lg border border-border bg-green-50 px-3 py-2 flex items-center justify-between">
              <span className="text-green-700">In</span>
              <span className="font-semibold text-green-700">{inventorySummary.in}</span>
            </div>
            <div className="rounded-lg border border-border bg-red-50 px-3 py-2 flex items-center justify-between">
              <span className="text-red-700">Out</span>
              <span className="font-semibold text-red-700">{inventorySummary.out}</span>
            </div>
            <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 flex items-center justify-between">
              <span className="text-muted-foreground">Net</span>
              <span className={`font-semibold ${inventorySummary.net >= 0 ? 'text-green-700' : 'text-red-600'}`}>{inventorySummary.net}</span>
            </div>
          </div>
        )}
        {inventoryError && <p className="text-xs text-red-600">{inventoryError}</p>}
        <div className="overflow-x-auto max-h-72 border border-border rounded-xl">
          <table className="min-w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground sticky top-0">
              <tr>
                <th className="py-2 px-3 text-left font-medium">When</th>
                <th className="py-2 px-3 text-left font-medium">Product</th>
                <th className="py-2 px-3 text-left font-medium">Location</th>
                <th className="py-2 px-3 text-left font-medium">Type</th>
                <th className="py-2 px-3 text-right font-medium">Qty</th>
                <th className="py-2 px-3 text-left font-medium">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {inventory?.map((row) => (
                <tr key={row.id} className="hover:bg-muted/30">
                  <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">{row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}</td>
                  <td className="py-2 px-3 text-foreground">{row.product_name || '—'}</td>
                  <td className="py-2 px-3 text-muted-foreground">{row.branch_name || '—'}</td>
                  <td className="py-2 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${row.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {row.type}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right text-foreground font-medium">{row.quantity}</td>
                  <td className="py-2 px-3 text-muted-foreground">{row.reason || '—'}</td>
                </tr>
              ))}
              {!inventory?.length && !inventoryLoading && (
                <tr>
                  <td className="py-4 px-3 text-center text-muted-foreground" colSpan={6}>
                    Select a date range and load to see stock movements.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Margins ── */}
      <section className="elite-panel p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-50">
              <BarChart2 className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-foreground">Margins</h2>
              <p className="text-xs text-muted-foreground">Revenue vs cost per service/product.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadMargins}
            disabled={marginsLoading}
            className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
          >
            {marginsLoading ? 'Loading…' : 'Run'}
          </button>
        </div>
        <div className="flex flex-col md:flex-row gap-2 text-sm">
          <label className="flex-1">
            <span className="block text-xs text-muted-foreground mb-1">From</span>
            <input type="date" value={marginFrom} onChange={(e) => setMarginFrom(e.target.value)} className={inputCls} />
          </label>
          <label className="flex-1">
            <span className="block text-xs text-muted-foreground mb-1">To</span>
            <input type="date" value={marginTo} onChange={(e) => setMarginTo(e.target.value)} className={inputCls} />
          </label>
        </div>
        {marginsError && <p className="text-xs text-red-600">{marginsError}</p>}
        <div className="overflow-x-auto border border-border rounded-xl">
          <table className="min-w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="py-2 px-3 text-left font-medium">Type</th>
                <th className="py-2 px-3 text-left font-medium">Name</th>
                <th className="py-2 px-3 text-right font-medium">Revenue</th>
                <th className="py-2 px-3 text-right font-medium">Cost</th>
                <th className="py-2 px-3 text-right font-medium">Margin</th>
                <th className="py-2 px-3 text-right font-medium">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {margins?.map((row) => (
                <tr key={`${row.type}-${row.id}`} className="hover:bg-muted/30">
                  <td className="py-2 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${row.type === 'service' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {row.type}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-foreground font-medium">{row.name}</td>
                  <td className="py-2 px-3 text-right text-foreground">{row.revenue.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right text-muted-foreground">{row.cost.toFixed(2)}</td>
                  <td className={`py-2 px-3 text-right font-medium ${row.margin >= 0 ? 'text-green-700' : 'text-red-600'}`}>{row.margin.toFixed(2)}</td>
                  <td className={`py-2 px-3 text-right font-medium ${row.margin_pct >= 0 ? 'text-green-700' : 'text-red-600'}`}>{row.margin_pct.toFixed(2)}%</td>
                </tr>
              ))}
              {!margins?.length && !marginsLoading && (
                <tr>
                  <td className="py-4 px-3 text-center text-muted-foreground" colSpan={6}>
                    Select a date range and run to see margin analysis.
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

/* ── small metric card ── */
function MetricCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-3 ${highlight ? 'border-primary/40 bg-primary/10' : 'border-border bg-muted/50'}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-display text-xl mt-1 ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}
