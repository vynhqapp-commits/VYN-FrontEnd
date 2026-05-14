"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Package, CalendarDays, Store, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { customerApi } from "@/lib/api";
import { Spinner } from "@/components/ui";

type CustomerPackage = {
  id: string;
  name: string;
  type?: 'package' | 'membership';
  total_services: number;
  remaining_services: number;
  expires_at: string | null;
  status: string;
  membership_id: string | null;
  package_template_id: string | null;
  covered_services: Array<{ 
    id: string; 
    name: string;
    initial_sessions?: number;
    remaining_sessions?: number;
  }>;
  tenant_id: string;
  salon_name: string;
  salon_slug: string | null;
  renewal_date?: string | null;
  plan_is_active?: boolean;
  created_at?: string;
};

function MyPackagesContent() {
  const [packages, setPackages] = useState<CustomerPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams.get('tab') as 'packages' | 'memberships') || 'packages';
  const [activeTab, setActiveTab] = useState<'packages' | 'memberships'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    customerApi.myPackages().then((res) => {
      setLoading(false);
      if (!("error" in res) && res.data?.packages) {
        setPackages(res.data.packages as CustomerPackage[]);
      }
    });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const filteredItems = packages.filter(p => p.type === (activeTab === 'packages' ? 'package' : 'membership'));
  
  // Sort: 
  // 1. Active plans first (plan_is_active !== false)
  // 2. Then by created_at DESC (latest first)
  const sortedFilteredItems = [...filteredItems].sort((a, b) => {
    const aActive = a.plan_is_active !== false;
    const bActive = b.plan_is_active !== false;
    
    if (aActive !== bActive) {
      return aActive ? -1 : 1;
    }
    
    // If both have same active status, sort by created_at (latest first)
    const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bDate - aDate;
  });

  const activeItems = sortedFilteredItems.filter((p) => p.status === "active" && (Number(p.remaining_services) > 0 || p.type === 'membership'));
  const inactiveItems = sortedFilteredItems.filter((p) => p.status !== "active" || (Number(p.remaining_services) === 0 && p.type !== 'membership'));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            {activeTab === 'packages' ? 'My Packages' : 'My Memberships'}
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {activeTab === 'packages' 
              ? 'Track your prepaid service bundles and remaining sessions across all salons.'
              : 'Manage your active memberships and track remaining sessions for covered services.'}
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          <button
            onClick={() => setActiveTab('packages')}
            className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'packages'
                ? 'bg-white text-orange-600 shadow-sm dark:bg-gray-900 dark:text-orange-500'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            Packages
          </button>
          <button
            onClick={() => setActiveTab('memberships')}
            className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'memberships'
                ? 'bg-white text-orange-600 shadow-sm dark:bg-gray-900 dark:text-orange-500'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            Memberships
          </button>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <Package className="size-6 text-gray-400" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">
            No {activeTab} found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            You haven't purchased any {activeTab === 'packages' ? 'service packages' : 'membership plans'} yet.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            Explore Salons
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {activeItems.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Active {activeTab === 'packages' ? 'Packages' : 'Memberships'}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeItems.map((pkg) => (
                  <PackageCard key={`${pkg.type}-${pkg.id}`} pkg={pkg} />
                ))}
              </div>
            </div>
          )}

          {inactiveItems.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Past & Exhausted {activeTab === 'packages' ? 'Packages' : 'Memberships'}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {inactiveItems.map((pkg) => (
                  <PackageCard key={`${pkg.type}-${pkg.id}`} pkg={pkg} isInactive />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PackageCard({ pkg, isInactive = false }: { pkg: CustomerPackage; isInactive?: boolean }) {
  const isExhausted = pkg.remaining_services === 0;
  const isExpired = pkg.expires_at && new Date(pkg.expires_at) < new Date();

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-all ${
        isInactive
          ? "border-gray-200 bg-gray-50 opacity-75 dark:border-gray-800 dark:bg-gray-900/50"
          : "border-gray-200 bg-white shadow-sm hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:bg-[#0a0a0a] dark:hover:border-gray-700"
      }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className={`font-bold ${isInactive ? "text-gray-600 dark:text-gray-400" : "text-gray-900 dark:text-white"}`}>
              {pkg.name}
            </h3>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-orange-600 dark:text-orange-500">
                {pkg.type === 'membership' ? 'Membership' : 'Package'}
              </span>
              {pkg.salon_slug ? (
                <Link
                  href={`/salons/${pkg.salon_slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-orange-600 dark:text-gray-400"
                >
                  <Store className="size-3" />
                  {pkg.salon_name}
                </Link>
              ) : (
                <p className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
                  <Store className="size-3" />
                  {pkg.salon_name}
                </p>
              )}
            </div>
          </div>
          {pkg.plan_is_active === false ? (
            <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/20">
              Deactivated
            </span>
          ) : !isInactive && (
            <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/20">
              Active
            </span>
          )}
          {isInactive && isExhausted && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/20 dark:bg-gray-800 dark:text-gray-400">
              Exhausted
            </span>
          )}
          {isInactive && !isExhausted && isExpired && (
            <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10 dark:bg-red-400/10 dark:text-red-400">
              Expired
            </span>
          )}
        </div>

        {/* Only show the global remaining indicator if there's a total service count to show,
            or if it's not a granular membership. */}
        {!(pkg.type === 'membership' && pkg.total_services === 0 && pkg.covered_services.length > 0) && (
          <div className="mt-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Remaining
              </p>
              <p className={`text-2xl font-black ${isInactive ? "text-gray-600 dark:text-gray-400" : "text-gray-900 dark:text-white"}`}>
                {pkg.remaining_services} <span className="text-sm font-medium text-gray-500">/ {pkg.total_services}</span>
              </p>
            </div>

            <div className="h-12 w-12 shrink-0">
              {/* Simple circular progress indicator */}
              <svg className="h-full w-full" viewBox="0 0 36 36">
                <path
                  className="text-gray-100 dark:text-gray-800"
                  strokeWidth="3"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={isInactive ? "text-gray-400 dark:text-gray-600" : "text-orange-500"}
                  strokeDasharray={`${(pkg.remaining_services / (pkg.total_services || 1)) * 100}, 100`}
                  strokeWidth="3"
                  strokeDashoffset="0"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-4 rounded-xl bg-gray-50 p-4 dark:bg-white/5">
          <div className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-gray-400" />
              <span className="font-bold text-[11px] uppercase tracking-wider text-gray-900 dark:text-white">Service Usage</span>
            </div>
            
            <div className="space-y-3">
              {pkg.covered_services.length > 0 ? (
                pkg.covered_services.map((s) => {
                  const initial = s.initial_sessions || 1;
                  const remaining = s.remaining_sessions !== undefined ? s.remaining_sessions : pkg.remaining_services;
                  const taken = initial - remaining;
                  const percent = Math.min(100, Math.max(0, (taken / initial) * 100));

                  return (
                    <div key={s.id} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-gray-700 dark:text-gray-200">{s.name}</span>
                        <span className="font-black text-orange-600 dark:text-orange-400">{taken} / {initial} used</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                        <div 
                          className="h-full bg-orange-500 transition-all duration-500" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-gray-500 italic">All services included</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 border-t border-gray-200 dark:border-gray-800 pt-3">
            {isExpired ? (
              <AlertCircle className="size-4 shrink-0 text-red-500" />
            ) : (
              <Clock className="size-4 shrink-0 text-gray-400" />
            )}
            <span className="font-medium text-gray-900 dark:text-white">{pkg.type === 'membership' ? 'Renewal:' : 'Validity:'}</span>
            <span className={isExpired ? "text-red-600 dark:text-red-400" : ""}>
              {pkg.type === 'membership' ? (pkg.renewal_date ? new Date(pkg.renewal_date).toLocaleDateString() : 'N/A') : (pkg.expires_at ? new Date(pkg.expires_at).toLocaleDateString() : "No Expiry")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
export default function MyPackagesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-12"><Spinner size="lg" /></div>}>
      <MyPackagesContent />
    </Suspense>
  );
}
