'use client';

import { useEffect, useState } from 'react';
import { locationsApi, type Location } from '@/lib/api';

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    locationsApi.list().then((res) => {
      setLoading(false);
      if ('error' in res && res.error) setError(res.error);
      else if (res.data?.locations) setLocations(res.data.locations);
    });
  }, []);

  if (loading) return <p className="text-salon-stone">Loading locations...</p>;
  if (error) return <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl">{error}</div>;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-salon-espresso mb-4">Locations</h1>
      <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-salon-sand/60">
          <thead className="bg-salon-sand/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Address</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-salon-sand/60">
            {locations.map((loc) => (
              <tr key={loc.id}>
                <td className="px-4 py-3 text-sm text-salon-espresso">{loc.name}</td>
                <td className="px-4 py-3 text-sm text-salon-stone">{loc.address ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-salon-stone">{loc.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {locations.length === 0 && (
          <p className="p-6 text-salon-stone text-center">No locations found.</p>
        )}
      </div>
    </div>
  );
}
