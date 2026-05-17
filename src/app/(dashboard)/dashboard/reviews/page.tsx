'use client';

import { useEffect, useState } from 'react';
import { Star, Check, X, MessageSquare, Calendar, User, Clock, ShieldAlert } from 'lucide-react';
import { reviewsApi, type SalonReview } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

export default function ReviewsModerationPage() {
  const [reviews, setReviews] = useState<SalonReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [moderatingId, setModeratingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    const filter = statusFilter === 'all' ? undefined : statusFilter;
    const res = await reviewsApi.list({ status: filter });
    setLoading(false);
    if ('error' in res && res.error) {
      toastError(res.error);
    } else if (res.data) {
      const list = Array.isArray(res.data) ? res.data : (res.data as any).data ?? [];
      setReviews(list);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleModerate = async (id: number, action: 'approve' | 'reject') => {
    setModeratingId(id);
    try {
      const res = await reviewsApi.moderate(id, action);
      if ('error' in res && res.error) {
        toastError(res.error);
      } else {
        toastSuccess(`Review successfully ${action === 'approve' ? 'approved' : 'rejected'}.`);
        // Refresh or filter out local item if we are viewing a specific list
        if (statusFilter !== 'all') {
          setReviews((prev) => prev.filter((r) => r.id !== id));
        } else {
          load();
        }
      }
    } finally {
      setModeratingId(null);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 elite-shell">
      <DashboardPageHeader
        title="Reviews & Ratings"
        description="Moderate, approve, or reject customer ratings and reviews to build salon credibility."
        icon={<Star className="w-5 h-5 fill-amber-400 text-amber-400" />}
      />

      {/* Tabs Filter Bar */}
      <div className="elite-panel p-2 flex flex-wrap gap-1 bg-[var(--elite-card-2)] border border-[var(--elite-border)] rounded-xl max-w-md">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`flex-1 px-4 py-2 text-xs font-semibold rounded-lg capitalize transition-all duration-200 ${
              statusFilter === tab
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="elite-panel p-5 space-y-4">
              <div className="flex justify-between items-start">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-4 w-12 rounded" />
              </div>
              <Skeleton className="h-6 w-full rounded" />
              <Skeleton className="h-16 w-full rounded" />
              <div className="flex gap-2 justify-end pt-2">
                <Skeleton className="h-9 w-20 rounded" />
                <Skeleton className="h-9 w-20 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="elite-panel p-10 flex flex-col items-center justify-center text-center space-y-4 border border-dashed border-[var(--elite-border)] rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-zinc-500" />
          </div>
          <div>
            <h3 className="font-semibold text-base elite-title">No reviews found</h3>
            <p className="text-zinc-400 text-sm mt-1">
              There are no reviews under the "{statusFilter}" tab.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((rev) => {
            const hasStatusBadge = rev.status !== 'pending';
            const customerName = rev.customer?.name ?? 'Anonymous Customer';
            const contextText = rev.appointment
              ? `Appointment: ${formatDate(rev.appointment.starts_at)}`
              : rev.invoice
              ? `Walk-in Visit #${rev.invoice.invoice_number}`
              : 'POS Transaction';

            return (
              <div
                key={rev.id}
                className="elite-panel p-5 flex flex-col justify-between bg-[var(--elite-card)] border border-[var(--elite-border)] rounded-2xl hover:border-zinc-800 transition-all duration-200"
              >
                <div className="space-y-3">
                  {/* Top Bar: Stars & Status */}
                  <div className="flex justify-between items-start gap-2">
                    {renderStars(rev.rating)}
                    <span
                      className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded capitalize ${
                        rev.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : rev.status === 'rejected'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {rev.status}
                    </span>
                  </div>

                  {/* Customer and Context */}
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-zinc-100 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-zinc-500" />
                      {customerName}
                    </h4>
                    <p className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      {contextText}
                    </p>
                  </div>

                  {/* Comment */}
                  <div className="bg-[var(--elite-card-2)] border border-[var(--elite-border)] rounded-xl p-3.5 min-h-[70px]">
                    <p className="text-zinc-300 text-xs leading-relaxed italic">
                      "{rev.comment || 'No comment provided.'}"
                    </p>
                  </div>
                </div>

                {/* Bottom Bar: Action Buttons / Moderation Info */}
                <div className="pt-4 border-t border-[var(--elite-border)] mt-4">
                  {rev.status === 'pending' ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 rounded-lg border-rose-500/30 text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 h-9 transition-colors text-xs font-semibold"
                        onClick={() => handleModerate(rev.id, 'reject')}
                        disabled={moderatingId !== null}
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white h-9 transition-colors text-xs font-semibold"
                        onClick={() => handleModerate(rev.id, 'approve')}
                        disabled={moderatingId !== null}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Approve
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                      <Clock className="w-3.5 h-3.5 text-zinc-600" />
                      <span>
                        Moderated by {rev.approver?.name ?? 'Admin'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
