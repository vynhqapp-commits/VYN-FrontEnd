'use client';

import { useEffect, useState } from 'react';
import { servicesApi, type Service } from '@/lib/api';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    servicesApi.list().then((res) => {
      setLoading(false);
      if ('error' in res && res.error) setError(res.error);
      else if (res.data?.services) setServices(res.data.services);
    });
  }, []);

  if (loading) return <p className="text-salon-stone">Loading services...</p>;
  if (error) return <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl">{error}</div>;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-salon-espresso mb-4">Services</h1>
      <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-salon-sand/60">
          <thead className="bg-salon-sand/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Duration</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Price</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-salon-sand/60">
            {services.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 text-sm text-salon-espresso">{s.name}</td>
                <td className="px-4 py-3 text-sm text-salon-stone">{s.duration_minutes} min</td>
                <td className="px-4 py-3 text-sm text-salon-stone">{Number(s.price).toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-salon-stone">{s.is_active ? 'Active' : 'Inactive'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {services.length === 0 && (
          <p className="p-6 text-salon-stone text-center">No services found.</p>
        )}
      </div>
    </div>
  );
}
