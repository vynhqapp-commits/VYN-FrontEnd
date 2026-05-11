'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { locationsApi, type Location } from '@/lib/api';
import { Combobox } from '@/components/ui/combobox';
import { Skeleton } from '@/components/ui/skeleton';
import SaleCheckoutForm from '@/components/pos/SaleCheckoutForm';
import FlowTopbar from '@/components/layout/FlowTopbar';

export default function PosPage() {
  const [locations, setLocations] = useState<Location[]>([]);

  const [locationId, setLocationId] = useState('');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    locationsApi.list().then((locRes) => {
      if (locRes.data?.locations) {
        setLocations(locRes.data.locations);
        if (locRes.data.locations[0]) setLocationId(locRes.data.locations[0].id);
      }
      setLoading(false);
    });
  }, []);

  const locationOptions = useMemo(
    () =>
      locations.map((l) => ({
        value: String(l.id),
        label: String(l.name ?? 'Unnamed location'),
      })),
    [locations],
  );


  if (loading) {
    return (
      <div className="space-y-4 elite-shell min-h-[calc(100vh-120px)] -mx-4 sm:-mx-6 px-4 sm:px-6 py-4">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)]">
          <Skeleton className="h-[520px] w-full rounded-xl" />
          <Skeleton className="h-[520px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="elite-shell min-h-[calc(100vh-120px)] -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 space-y-6">
      <FlowTopbar />
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2 border-b border-[var(--elite-border)]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-black tracking-tight elite-title">Point of Sale</h1>
            <span className="px-2 py-0.5 rounded-full bg-[var(--elite-orange-dim)] text-[var(--elite-orange)] text-[10px] font-bold uppercase tracking-wider">Live Terminal</span>
          </div>
          <p className="elite-subtle text-sm max-w-xl">
            Complete transactions, manage client debt, and process payments across services and products.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <Link
            href="/dashboard/transactions"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--elite-muted)] hover:text-[var(--elite-orange)] transition-colors"
          >
            <span className="text-lg">←</span> View History
          </Link>
          <div className="w-full sm:w-64 bg-[var(--elite-card)] rounded-xl border border-[var(--elite-border)] p-1 flex items-center gap-2 shadow-sm">
            <span className="pl-3 text-[10px] font-bold uppercase tracking-wider elite-subtle whitespace-nowrap">Location:</span>
            <div className="flex-1">
              <Combobox
                value={locationId}
                onValueChange={setLocationId}
                options={locationOptions}
                placeholder="Select location"
                searchPlaceholder="Search..."
                className="border-none shadow-none focus-visible:ring-0"
              />
            </div>
          </div>
        </div>
      </div>

      <main className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <SaleCheckoutForm locationId={locationId} />
      </main>
    </div>
  );
}

