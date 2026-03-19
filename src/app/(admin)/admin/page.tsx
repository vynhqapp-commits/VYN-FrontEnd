'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { adminReportsApi, tenantsApi, type Tenant } from '@/lib/api';

const icon = {
  tenants: (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  arrow: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  revenue: (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .843-3 1.882C9 10.922 10.343 12 12 12s3 .843 3 1.882C15 14.922 13.657 16 12 16m0-8V6m0 10v-2m8-4a8 8 0 11-16 0 8 8 0 0116 0z" />
    </svg>
  ),
  activity: (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 12h3l2 7 4-14 2 7h3" />
    </svg>
  ),
};

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [kpis, setKpis] = useState<any>(null);

  useEffect(() => {
    tenantsApi.list().then(({ data }) => {
      if (data?.tenants) setTenants(data.tenants);
    });
    adminReportsApi.kpis().then((r) => {
      if (!r.error) setKpis(r.data);
    });
  }, []);

  const tenantCount = tenants.length;
  const activeCount = tenants.filter((t) => t.status === 'active').length;
  const suspendedCount = tenants.filter((t) => t.status === 'suspended').length;

  const totalTenants = (kpis?.total_tenants ?? tenantCount) as number;
  const kpiActive = (kpis?.active_tenants ?? activeCount) as number;
  const kpiSuspended = (kpis?.suspended_tenants ?? suspendedCount) as number;
  const totalUsers = (kpis?.total_users ?? null) as number | null;
  const tenantsByPlan: Array<{ plan: string; total: number }> = Array.isArray(kpis?.tenants_by_plan)
    ? kpis.tenants_by_plan
    : [];

  // Fake data for a small sparkline-style bar chart, scaled by tenant count so it feels alive.
  const chartValues = useMemo(() => {
    const base = [8, 12, 9, 14, 11, 16, 13];
    const factor = tenantCount > 0 ? Math.min(1 + tenantCount / 20, 2) : 1;
    return base.map((v) => Math.round(v * factor));
  }, [tenantCount]);

  const maxChart = Math.max(...chartValues, 1);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome + headline cards row */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm p-6 flex flex-col justify-center">
          <p className="text-sm text-salon-gold font-semibold uppercase tracking-[0.2em] mb-2">
            Platform overview
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-salon-espresso">
            Welcome back{user?.fullName ? `, ${user.fullName}` : ''}
          </h1>
          <p className="text-salon-stone text-sm mt-3 max-w-md">
            Monitor tenants, health, and high-level activity for your salon network in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-salon-stone uppercase tracking-wide">
                Tenants
              </span>
              <span className="w-8 h-8 rounded-full bg-salon-gold/15 text-salon-gold flex items-center justify-center">
                {icon.tenants}
              </span>
            </div>
            <p className="font-display text-2xl font-semibold text-salon-espresso mt-1">
              {totalTenants || '—'}
            </p>
            <p className="text-[11px] text-salon-stone">
              {kpiActive} active · {kpiSuspended} suspended
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-salon-stone uppercase tracking-wide">
                Platform users
              </span>
              <span className="w-8 h-8 rounded-full bg-salon-sand/40 text-salon-espresso flex items-center justify-center">
                {icon.revenue}
              </span>
            </div>
            <p className="font-display text-2xl font-semibold text-salon-espresso mt-1">
              {typeof totalUsers === 'number' ? totalUsers.toLocaleString() : '—'}
            </p>
            <p className="text-[11px] text-salon-stone">Accounts across all tenants</p>
          </div>
          <div className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-salon-stone uppercase tracking-wide">
                Activity
              </span>
              <span className="w-8 h-8 rounded-full bg-salon-sage/20 text-salon-espresso flex items-center justify-center">
                {icon.activity}
              </span>
            </div>
            <div className="mt-1 flex items-end gap-1 h-16">
              {chartValues.map((v, idx) => (
                <div
                  // eslint-disable-next-line react/no-array-index-key
                  key={idx}
                  className="flex-1 rounded-full bg-salon-sand/60"
                  style={{ height: `${(v / maxChart) * 100}%` }}
                >
                  <div className="w-full h-full rounded-full bg-salon-gold/70" />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-salon-stone mt-1">Last 7 days · synthetic graph</p>
          </div>
        </div>
      </div>

      {/* Plans breakdown */}
      {tenantsByPlan.length > 0 && (
        <div className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-salon-espresso">Tenants by plan</h2>
            <Link href="/admin/subscriptions" className="text-sm text-salon-gold hover:text-salon-goldLight">
              Manage plans
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {tenantsByPlan.map((p) => (
              <div key={p.plan} className="rounded-xl border border-salon-sand/40 bg-salon-cream/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-salon-stone">{p.plan}</p>
                <p className="font-display text-2xl font-semibold text-salon-espresso mt-1">{p.total}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Second row: Quick actions + notes */} 
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)] gap-6">
        <div>
          <h2 className="font-display text-lg font-semibold text-salon-espresso mb-3">Quick actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/admin/tenants"
              className="group flex items-center gap-4 p-5 bg-white rounded-xl border border-salon-sand/40 shadow-sm hover:border-salon-gold/50 hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-salon-gold/10 flex items-center justify-center text-salon-gold group-hover:bg-salon-gold/20 transition-colors">
                {icon.tenants}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-salon-espresso">Manage tenants</h3>
                <p className="text-salon-stone text-sm mt-0.5">
                  Create and manage salon tenants (branches).
                </p>
              </div>
              <span className="text-salon-gold opacity-0 group-hover:opacity-100 transition-opacity">
                {icon.arrow}
              </span>
            </Link>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 p-5 bg-white rounded-xl border border-salon-sand/40 shadow-sm hover:border-salon-gold/50 hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-salon-sand/30 flex items-center justify-center text-salon-espresso group-hover:bg-salon-sand/50 transition-colors">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-salon-espresso">View public site</h3>
                <p className="text-salon-stone text-sm mt-0.5">
                  Open the customer-facing site in a new tab.
                </p>
              </div>
              <span className="text-salon-gold opacity-0 group-hover:opacity-100 transition-opacity">
                {icon.arrow}
              </span>
            </a>
            <Link
              href="/admin/reports"
              className="group flex items-center gap-4 p-5 bg-white rounded-xl border border-salon-sand/40 shadow-sm hover:border-salon-gold/50 hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-salon-sage/20 flex items-center justify-center text-salon-espresso group-hover:bg-salon-sage/30 transition-colors">
                {icon.activity}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-salon-espresso">View reports</h3>
                <p className="text-salon-stone text-sm mt-0.5">
                  Global financial and franchise dashboards.
                </p>
              </div>
              <span className="text-salon-gold opacity-0 group-hover:opacity-100 transition-opacity">
                {icon.arrow}
              </span>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm p-5 flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold text-salon-espresso">Admin snapshot</h2>
          <p className="text-salon-stone text-sm">
            Logged in as <span className="font-medium text-salon-espresso">{user?.email}</span> (Admin).
          </p>
          <ul className="text-salon-stone text-xs space-y-1.5">
            <li>• Use <span className="font-medium text-salon-espresso">Tenants</span> to manage all salons.</li>
            <li>• Use the left navigation to move between admin sections.</li>
            <li>• All numbers on this dashboard are live, except where marked as synthetic.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
