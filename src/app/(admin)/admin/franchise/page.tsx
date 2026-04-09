'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { adminReportsApi } from '@/lib/api';
import { AlertTriangle, Building2, RefreshCw, TrendingUp } from 'lucide-react';
import { Spinner } from '@/components/ui';

interface FranchiseRow {
  tenant_id: string;
  tenant_name: string;
  plan: string;
  status: string;
  revenue: number;
  booking_count: number;
  avg_ticket: number;
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminFranchiseKpisPage() {
  const { user } = useAuth();
  const [from, setFrom] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows]     = useState<FranchiseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    adminReportsApi.franchiseKpis(from, to).then((r) => {
      setLoading(false);
      if (r.error) setError(r.error);
      else setRows(((r.data as { rows?: FranchiseRow[] })?.rows) ?? []);
    });
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totalRevenue = rows.reduce((s, r) => s + (r.revenue ?? 0), 0);
  const totalBookings = rows.reduce((s, r) => s + (r.booking_count ?? 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-semibold text-salon-espresso">Franchise KPIs</h1>
        <p className="text-salon-stone text-sm mt-1">
          Platform-wide tenant performance: revenue, bookings, and avg ticket per salon.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-salon-sand/40 shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1 text-xs font-medium text-salon-stone">
          From
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            type="date"
            className="border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm text-salon-espresso focus:outline-none focus:ring-2 focus:ring-salon-gold/30"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-salon-stone">
          To
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            type="date"
            className="border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm text-salon-espresso focus:outline-none focus:ring-2 focus:ring-salon-gold/30"
          />
        </label>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-salon-gold text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-colors disabled:opacity-50 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
        <div className="ml-auto text-xs text-salon-stone">
          Logged in as <span className="font-medium text-salon-espresso">{user?.email}</span> (Admin)
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-card rounded-2xl border border-salon-sand/40 shadow-sm p-12 text-center">
          <Building2 className="w-10 h-10 text-salon-sand mx-auto mb-3" />
          <p className="text-salon-stone text-sm">No tenant data for the selected period.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-salon-sand/40 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-salon-gold" />
              <h2 className="text-sm font-semibold text-salon-espresso">All Tenants</h2>
            </div>
            <span className="text-xs text-salon-stone">{rows.length} salon{rows.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-salon-sand/40 text-sm">
              <thead className="bg-salon-sand/20">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">
                    Salon
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-salon-stone uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-salon-stone uppercase tracking-wider">
                    Bookings
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-salon-stone uppercase tracking-wider">
                    Avg Ticket
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.tenant_id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium text-salon-espresso">{r.tenant_name}</td>
                    <td className="px-4 py-3 text-salon-stone capitalize">{r.plan ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-medium capitalize ${
                          r.status === 'active'
                            ? 'bg-green-50 text-green-700 border border-green-100'
                            : r.status === 'suspended'
                            ? 'bg-red-50 text-red-600 border border-red-100'
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}
                      >
                        {r.status ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-salon-espresso">
                      ${fmt(r.revenue ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-salon-stone">
                      {r.booking_count ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right text-salon-stone">
                      ${fmt(r.avg_ticket ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-salon-sand/20 border-t border-salon-sand/40">
                <tr>
                  <td colSpan={3} className="px-5 py-3 text-xs font-semibold text-salon-stone uppercase tracking-wider">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-salon-espresso">
                    ${fmt(totalRevenue)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-salon-espresso">
                    {totalBookings}
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
