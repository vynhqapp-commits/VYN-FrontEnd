'use client';

import { useEffect, useState } from 'react';
import { inventoryApi, locationsApi, productsApi, type Inventory, type Location, type Product } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
  }>({ product_id: '', delta: 0, reason: 'adjustment' });

  const [lowStock, setLowStock] = useState<Inventory[]>([]);
  const [lowStockLoading, setLowStockLoading] = useState(false);

  const loadInventory = (branchId: string) => {
    setLoading(true);
    setError(null);
    inventoryApi.list({ location_id: branchId }).then((res) => {
      setLoading(false);
      if ('error' in res && res.error) setError(res.error);
      else if (res.data?.inventory) setInventory(res.data.inventory);
    });
  };

  useEffect(() => {
    Promise.all([locationsApi.list(), productsApi.list()]).then(([locRes, prodRes]) => {
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
    setSaving(true);
    setAdjustError(null);
    const res = await inventoryApi.update(adjustForm.product_id, {
      branch_id: locationId,
      quantity: adjustForm.delta,
    });
    setSaving(false);
    if ('error' in res && res.error) {
      setAdjustError(res.error);
      toastError(res.error);
      return;
    }
    setShowAdjust(false);
    setAdjustForm({ product_id: '', delta: 0, reason: 'adjustment' });
    loadInventory(locationId);
    loadLowStock();
    toastSuccess('Stock adjusted.');
  };

  if (loading) return <p className="text-salon-stone">Loading inventory...</p>;
  if (error) return <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl">{error}</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-salon-espresso">Inventory</h1>
          <p className="text-salon-stone text-sm mt-1">Track stock per location and keep an audit trail of changes.</p>
        </div>
        <div className="flex gap-2 items-end">
          <label className="text-xs font-semibold text-salon-stone">
            Location
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="mt-1 w-56 bg-salon-cream/40 border border-salon-sand/60 rounded-lg px-3 py-2 text-sm text-salon-espresso"
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
            onClick={() => { setShowAdjust(true); setAdjustError(null); }}
            className="px-4 py-2 rounded-full bg-salon-gold text-white text-sm font-semibold hover:bg-salon-goldLight transition-colors"
          >
            Adjust stock
          </button>
          <button
            type="button"
            onClick={loadLowStock}
            className="px-4 py-2 rounded-full border border-salon-sand/60 text-salon-espresso text-sm font-semibold hover:bg-salon-sand/30 transition-colors"
          >
            {lowStockLoading ? 'Loading…' : 'Low stock'}
          </button>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="mb-4 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900">
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

      <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-salon-sand/60">
          <thead className="bg-salon-sand/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Location</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Product</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Quantity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Low stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-salon-sand/60">
            {inventory.map((inv) => (
              <tr key={inv.id}>
                <td className="px-4 py-3 text-sm text-salon-espresso">{inv.Location?.name ?? inv.location_id}</td>
                <td className="px-4 py-3 text-sm text-salon-stone">{inv.Product?.name ?? inv.product_id}</td>
                <td className="px-4 py-3 text-sm text-salon-stone">{Number(inv.quantity)}</td>
                <td className="px-4 py-3 text-sm text-salon-stone">{inv.low_stock_threshold != null ? Number(inv.low_stock_threshold) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {inventory.length === 0 && (
          <p className="p-6 text-salon-stone text-center">No inventory records.</p>
        )}
      </div>

      {showAdjust && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="font-display text-xl font-semibold text-salon-espresso">Adjust stock</h2>
              <button
                type="button"
                onClick={() => setShowAdjust(false)}
                disabled={saving}
                className="text-salon-stone hover:text-salon-espresso disabled:opacity-50"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-salon-stone mb-1">Product</label>
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
                <label className="block text-xs font-semibold text-salon-stone mb-1">
                  Quantity change (use negative to reduce)
                </label>
                <Input
                  type="number"
                  value={adjustForm.delta}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, delta: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                onClick={() => setShowAdjust(false)}
                disabled={saving}
                variant="outline"
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submitAdjust}
                disabled={saving}
                className="rounded-xl"
              >
                {saving ? 'Saving…' : 'Save adjustment'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
