'use client';

import { useEffect, useState } from 'react';
import { franchiseApi, type FranchiseLocationKpi, type FranchiseSummary } from '@/lib/api';

export default function FranchisePage() {
  const [locations, setLocations] = useState<FranchiseLocationKpi[]>([]);
  const [summary, setSummary] = useState<FranchiseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    franchiseApi.kpis().then((res) => {
      setLoading(false);
      if ('error' in res && res.error) setError(res.error);
      else if (res.data) {
        setLocations(res.data.locations);
        setSummary(res.data.summary);
      }
    });
  }, []);

  if (loading) return <p className="text-salon-stone">Loading franchise KPIs...</p>;
  if (error) return <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl">{error}</div>;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-salon-espresso mb-4">Franchise Dashboard</h1>
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-5">
            <p className="text-sm text-salon-stone">Total Revenue</p>
            <p className="text-xl font-semibold text-salon-espresso mt-1">{summary.total_revenue.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-5">
            <p className="text-sm text-salon-stone">Locations</p>
            <p className="text-xl font-semibold text-salon-espresso mt-1">{summary.location_count}</p>
          </div>
          <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-5">
            <p className="text-sm text-salon-stone">Avg per Location</p>
            <p className="text-xl font-semibold text-salon-espresso mt-1">{summary.average_per_location.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-5">
            <p className="text-sm text-salon-stone">Underperforming</p>
            <p className="text-xl font-semibold text-salon-espresso mt-1">{summary.underperforming_count}</p>
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-salon-sand/60">
          <thead className="bg-salon-sand/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Location</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Revenue</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Transactions</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-salon-sand/60">
            {locations.map((loc) => (
              <tr key={loc.id}>
                <td className="px-4 py-3 text-sm text-salon-espresso">{loc.name}</td>
                <td className="px-4 py-3 text-sm text-salon-stone">{loc.revenue.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-salon-stone">{loc.transaction_count}</td>
                <td className="px-4 py-3 text-sm text-salon-stone">{loc.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {locations.length === 0 && (
          <p className="p-6 text-salon-stone text-center">No location data. Add locations and complete transactions to see KPIs.</p>
        )}
      </div>
    </div>
  );
}
