'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { customerApi } from '@/lib/api';
import type { Appointment } from '@/lib/api';

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    customerApi.myBookings().then((res) => {
      setLoading(false);
      if ('error' in res) setError(res.error ?? null);
      else if (res.data?.bookings) setBookings(res.data.bookings);
    });
  }, []);

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this booking?')) return;
    const { error: err } = await customerApi.cancelBooking(id);
    if (err) setError(err);
    else setBookings((prev) => prev.filter((b) => b.id !== id));
  };

  if (loading) return <p className="text-salon-stone">Loading your bookings...</p>;
  if (error) return <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl">{error}</div>;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-salon-espresso mb-2">My Bookings</h1>
      <p className="text-salon-stone mb-6">View and manage your appointments. Booking & review access.</p>
      <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm overflow-hidden">
        {bookings.length === 0 ? (
          <div className="p-8 text-center text-salon-stone">
            <p>You have no bookings yet.</p>
            <Link href="/book" className="mt-3 inline-block text-salon-gold font-medium hover:text-salon-goldLight transition-colors">Book a visit</Link>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-salon-sand/60">
            <thead className="bg-salon-sand/30">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Service</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Date & time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Staff</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-salon-sand/60">
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 text-sm text-salon-espresso">{(b as { Service?: { name?: string } }).Service?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-salon-stone">{(b as { Location?: { name?: string } }).Location?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-salon-stone">
                    {b.start_at ? new Date(b.start_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-salon-stone">{(b as { Staff?: { full_name?: string } }).Staff?.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-salon-stone capitalize">{b.status}</td>
                  <td className="px-4 py-3">
                    {b.status === 'scheduled' && (
                      <button
                        onClick={() => handleCancel(b.id)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-4">
        <Link href="/book" className="text-salon-gold font-medium hover:text-salon-goldLight transition-colors">Book a new appointment</Link>
      </p>
    </div>
  );
}
