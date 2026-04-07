'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { locationsApi, type Location } from '@/lib/api';
import { Combobox } from '@/components/ui/combobox';
import { Skeleton } from '@/components/ui/skeleton';
import SaleCheckoutForm from '@/components/pos/SaleCheckoutForm';

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
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)]">
          <Skeleton className="h-[520px] w-full rounded-xl" />
          <Skeleton className="h-[520px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-salon-espresso">POS checkout</h1>
          <p className="text-salon-stone text-sm mt-1">
            Create a sale with multiple payments. Any remaining amount will be recorded as client debt.
          </p>
          <Link
            href="/dashboard/transactions"
            className="inline-flex mt-2 text-sm font-medium text-salon-gold hover:text-salon-goldLight transition-colors"
          >
            ← Back to POS / Sales
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="w-full sm:w-56">
            <p className="text-xs font-semibold text-salon-stone mb-1">Location</p>
            <Combobox
              value={locationId}
              onValueChange={setLocationId}
              options={locationOptions}
              placeholder="Select location"
              searchPlaceholder="Search locations..."
            />
          </div>
        </div>
      </div>

      <SaleCheckoutForm locationId={locationId} />
    </div>
  );
}

