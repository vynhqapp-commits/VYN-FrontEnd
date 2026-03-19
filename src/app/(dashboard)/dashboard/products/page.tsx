'use client';

import { useEffect, useState } from 'react';
import { productsApi, type Product } from '@/lib/api';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    productsApi.list().then((res) => {
      setLoading(false);
      if ('error' in res && res.error) setError(res.error);
      else if (res.data?.products) setProducts(res.data.products);
    });
  }, []);

  if (loading) return <p className="text-salon-stone">Loading products...</p>;
  if (error) return <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl">{error}</div>;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-salon-espresso mb-4">Products</h1>
      <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-salon-sand/60">
          <thead className="bg-salon-sand/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">SKU</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-salon-sand/60">
            {products.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 text-sm text-salon-espresso">{p.name}</td>
                <td className="px-4 py-3 text-sm text-salon-stone">{p.sku ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-salon-stone">{p.cost != null ? Number(p.cost).toFixed(2) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <p className="p-6 text-salon-stone text-center">No products found.</p>
        )}
      </div>
    </div>
  );
}
