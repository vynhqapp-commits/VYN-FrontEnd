'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  AlertTriangle,
  BarChart2,
  Building2,
  CalendarDays,
  CheckCircle2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { franchiseApi, settingsApi, type FranchiseLocationKpi, type FranchiseSummary } from '@/lib/api';
import { Spinner } from '@/components/ui';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

function pct(n: number) {
  return `${n.toFixed(1)}%`;
}

function startOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ── sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: 'default' | 'warning' | 'success';
}) {
  const bg =
    accent === 'warning'
      ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30'
      : accent === 'success'
      ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
      : 'border-border bg-card';
  const textColor =
    accent === 'warning'
      ? 'text-red-800 dark:text-red-200'
      : accent === 'success'
      ? 'text-emerald-800 dark:text-emerald-200'
      : 'text-foreground';

  return (
    <div className={`rounded-2xl border shadow-sm p-5 flex items-start gap-4 ${bg}`}>
      <div className={`mt-0.5 ${textColor}`}>{icon}</div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={`text-2xl font-semibold mt-0.5 ${textColor}`}>{value}</p>
      </div>
    </div>
  );
}

function UtilizationBar({ value }: { value: number }) {
  const color =
    value >= 80 ? 'bg-green-500' : value >= 50 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="w-10 text-right text-xs text-muted-foreground">{pct(value)}</span>
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function FranchisePage() {
  const [from, setFrom] = useState(startOfMonth);
  const [to, setTo]     = useState(today);
  const [currency, setCurrency] = useState('USD');
  const [locations, setLocations] = useState<FranchiseLocationKpi[]>([]);
  const [summary, setSummary]     = useState<FranchiseSummary | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    franchiseApi.kpis({ from, to }).then((res) => {
      setLoading(false);
      if ('error' in res && res.error) {
        setError(res.error);
      } else if (res.data) {
        setLocations(res.data.locations ?? []);
        setSummary(res.data.summary ?? null);
      }
    });
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const totalBookings = locations.reduce((s, l) => s + (l.booking_volume ?? 0), 0);
  const money = useMemo(() => (n: number) => formatMoney(n, currency), [currency]);

  useEffect(() => {
    settingsApi.get().then((r) => {
      if (!('error' in r) && r.data?.salon?.currency) {
        const c = String(r.data.salon.currency).trim().toUpperCase().slice(0, 3);
        if (c) setCurrency(c);
      }
    });
  }, []);

  return (
    <div className="space-y-6 elite-shell">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <DashboardPageHeader
          title="Franchise Dashboard"
          description="Cross-location performance comparison and KPI monitoring."
          icon={<Building2 className="w-5 h-5" />}
        />

        {/* Date range filter */}
        <div className="flex flex-wrap items-end gap-2 elite-panel px-4 py-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="elite-input rounded-xl px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="elite-input rounded-xl px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* ── KPI Summary Cards ── */}
          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Total Revenue"
                value={money(summary.total_revenue)}
                icon={<TrendingUp className="w-5 h-5" />}
                accent="success"
              />
              <KpiCard
                label="Total Bookings"
                value={totalBookings}
                icon={<CalendarDays className="w-5 h-5" />}
              />
              <KpiCard
                label="Active Branches"
                value={summary.location_count}
                icon={<Building2 className="w-5 h-5" />}
              />
              <KpiCard
                label="Underperforming"
                value={summary.underperforming_count}
                icon={<TrendingDown className="w-5 h-5" />}
                accent={summary.underperforming_count > 0 ? 'warning' : 'default'}
              />
            </div>
          )}

          {/* ── Underperforming Alert Banner ── */}
          {summary && summary.underperforming_count > 0 && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 mb-1">
                  {summary.underperforming_count} branch{summary.underperforming_count > 1 ? 'es are' : ' is'} underperforming
                </p>
                <p className="text-amber-700 text-xs">
                  Branches with revenue below 70% of the average ({money(summary.average_per_location)}):&nbsp;
                  <span className="font-medium">
                    {summary.underperforming.map((u) => u.name).join(', ')}
                  </span>
                </p>
              </div>
            </div>
          )}

          {locations.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
              <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No branch data for the selected period. Add branches and complete transactions to see KPIs.
              </p>
            </div>
          ) : (
            <>
              {/* ── Revenue Bar Chart ── */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Revenue by Branch</h2>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={locations.map((l) => ({ name: l.name, revenue: l.revenue }))}
                    margin={{ top: 4, right: 4, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3ede4" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#8e7b6b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#8e7b6b' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => money(Number(v))}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #e8ddd4', fontSize: 12 }}
                      formatter={(v: number) => [money(Number(v)), 'Revenue']}
                    />
                    <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={56}>
                      {locations.map((l) => (
                        <Cell
                          key={l.id}
                          fill={l.is_underperforming ? '#f87171' : '#c9a96e'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Red bars indicate underperforming branches (below 70% of average).
                </p>
              </div>

              {/* ── Branch Comparison Table ── */}
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <h2 className="text-sm font-semibold text-foreground">Branch Comparison</h2>
                  <span className="text-xs text-muted-foreground">
                    {locations.length} branch{locations.length !== 1 ? 'es' : ''}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Branch
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Revenue
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Bookings
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Completed
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Avg Ticket
                        </th>
                        <th className="min-w-[140px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Utilization
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {locations.map((loc) => (
                        <tr
                          key={loc.id}
                          className={
                            loc.is_underperforming
                              ? 'bg-red-500/10 dark:bg-red-950/25'
                              : 'transition-colors hover:bg-muted/30'
                          }
                        >
                          {/* Branch name + flag */}
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full shrink-0 ${loc.status === 'active' ? 'bg-green-400' : 'bg-gray-300'}`} />
                              <span className="font-medium text-foreground">{loc.name}</span>
                              {loc.is_underperforming && (
                                <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                                  Low
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3 text-right font-semibold text-foreground">
                            {money(loc.revenue)}
                          </td>

                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {loc.booking_volume ?? 0}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <span className="flex items-center justify-end gap-1 text-green-700">
                              <CheckCircle2 className="w-3 h-3" />
                              {loc.completed_appointments ?? 0}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {money(loc.avg_ticket ?? 0)}
                          </td>

                          <td className="px-4 py-3">
                            <UtilizationBar value={loc.utilization_rate ?? 0} />
                          </td>

                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-medium capitalize ${
                                loc.status === 'active'
                                  ? 'bg-green-50 text-green-700 border border-green-100'
                                  : 'bg-gray-100 text-gray-500 border border-gray-200'
                              }`}
                            >
                              {loc.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>

                    {/* Footer with totals */}
                    {summary && (
                      <tfoot className="border-t border-border bg-muted/40">
                        <tr>
                          <td className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Total / Average
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-foreground">
                            {money(summary.total_revenue)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-foreground">
                            {totalBookings}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-green-700 dark:text-green-400">
                            {locations.reduce((s, l) => s + (l.completed_appointments ?? 0), 0)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-foreground">
                            {money(summary.average_per_location)}
                          </td>
                          <td className="px-4 py-3" />
                          <td className="px-4 py-3" />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
