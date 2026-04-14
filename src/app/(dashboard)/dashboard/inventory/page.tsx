'use client';

import { useCallback, useEffect, useState } from 'react';
import { Boxes, X } from 'lucide-react';
import {
  inventoryApi,
  locationsApi,
  productsApi,
  type Inventory,
  type InventoryMovementRow,
  type Location,
  type Product,
} from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const REASON_TYPES = [
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'return', label: 'Return (stock in)' },
  { value: 'damage', label: 'Damage' },
  { value: 'theft', label: 'Theft' },
  { value: 'expired', label: 'Expired' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'service_usage', label: 'Service usage' },
] as const;

const MOVEMENT_FILTER_TYPES = [
  { value: '', label: 'All types' },
  { value: 'sold', label: 'Sold' },
  { value: 'service_deduction', label: 'Service (appointment)' },
  { value: 'service_usage', label: 'Service usage (manual)' },
  { value: 'in', label: 'In' },
  { value: 'out', label: 'Out' },
  { value: 'return', label: 'Return' },
  { value: 'damage', label: 'Damage' },
  { value: 'theft', label: 'Theft' },
  { value: 'expired', label: 'Expired' },
  { value: 'transfer', label: 'Transfer' },
];

export default function InventoryPage() {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);

  const [showAdjust, setShowAdjust] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustForm, setAdjustForm] = useState<{
    product_id: string;
    delta: number;
    reason: string;
    reason_type: (typeof REASON_TYPES)[number]['value'];
  }>({ product_id: '', delta: 0, reason: 'Stock adjustment', reason_type: 'adjustment' });

  const [lowStock, setLowStock] = useState<Inventory[]>([]);
  const [lowStockLoading, setLowStockLoading] = useState(false);

  const [movFrom, setMovFrom] = useState(() => {
    const f = new Date();
    f.setDate(f.getDate() - 30);
    return formatYmd(f);
  });
  const [movTo, setMovTo] = useState(() => formatYmd(new Date()));
  const [movProductId, setMovProductId] = useState('');
  const [movType, setMovType] = useState('');
  const [movRows, setMovRows] = useState<InventoryMovementRow[]>([]);
  const [movSummary, setMovSummary] = useState<{
    sold: number;
    service_used: number;
    adjustment_in: number;
    adjustment_out: number;
  } | null>(null);
  const [movLoading, setMovLoading] = useState(false);
  const [movError, setMovError] = useState<string | null>(null);

  const loadInventory = (branchId: string) => {
    setLoading(true);
    setError(null);
    inventoryApi.list({ location_id: branchId }).then((res) => {
      setLoading(false);
      if ('error' in res && res.error) setError(res.error);
      else if (res.data?.inventory) setInventory(res.data.inventory);
    });
  };

  const loadMovements = useCallback(() => {
    if (!locationId || !movFrom || !movTo) return;
    setMovLoading(true);
    setMovError(null);
    inventoryApi
      .movements({
        branch_id: locationId,
        from: movFrom,
        to: movTo,
        product_id: movProductId || undefined,
        type: movType || undefined,
      })
      .then((res) => {
        setMovLoading(false);
        if ('error' in res && res.error) {
          setMovError(res.error);
          setMovRows([]);
          setMovSummary(null);
          return;
        }
        if (res.data) {
          setMovRows(res.data.rows ?? []);
          setMovSummary(res.data.summary ?? null);
        }
      });
  }, [locationId, movFrom, movTo, movProductId, movType]);

  useEffect(() => {
    Promise.all([locationsApi.list(), productsApi.list({ per_page: 100 })]).then(([locRes, prodRes]) => {
      if (!('error' in locRes) && locRes.data?.locations) {
        setLocations(locRes.data.locations);
        const first = locRes.data.locations[0]?.id ?? '';
        setLocationId(first);
        if (first) loadInventory(first);
        else setLoading(false);
      } else {
        setLoading(false);
      }
      if (!('error' in prodRes) && prodRes.data?.products) setProducts(prodRes.data.products);
    });
  }, []);

  useEffect(() => {
    if (!locationId) return;
    loadInventory(locationId);
  }, [locationId]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  const loadLowStock = () => {
    setLowStockLoading(true);
    inventoryApi.lowStock().then((res) => {
      setLowStockLoading(false);
      if ('error' in res && res.error) return;
      setLowStock(res.data?.items ?? []);
    });
  };

  const submitAdjust = async () => {
    if (!locationId) return;
    if (!adjustForm.product_id) {
      setAdjustError('Select a product.');
      toastError('Select a product.');
      return;
    }
    if (!Number.isFinite(adjustForm.delta) || adjustForm.delta === 0) {
      setAdjustError('Enter a non-zero quantity change.');
      toastError('Enter a non-zero quantity change.');
      return;
    }
    const reason = adjustForm.reason.trim();
    if (reason.length < 3) {
      setAdjustError('Reason must be at least 3 characters.');
      toastError('Reason must be at least 3 characters.');
      return;
    }
    const rt = adjustForm.reason_type;
    const d = adjustForm.delta;
    if (rt === 'service_usage' && d >= 0) {
      setAdjustError('Service usage must reduce stock (negative quantity).');
      toastError('Service usage must reduce stock (negative quantity).');
      return;
    }
    if (['damage', 'theft', 'expired', 'service_usage'].includes(rt) && d >= 0) {
      setAdjustError('This type requires a negative quantity.');
      toastError('This type requires a negative quantity.');
      return;
    }
    if (rt === 'return' && d <= 0) {
      setAdjustError('Returns must increase stock (positive quantity).');
      toastError('Returns must increase stock (positive quantity).');
      return;
    }

    setSaving(true);
    setAdjustError(null);
    const res = await inventoryApi.update(adjustForm.product_id, {
      branch_id: locationId,
      quantity: adjustForm.delta,
      reason,
      type: rt,
    });
    setSaving(false);
    if ('error' in res && res.error) {
      setAdjustError(res.error);
      toastError(res.error);
      return;
    }
    setShowAdjust(false);
    setAdjustForm({
      product_id: '',
      delta: 0,
      reason: 'Stock adjustment',
      reason_type: 'adjustment',
    });
    loadInventory(locationId);
    loadLowStock();
    loadMovements();
    toastSuccess('Stock adjusted.');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }
  if (error) return <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl">{error}</div>;

  return (
    <div className="elite-shell space-y-6">
      <DashboardPageHeader
        className="mb-4"
        title="Inventory"
        description="Track stock per location and keep an audit trail of changes."
        icon={<Boxes className="w-5 h-5" />}
        rightSlot={
          <div className="flex gap-2 items-end flex-wrap justify-end">
            <label className="text-xs font-semibold elite-subtle">
              Location
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="mt-1 w-56 elite-input rounded-lg px-3 py-2 text-sm"
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                setShowAdjust(true);
                setAdjustError(null);
              }}
              className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-colors"
            >
              Adjust stock
            </button>
            <button
              type="button"
              onClick={loadLowStock}
              className="px-4 py-2 rounded-full border border-border text-foreground text-sm font-semibold hover:bg-accent transition-colors"
            >
              {lowStockLoading ? 'Loading…' : 'Low stock'}
            </button>
          </div>
        }
      />

      {lowStock.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900">
          <p className="text-sm font-semibold">Low stock alerts</p>
          <ul className="mt-2 text-sm list-disc pl-5 space-y-1">
            {lowStock.slice(0, 6).map((r) => (
              <li key={r.id}>
                {r.Product?.name ?? r.product_id} @ {r.Location?.name ?? r.location_id}: {Number(r.quantity)} (threshold{' '}
                {r.low_stock_threshold ?? '—'})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="elite-panel overflow-hidden">
        <table className="min-w-full divide-y divide-border">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quantity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Low stock</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((inv) => (
              <tr key={inv.id}>
                <td className="px-4 py-3 text-sm">{inv.Location?.name ?? inv.location_id}</td>
                <td className="px-4 py-3 text-sm">{inv.Product?.name ?? inv.product_id}</td>
                <td className="px-4 py-3 text-sm">{Number(inv.quantity)}</td>
                <td className="px-4 py-3 text-sm">{inv.low_stock_threshold != null ? Number(inv.low_stock_threshold) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {inventory.length === 0 && <p className="p-6 text-muted-foreground text-center">No inventory records.</p>}
      </div>

      <div className="elite-panel p-4 space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">Stock movement history</h2>
          <p className="text-sm text-muted-foreground mt-1">Sold vs service-used and adjustments for the selected location and period.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">From</label>
            <Input type="date" value={movFrom} onChange={(e) => setMovFrom(e.target.value)} className="elite-input" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">To</label>
            <Input type="date" value={movTo} onChange={(e) => setMovTo(e.target.value)} className="elite-input" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Product</label>
            <Combobox
              value={movProductId}
              onValueChange={setMovProductId}
              options={[{ value: '', label: 'All products' }, ...products.map((p) => ({ value: String(p.id), label: p.name ?? 'Product' }))]}
              placeholder="All products"
              searchPlaceholder="Search products..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Type</label>
            <select
              value={movType}
              onChange={(e) => setMovType(e.target.value)}
              className="w-full mt-1 elite-input rounded-lg px-3 py-2 text-sm"
            >
              {MOVEMENT_FILTER_TYPES.map((t) => (
                <option key={t.value || 'all'} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {movSummary && (
          <div className="flex flex-wrap gap-4 text-sm rounded-lg border border-border bg-muted/30 px-4 py-3">
            <span>
              <span className="text-muted-foreground">Sold: </span>
              <span className="font-semibold tabular-nums">{movSummary.sold}</span>
            </span>
            <span className="text-muted-foreground">|</span>
            <span>
              <span className="text-muted-foreground">Service used: </span>
              <span className="font-semibold tabular-nums">{movSummary.service_used}</span>
            </span>
            <span className="text-muted-foreground">|</span>
            <span>
              <span className="text-muted-foreground">Adjusted in: </span>
              <span className="font-semibold tabular-nums text-green-700">{movSummary.adjustment_in}</span>
            </span>
            <span className="text-muted-foreground">|</span>
            <span>
              <span className="text-muted-foreground">Adjusted out: </span>
              <span className="font-semibold tabular-nums text-red-700">{movSummary.adjustment_out}</span>
            </span>
          </div>
        )}

        {movError && <p className="text-sm text-red-600">{movError}</p>}
        {movLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Date</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Product</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Type</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Qty</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Reason</th>
                </tr>
              </thead>
              <tbody>
                {movRows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2">{row.product_name ?? row.product_id ?? '—'}</td>
                    <td className="px-3 py-2 font-medium">{row.type}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.quantity}</td>
                    <td className="px-3 py-2 text-muted-foreground max-w-xs truncate" title={row.reason ?? ''}>
                      {row.reason ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!movRows.length && !movLoading && <p className="p-6 text-muted-foreground text-center">No movements in this period.</p>}
          </div>
        )}
      </div>

      {showAdjust && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[1px] p-2 sm:p-4"
          onClick={() => setShowAdjust(false)}
        >
          <div className="bg-card rounded-t-2xl sm:rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="font-display text-xl font-semibold text-foreground">Adjust stock</h2>
              <button
                type="button"
                onClick={() => setShowAdjust(false)}
                disabled={saving}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {adjustError && <p className="text-sm text-red-600 mb-3">{adjustError}</p>}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Product</label>
                <Combobox
                  value={adjustForm.product_id}
                  onValueChange={(v) => setAdjustForm((f) => ({ ...f, product_id: v }))}
                  options={products.map((p) => ({
                    value: String(p.id),
                    label: String(p.name ?? 'Unnamed product'),
                  }))}
                  placeholder="Select product"
                  searchPlaceholder="Search products..."
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Reason type</label>
                <select
                  className="w-full mt-1 elite-input rounded-lg px-3 py-2 text-sm"
                  value={adjustForm.reason_type}
                  onChange={(e) =>
                    setAdjustForm((f) => ({
                      ...f,
                      reason_type: e.target.value as (typeof REASON_TYPES)[number]['value'],
                    }))
                  }
                  disabled={saving}
                >
                  {REASON_TYPES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Quantity change (use negative to reduce)
                </label>
                <Input
                  type="number"
                  value={adjustForm.delta}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, delta: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Reason (min. 3 characters)</label>
                <Input
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="e.g. Stock count correction"
                  disabled={saving}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" onClick={() => setShowAdjust(false)} disabled={saving} variant="outline" className="rounded-xl">
                Cancel
              </Button>
              <Button type="button" onClick={submitAdjust} disabled={saving} className="rounded-xl">
                {saving ? 'Saving…' : 'Save adjustment'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
