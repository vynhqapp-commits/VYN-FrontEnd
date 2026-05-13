"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, CalendarDays, Store, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { customerApi } from "@/lib/api";
import { Spinner } from "@/components/ui";

type CustomerPackage = {
  id: string;
  name: string;
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
};

export default function MyPackagesPage() {
  const [packages, setPackages] = useState<CustomerPackage[]>([]);
  const [loading, setLoading] = useState(true);

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

  const activePackages = packages.filter((p) => p.status === "active" && p.remaining_services > 0);
  const inactivePackages = packages.filter((p) => p.status !== "active" || p.remaining_services === 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white sm:text-3xl">
          My Packages
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Track your prepaid service bundles and remaining sessions across all salons.
        </p>
      </div>

      {packages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <Package className="size-6 text-gray-400" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">No packages found</h3>
          <p className="mt-1 text-sm text-gray-500">You haven't purchased any service packages yet.</p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            Explore Salons
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {activePackages.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Active Packages</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activePackages.map((pkg) => (
                  <PackageCard key={pkg.id} pkg={pkg} />
                ))}
              </div>
            </div>
          )}

          {inactivePackages.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Past & Exhausted Packages</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {inactivePackages.map((pkg) => (
                  <PackageCard key={pkg.id} pkg={pkg} isInactive />
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
            {pkg.salon_slug ? (
              <Link
                href={`/salons/${pkg.salon_slug}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-700 hover:underline dark:text-orange-500"
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
          {!isInactive && (
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
                strokeDasharray={`${(pkg.remaining_services / pkg.total_services) * 100}, 100`}
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
            <span className="font-medium text-gray-900 dark:text-white">Validity:</span>
            <span className={isExpired ? "text-red-600 dark:text-red-400" : ""}>
              {pkg.expires_at ? new Date(pkg.expires_at).toLocaleDateString() : "No Expiry"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
