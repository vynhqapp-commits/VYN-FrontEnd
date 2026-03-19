'use client';

import { useState } from 'react';
import { locationsApi, reportsApi, InventoryMovementRow } from '@/lib/api';

export default function ReportsPage() {
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [locationId, setLocationId] = useState<string>('');
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);

  const [pnl, setPnl] = useState<{ revenue: number; expense: number; commission: number; profit: number } | null>(null);
  const [pnlLoading, setPnlLoading] = useState(false);
  const [pnlError, setPnlError] = useState<string | null>(null);

  const [vatTotal, setVatTotal] = useState<number | null>(null);
  const [vatRate, setVatRate] = useState<number | null>(null);
  const [estimatedVat, setEstimatedVat] = useState<number | null>(null);
  const [vatLoading, setVatLoading] = useState(false);
  const [vatError, setVatError] = useState<string | null>(null);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [paymentBreakdown, setPaymentBreakdown] = useState<Record<string, number> | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [inventory, setInventory] = useState<InventoryMovementRow[] | null>(null);
  const [inventorySummary, setInventorySummary] = useState<{ in: number; out: number; net: number } | null>(null);
  const [inventoryFrom, setInventoryFrom] = useState('');
  const [inventoryTo, setInventoryTo] = useState('');
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  const [closeLoading, setCloseLoading] = useState(false);
  const [closeMessage, setCloseMessage] = useState<string | null>(null);

  const [marginFrom, setMarginFrom] = useState('');
  const [marginTo, setMarginTo] = useState('');
  const [margins, setMargins] = useState<
    | {
        type: 'service' | 'product';
        id: string;
        name: string;
        revenue: number;
        cost: number;
        margin: number;
        margin_pct: number;
      }[]
    | null
  >(null);
  const [marginsLoading, setMarginsLoading] = useState(false);
  const [marginsError, setMarginsError] = useState<string | null>(null);

  // lazy-load locations when the user first opens the page via interactions
  const ensureLocations = () => {
    if (locations.length) return;
    locationsApi.list().then((res) => {
      if (res.data?.locations?.length) {
        setLocations(res.data.locations);
        setLocationId(res.data.locations[0].id);
      }
    });
  };

  const loadPnl = () => {
    ensureLocations();
    setPnlLoading(true);
    setPnlError(null);
    reportsApi.pnl(period, locationId || undefined).then(({ data, error }) => {
      setPnlLoading(false);
      if (error) setPnlError(error);
      else if (data)
        setPnl({
          revenue: data.revenue,
          expense: data.expense,
          commission: data.commission,
          profit: data.profit,
        });
    });
  };

  const exportExcel = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('salon_token') : null;
    const url = reportsApi.pnlExportUrl(period, locationId || undefined);
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((res) => res.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `pnl-${period}.xlsx`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => setPnlError('Export failed'));
  };

  const loadVat = () => {
    ensureLocations();
    setVatLoading(true);
    setVatError(null);
    reportsApi.vat(period, locationId || undefined).then(({ data, error }) => {
      setVatLoading(false);
      if (error) setVatError(error);
      else if (data) {
        setVatTotal(data.total_revenue);
        setVatRate((data as any).vat_rate ?? null);
        setEstimatedVat((data as any).estimated_vat ?? null);
      }
    });
  };

  const loadPaymentBreakdown = () => {
    ensureLocations();
    if (!from || !to) {
      setPaymentError('Select from/to dates');
      return;
    }
    setPaymentLoading(true);
    setPaymentError(null);
    reportsApi
      .paymentBreakdown(from, to, locationId || undefined)
      .then(({ data, error }) => {
        setPaymentLoading(false);
        if (error) setPaymentError(error);
        else if (data) setPaymentBreakdown(data.by_method || {});
      });
  };

  const loadInventory = () => {
    ensureLocations();
    if (!inventoryFrom || !inventoryTo) {
      setInventoryError('Select from/to dates');
      return;
    }
    setInventoryLoading(true);
    setInventoryError(null);
    reportsApi.inventoryMovement({ from: inventoryFrom, to: inventoryTo, location_id: locationId || undefined })
      .then((res) => {
        setInventoryLoading(false);
        if ('error' in res && res.error) setInventoryError(res.error);
        else if (res.data) {
          setInventory(res.data.rows || []);
          setInventorySummary(res.data.summary || null);
        }
      });
  };

  const handleMonthlyClose = () => {
    setCloseLoading(true);
    setCloseMessage(null);
    reportsApi.monthlyClose(period).then(({ data, error }) => {
      setCloseLoading(false);
      if (error) setCloseMessage(error);
      else if (data) setCloseMessage('Month closed and ledger locked for this period.');
    });
  };

  const loadMargins = () => {
    ensureLocations();
    if (!marginFrom || !marginTo) {
      setMarginsError('Select from/to dates');
      return;
    }
    setMarginsLoading(true);
    setMarginsError(null);
    reportsApi.margins(marginFrom, marginTo, locationId || undefined).then(({ data, error }) => {
      setMarginsLoading(false);
      if (error) setMarginsError(error);
      else if (data) setMargins(data.rows || []);
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-salon-espresso">Reports</h1>
          <p className="text-salon-stone text-sm mt-1">
            High-level financial health, VAT, payment channels, and stock movement for your salon.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <div>
            <label className="block text-xs text-salon-stone mb-1">Period (YYYY-MM)</label>
            <input
              type="text"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="border border-salon-sand/60 rounded-xl px-3 py-2 w-32 bg-salon-cream/50 text-salon-espresso focus:outline-none focus:ring-2 focus:ring-salon-gold/40"
            />
          </div>
          <div>
            <label className="block text-xs text-salon-stone mb-1">Location</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              onFocus={ensureLocations}
              className="border border-salon-sand/60 rounded-xl px-3 py-2 min-w-[140px] bg-salon-cream/50 text-sm"
            >
              <option value="">All</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-salon-espresso">Profit &amp; loss</h2>
              <p className="text-xs text-salon-stone">
                Revenue, expenses, and commissions for the selected period and location.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadPnl}
                disabled={pnlLoading}
                className="px-4 py-2 bg-salon-gold text-white rounded-xl text-xs font-medium hover:bg-salon-goldLight disabled:opacity-50 transition-colors"
              >
                {pnlLoading ? 'Loading…' : 'Load'}
              </button>
              <button
                type="button"
                onClick={exportExcel}
                className="px-4 py-2 border border-salon-sand/60 rounded-xl text-xs text-salon-espresso hover:bg-salon-sand/30 transition-colors"
              >
                Export Excel
              </button>
            </div>
          </div>
          {pnlError && <p className="text-xs text-red-600 mb-2">{pnlError}</p>}
          {pnl && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div className="rounded-xl bg-salon-cream/70 border border-salon-sand/40 px-3 py-3">
                <p className="text-xs text-salon-stone">Revenue</p>
                <p className="font-display text-xl text-salon-espresso mt-1">{pnl.revenue.toFixed(2)}</p>
              </div>
              <div className="rounded-xl bg-salon-cream/70 border border-salon-sand/40 px-3 py-3">
                <p className="text-xs text-salon-stone">Expenses</p>
                <p className="font-display text-xl text-salon-espresso mt-1">{pnl.expense.toFixed(2)}</p>
              </div>
              <div className="rounded-xl bg-salon-cream/70 border border-salon-sand/40 px-3 py-3">
                <p className="text-xs text-salon-stone">Commission</p>
                <p className="font-display text-xl text-salon-espresso mt-1">{pnl.commission.toFixed(2)}</p>
              </div>
              <div className="rounded-xl bg-salon-gold/10 border border-salon-gold/40 px-3 py-3">
                <p className="text-xs text-salon-stone">Profit</p>
                <p className="font-display text-xl text-salon-gold mt-1">{pnl.profit.toFixed(2)}</p>
              </div>
            </div>
          )}
          {!pnl && !pnlLoading && (
            <p className="text-xs text-salon-stone mt-1">
              Load P&amp;L to see totals for this month.
            </p>
          )}
        </section>

        <section className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-salon-espresso">VAT</h2>
              <p className="text-xs text-salon-stone">
                Total taxable revenue to feed into VAT submissions.
              </p>
            </div>
            <button
              type="button"
              onClick={loadVat}
              disabled={vatLoading}
              className="px-3 py-1.5 rounded-xl bg-salon-espresso text-salon-cream text-xs font-medium disabled:opacity-50"
            >
              {vatLoading ? 'Loading…' : 'Load'}
            </button>
          </div>
          {vatError && <p className="text-xs text-red-600">{vatError}</p>}
          {vatTotal != null && (
            <div className="space-y-1">
              <p className="font-display text-2xl text-salon-espresso">
                {vatTotal.toFixed(2)}
                <span className="text-xs text-salon-stone ml-1">total taxable revenue</span>
              </p>
              <p className="text-xs text-salon-stone">
                VAT rate: {vatRate == null ? 'not set' : `${vatRate.toFixed(2)}%`}
              </p>
              {estimatedVat != null && (
                <p className="text-xs text-salon-stone">
                  Estimated VAT: <span className="text-salon-espresso font-medium">{estimatedVat.toFixed(2)}</span>
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-4 lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-salon-espresso">Payment channels</h2>
              <p className="text-xs text-salon-stone">
                See which methods (cash, card, wallets) your guests prefer.
              </p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-2 text-sm">
            <label className="flex-1">
              <span className="block text-xs text-salon-stone mb-1">From</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm"
              />
            </label>
            <label className="flex-1">
              <span className="block text-xs text-salon-stone mb-1">To</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={loadPaymentBreakdown}
                disabled={paymentLoading}
                className="px-4 py-2 rounded-xl bg-salon-espresso text-salon-cream text-sm font-medium disabled:opacity-50"
              >
                {paymentLoading ? 'Loading…' : 'Run'}
              </button>
            </div>
          </div>
          {paymentError && <p className="text-xs text-red-600">{paymentError}</p>}
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {paymentBreakdown &&
              Object.entries(paymentBreakdown).map(([method, amount]) => (
                <div
                  key={method}
                  className="rounded-xl border border-salon-sand/40 bg-salon-cream/70 px-3 py-3 text-sm"
                >
                  <p className="text-xs uppercase tracking-wide text-salon-stone">{method}</p>
                  <p className="font-display text-xl text-salon-espresso mt-1">{amount.toFixed(2)}</p>
                </div>
              ))}
            {!paymentBreakdown && !paymentLoading && (
              <p className="text-xs text-salon-stone mt-1">
                Run the report to see payment mix.
              </p>
            )}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-salon-espresso">Monthly closing</h2>
              <p className="text-xs text-salon-stone">
                Lock this month once you&apos;re done reconciling transactions.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleMonthlyClose}
            disabled={closeLoading}
            className="px-4 py-2 rounded-xl bg-salon-gold text-white text-sm font-medium disabled:opacity-50"
          >
            {closeLoading ? 'Closing…' : 'Close this month'}
          </button>
          {closeMessage && <p className="text-xs text-salon-espresso mt-1">{closeMessage}</p>}
        </section>
      </div>

      <section className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold text-salon-espresso">Inventory movement</h2>
            <p className="text-xs text-salon-stone">
              See current stock by product and location to catch issues early.
            </p>
          </div>
          <button
            type="button"
            onClick={loadInventory}
            disabled={inventoryLoading}
            className="px-4 py-2 rounded-xl bg-salon-espresso text-salon-cream text-sm font-medium disabled:opacity-50"
          >
            {inventoryLoading ? 'Loading…' : 'Load'}
          </button>
        </div>
        <div className="flex flex-col md:flex-row gap-2 text-sm">
          <label className="flex-1">
            <span className="block text-xs text-salon-stone mb-1">From</span>
            <input
              type="date"
              value={inventoryFrom}
              onChange={(e) => setInventoryFrom(e.target.value)}
              className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm"
            />
          </label>
          <label className="flex-1">
            <span className="block text-xs text-salon-stone mb-1">To</span>
            <input
              type="date"
              value={inventoryTo}
              onChange={(e) => setInventoryTo(e.target.value)}
              className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm"
            />
          </label>
        </div>
        {inventorySummary && (
          <div className="grid gap-2 sm:grid-cols-3 text-xs">
            <div className="rounded-lg border border-salon-sand/40 px-3 py-2">In: <span className="font-medium">{inventorySummary.in}</span></div>
            <div className="rounded-lg border border-salon-sand/40 px-3 py-2">Out: <span className="font-medium">{inventorySummary.out}</span></div>
            <div className="rounded-lg border border-salon-sand/40 px-3 py-2">Net: <span className="font-medium">{inventorySummary.net}</span></div>
          </div>
        )}
        {inventoryError && <p className="text-xs text-red-600">{inventoryError}</p>}
        <div className="overflow-x-auto max-h-72 border border-salon-sand/40 rounded-xl">
          <table className="min-w-full text-xs md:text-sm">
            <thead className="bg-salon-cream/70 text-salon-stone">
              <tr>
                <th className="py-2 px-3 text-left font-medium">When</th>
                <th className="py-2 px-3 text-left font-medium">Product</th>
                <th className="py-2 px-3 text-left font-medium">Location</th>
                <th className="py-2 px-3 text-left font-medium">Type</th>
                <th className="py-2 px-3 text-right font-medium">Quantity</th>
                <th className="py-2 px-3 text-left font-medium">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-salon-sand/40">
              {inventory?.map((row) => (
                <tr key={row.id}>
                  <td className="py-2 px-3 text-salon-stone">{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</td>
                  <td className="py-2 px-3 text-salon-espresso">
                    {row.product_name || '—'}
                  </td>
                  <td className="py-2 px-3 text-salon-stone">
                    {row.branch_name || '—'}
                  </td>
                  <td className="py-2 px-3 text-salon-stone">
                    {row.type}
                  </td>
                  <td className="py-2 px-3 text-right text-salon-espresso">
                    {Number(row.quantity ?? 0).toFixed(0)}
                  </td>
                  <td className="py-2 px-3 text-salon-stone">
                    {row.reason || '—'}
                  </td>
                </tr>
              ))}
              {!inventory?.length && !inventoryLoading && (
                <tr>
                  <td className="py-3 px-3 text-center text-salon-stone" colSpan={6}>
                    Load inventory to see results.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold text-salon-espresso">Margins</h2>
            <p className="text-xs text-salon-stone">
              Revenue vs cost per service/product (uses `Service.cost` and `Product.cost`).
            </p>
          </div>
          <button
            type="button"
            onClick={loadMargins}
            disabled={marginsLoading}
            className="px-4 py-2 rounded-xl bg-salon-espresso text-salon-cream text-sm font-medium disabled:opacity-50"
          >
            {marginsLoading ? 'Loading…' : 'Run'}
          </button>
        </div>
        <div className="flex flex-col md:flex-row gap-2 text-sm">
          <label className="flex-1">
            <span className="block text-xs text-salon-stone mb-1">From</span>
            <input
              type="date"
              value={marginFrom}
              onChange={(e) => setMarginFrom(e.target.value)}
              className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm"
            />
          </label>
          <label className="flex-1">
            <span className="block text-xs text-salon-stone mb-1">To</span>
            <input
              type="date"
              value={marginTo}
              onChange={(e) => setMarginTo(e.target.value)}
              className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm"
            />
          </label>
        </div>
        {marginsError && <p className="text-xs text-red-600">{marginsError}</p>}
        <div className="overflow-x-auto border border-salon-sand/40 rounded-xl">
          <table className="min-w-full text-xs md:text-sm">
            <thead className="bg-salon-cream/70 text-salon-stone">
              <tr>
                <th className="py-2 px-3 text-left font-medium">Type</th>
                <th className="py-2 px-3 text-left font-medium">Name</th>
                <th className="py-2 px-3 text-right font-medium">Revenue</th>
                <th className="py-2 px-3 text-right font-medium">Cost</th>
                <th className="py-2 px-3 text-right font-medium">Margin</th>
                <th className="py-2 px-3 text-right font-medium">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-salon-sand/40">
              {margins?.map((row) => (
                <tr key={`${row.type}-${row.id}`}>
                  <td className="py-2 px-3 text-salon-stone">{row.type}</td>
                  <td className="py-2 px-3 text-salon-espresso">{row.name}</td>
                  <td className="py-2 px-3 text-right text-salon-espresso">{row.revenue.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right text-salon-stone">{row.cost.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right text-salon-espresso">{row.margin.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right text-salon-stone">{row.margin_pct.toFixed(2)}%</td>
                </tr>
              ))}
              {!margins?.length && !marginsLoading && (
                <tr>
                  <td className="py-3 px-3 text-center text-salon-stone" colSpan={6}>
                    Run the report to see results.
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

