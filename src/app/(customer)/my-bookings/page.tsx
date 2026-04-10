"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Clock, MapPin, User, Plus, AlertCircle } from "lucide-react";
import { customerApi, publicApi } from "@/lib/api";
import type { Appointment, FavoriteSalon } from "@/lib/api";
import { Spinner } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useLocale } from "@/components/LocaleProvider";
import { getPublicT, type PublicLocale, type PublicI18nKey } from "@/lib/i18n-public";

const LOCALE_BCP47: Record<PublicLocale, string> = {
  en: "en-US",
  ar: "ar-u-nu-latn",
  fr: "fr-FR",
};

type BookingRow = Appointment;

function fmt(iso: string, locale?: string) {
  const local = iso.replace(/Z$/, "");
  return new Date(local).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

function localDate(iso: string): Date {
  return new Date(iso.replace(/Z$/, ""));
}

function toDatetimeLocal(iso: string): string {
  const d = localDate(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function getRescheduleBranchServiceIds(b: BookingRow): { branchId: string; serviceId: string } | null {
  const branchId = b.branch_id ?? b.branch?.id ?? b.location_id;
  const serviceId = b.services?.[0]?.service?.id ?? b.service_id ?? b.Service?.id;
  if (!branchId || !serviceId) return null;
  return { branchId: String(branchId), serviceId: String(serviceId) };
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-700 border border-blue-100",
  confirmed: "bg-green-50 text-green-700 border border-green-100",
  completed: "bg-gray-100 text-gray-600 border border-gray-200",
  cancelled: "bg-red-50 text-red-600 border border-red-100",
  pending: "bg-amber-50 text-amber-700 border border-amber-100",
  no_show: "bg-orange-50 text-orange-700 border border-orange-100",
};

const CANCELLABLE = ["scheduled", "confirmed", "pending"];
const RESCHEDULABLE = ["scheduled", "confirmed", "pending"];
const QUICK_REBOOK_STATUSES = ["completed", "cancelled", "no_show"];

const POLICY_WINDOW_HOURS = 24;

type AvailabilitySlot = { start: string; end: string; staff_id: string };

export default function MyBookingsPage() {
  const { locale } = useLocale();
  const t = getPublicT(locale);

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlots, setRescheduleSlots] = useState<AvailabilitySlot[]>([]);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState<AvailabilitySlot | null>(null);
  const [rescheduleManualAt, setRescheduleManualAt] = useState("");
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReviewId, setSubmittingReviewId] = useState<string | null>(null);
  const [quickRebookId, setQuickRebookId] = useState<string | null>(null);
  const [quickRebookStartAt, setQuickRebookStartAt] = useState("");
  const [quickRebookingId, setQuickRebookingId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoriteSalon[]>([]);
  const [favoriteSalonIds, setFavoriteSalonIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    customerApi.myBookings().then((res) => {
      setLoading(false);
      if ("error" in res) {
        toast.error(res.error ?? t("failedToLoadBookings"));
      } else if (res.data?.bookings) {
        setBookings(res.data.bookings as BookingRow[]);
      }
    });
    customerApi.myFavorites().then((res) => {
      if ("error" in res || !res.data?.favorites) return;
      setFavorites(res.data.favorites);
      setFavoriteSalonIds(new Set(res.data.favorites.map((f) => String(f.salon_id))));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!rescheduleId || !rescheduleDate) {
      setRescheduleSlots([]);
      setRescheduleSlotsLoading(false);
      return;
    }
    const b = bookings.find((x) => x.id === rescheduleId);
    if (!b) return;
    const ids = getRescheduleBranchServiceIds(b);
    if (!ids) {
      setRescheduleSlots([]);
      setRescheduleSlotsLoading(false);
      return;
    }
    setSelectedRescheduleSlot(null);
    setRescheduleSlotsLoading(true);
    setRescheduleSlots([]);
    publicApi.availability(ids.branchId, ids.serviceId, rescheduleDate).then(({ data }) => {
      setRescheduleSlotsLoading(false);
      if (!data?.slots) return;
      const buffer = new Date(Date.now() + 30 * 60 * 1000);
      const future = (data.slots as AvailabilitySlot[]).filter(
        (slot) => localDate(slot.start) > buffer,
      );
      setRescheduleSlots(future);
    });
  }, [rescheduleId, rescheduleDate, bookings]);

  const handleCancel = async (id: string) => {
    if (!confirm(t("confirmCancelBooking"))) return;
    setCancellingId(id);
    const { data, error: err } = await customerApi.cancelBooking(id);
    setCancellingId(null);
    if (err) {
      toast.error(err);
    } else {
      toast.success(t("bookingCancelled"));
      if (data?.policy?.violated) {
        toast.warning(
          t("cancelPolicyInsideWindow").replace("{hours}", String(data.policy.window_hours)),
        );
      }
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)),
      );
    }
  };

  const openReschedule = (booking: BookingRow) => {
    const startIso = booking.starts_at ?? booking.start_at;
    setRescheduleId(booking.id);
    setSelectedRescheduleSlot(null);
    setRescheduleSlots([]);
    setRescheduleManualAt(startIso ? toDatetimeLocal(startIso) : "");
    const today = new Date().toISOString().slice(0, 10);
    if (startIso) {
      const d = startIso.slice(0, 10);
      setRescheduleDate(d >= today ? d : today);
    } else {
      setRescheduleDate(today);
    }
  };

  const dismissReschedule = () => {
    setRescheduleId(null);
    setRescheduleDate("");
    setRescheduleSlots([]);
    setRescheduleSlotsLoading(false);
    setSelectedRescheduleSlot(null);
    setRescheduleManualAt("");
  };

  const submitReschedule = async (id: string) => {
    const booking = bookings.find((x) => x.id === id);
    const ids = booking ? getRescheduleBranchServiceIds(booking) : null;

    if (ids) {
      if (!selectedRescheduleSlot) {
        toast.error(t("selectSlotFirst"));
        return;
      }
      setReschedulingId(id);
      const { data, error } = await customerApi.rescheduleBooking(id, {
        start_at: selectedRescheduleSlot.start,
        staff_id: selectedRescheduleSlot.staff_id,
      });
      setReschedulingId(null);
      if (error || !data?.booking) {
        toast.error(error ?? t("failedToReschedule"));
        return;
      }
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...data.booking } : b)));
      if (data?.policy?.violated) {
        toast.warning(
          t("reschedulePolicyInsideWindow").replace("{hours}", String(data.policy.window_hours)),
        );
      } else {
        toast.success(t("bookingRescheduled"));
      }
      dismissReschedule();
      return;
    }

    if (!rescheduleManualAt) {
      toast.error(t("selectDateTimeFirst"));
      return;
    }
    setReschedulingId(id);
    const iso = new Date(rescheduleManualAt).toISOString();
    const { data, error } = await customerApi.rescheduleBooking(id, { start_at: iso });
    setReschedulingId(null);
    if (error || !data?.booking) {
      toast.error(error ?? t("failedToReschedule"));
      return;
    }
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...data.booking } : b)));
    if (data?.policy?.violated) {
      toast.warning(
        t("reschedulePolicyInsideWindow").replace("{hours}", String(data.policy.window_hours)),
      );
    } else {
      toast.success(t("bookingRescheduled"));
    }
    dismissReschedule();
  };

  const addFavorite = async (salonId: string) => {
    const { data, error } = await customerApi.addFavoriteSalon(salonId);
    if (error || !data?.favorite) {
      toast.error(error ?? t("failedAddFavorite"));
      return;
    }
    setFavoriteSalonIds((prev) => new Set([...prev, String(salonId)]));
    setFavorites((prev) => {
      const exists = prev.some((f) => String(f.salon_id) === String(salonId));
      return exists ? prev : [data.favorite, ...prev];
    });
    toast.success(t("addedToFavorites"));
  };

  const removeFavorite = async (salonId: string) => {
    const { error } = await customerApi.removeFavoriteSalon(salonId);
    if (error) {
      toast.error(error);
      return;
    }
    setFavoriteSalonIds((prev) => {
      const next = new Set(prev);
      next.delete(String(salonId));
      return next;
    });
    setFavorites((prev) => prev.filter((f) => String(f.salon_id) !== String(salonId)));
    toast.success(t("removedFromFavorites"));
  };

  const openReview = (booking: BookingRow) => {
    setReviewBookingId(booking.id);
    setReviewRating(5);
    setReviewComment("");
  };

  const openQuickRebook = (booking: BookingRow) => {
    setQuickRebookId(booking.id);
    setQuickRebookStartAt("");
  };

  const submitQuickRebook = async (id: string) => {
    if (!quickRebookStartAt) {
      toast.error(t("selectDateTimeFirst"));
      return;
    }
    setQuickRebookingId(id);
    const iso = new Date(quickRebookStartAt).toISOString();
    const { data, error } = await customerApi.rebookBooking(id, { start_at: iso });
    setQuickRebookingId(null);
    if (error || !data?.booking) {
      toast.error(error ?? t("failedQuickRebook"));
      return;
    }
    setBookings((prev) => {
      const next = [data.booking as BookingRow, ...prev];
      return next.sort((a, b) => {
        const ta = String(a.starts_at ?? a.start_at ?? "");
        const tb = String(b.starts_at ?? b.start_at ?? "");
        return tb.localeCompare(ta);
      });
    });
    toast.success(t("quickRebookSuccess"));
    setQuickRebookId(null);
    setQuickRebookStartAt("");
  };

  const submitReview = async (bookingId: string) => {
    setSubmittingReviewId(bookingId);
    const { data, error } = await customerApi.submitReview(bookingId, {
      rating: reviewRating,
      comment: reviewComment.trim() || undefined,
    });
    setSubmittingReviewId(null);
    if (error || !data?.review) {
      toast.error(error ?? t("failedSubmitReview"));
      return;
    }

    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, review: data.review } : b)),
    );
    setReviewBookingId(null);
    setReviewComment("");
    setReviewRating(5);
    toast.success(t("reviewSubmittedPending"));
  };

  const upcoming = bookings.filter((b) =>
    ["scheduled", "confirmed", "pending"].includes(String(b.status))
  );
  const past = bookings.filter((b) =>
    !["scheduled", "confirmed", "pending"].includes(String(b.status))
  );

  const statusLabel: Record<string, string> = {
    scheduled: t("statusScheduled"),
    confirmed: t("statusConfirmed"),
    completed: t("statusCompleted"),
    cancelled: t("statusCancelled"),
    pending: t("statusPending"),
    no_show: t("statusNoShow"),
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold text-salon-espresso">
            {t("myAppointments")}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {t("myAppointmentsSubtitle")}
          </p>
        </div>
        <Link
          href="/book"
          className="flex items-center gap-1.5 px-4 py-2.5 bg-salon-gold text-white text-sm font-semibold
            rounded-xl hover:opacity-90 transition-colors shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          {t("bookNew")}
        </Link>
      </div>

      {favorites.length > 0 && (
        <div className="mb-6">
          <Link
            href="/favorites"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            ❤ {t("viewFavorites")} ({favorites.length})
          </Link>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState t={t} />
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <Section title={t("upcoming")} count={upcoming.length}>
              {upcoming.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  rebookHref={buildRebookHref(b)}
                  isFavorite={!!b.tenant_id && favoriteSalonIds.has(String(b.tenant_id))}
                  onAddFavorite={b.tenant_id ? () => addFavorite(String(b.tenant_id)) : undefined}
                  onRemoveFavorite={b.tenant_id ? () => removeFavorite(String(b.tenant_id)) : undefined}
                  onCancel={handleCancel}
                  onStartReschedule={() => openReschedule(b)}
                  onSubmitReschedule={submitReschedule}
                  onDismissReschedule={dismissReschedule}
                  onOpenReview={() => openReview(b)}
                  onSubmitReview={submitReview}
                  onDismissReview={() => { setReviewBookingId(null); setReviewComment(""); setReviewRating(5); }}
                  rescheduleOpen={rescheduleId === b.id}
                  rescheduleDate={rescheduleDate}
                  onRescheduleDateChange={setRescheduleDate}
                  rescheduleSlots={rescheduleSlots}
                  rescheduleSlotsLoading={rescheduleSlotsLoading}
                  selectedRescheduleSlot={selectedRescheduleSlot}
                  onSelectRescheduleSlot={setSelectedRescheduleSlot}
                  rescheduleManualAt={rescheduleManualAt}
                  onRescheduleManualChange={setRescheduleManualAt}
                  policyWindowHours={POLICY_WINDOW_HOURS}
                  reviewOpen={reviewBookingId === b.id}
                  reviewRating={reviewRating}
                  reviewComment={reviewComment}
                  onReviewRatingChange={setReviewRating}
                  onReviewCommentChange={setReviewComment}
                  cancelling={cancellingId === b.id}
                  rescheduling={reschedulingId === b.id}
                  submittingReview={submittingReviewId === b.id}
                  locale={locale}
                  statusLabel={statusLabel}
                  cancelLabel={t("cancelBooking")}
                  cancellingLabel={t("cancellingBooking")}
                  t={t}
                />
              ))}
            </Section>
          )}

          {past.length > 0 && (
            <Section title={t("past")} count={past.length}>
              {past.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  rebookHref={buildRebookHref(b)}
                  isFavorite={!!b.tenant_id && favoriteSalonIds.has(String(b.tenant_id))}
                  onAddFavorite={b.tenant_id ? () => addFavorite(String(b.tenant_id)) : undefined}
                  onRemoveFavorite={b.tenant_id ? () => removeFavorite(String(b.tenant_id)) : undefined}
                  onOpenReview={() => openReview(b)}
                  onSubmitReview={submitReview}
                  onDismissReview={() => { setReviewBookingId(null); setReviewComment(""); setReviewRating(5); }}
                  reviewOpen={reviewBookingId === b.id}
                  reviewRating={reviewRating}
                  reviewComment={reviewComment}
                  onReviewRatingChange={setReviewRating}
                  onReviewCommentChange={setReviewComment}
                  submittingReview={submittingReviewId === b.id}
                  onStartQuickRebook={
                    QUICK_REBOOK_STATUSES.includes(String(b.status)) && (b.services?.length ?? 0) > 0
                      ? () => openQuickRebook(b)
                      : undefined
                  }
                  onSubmitQuickRebook={submitQuickRebook}
                  onDismissQuickRebook={() => { setQuickRebookId(null); setQuickRebookStartAt(""); }}
                  quickRebookOpen={quickRebookId === b.id}
                  quickRebookValue={quickRebookStartAt}
                  onQuickRebookValueChange={setQuickRebookStartAt}
                  quickRebooking={quickRebookingId === b.id}
                  locale={locale}
                  statusLabel={statusLabel}
                  cancelLabel={t("cancelBooking")}
                  cancellingLabel={t("cancellingBooking")}
                  t={t}
                />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {title}
        </h2>
        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
          {count}
        </span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ReschedulePanel({
  booking: b,
  locale,
  t,
  policyWindowHours,
  rescheduleDate,
  onRescheduleDateChange,
  rescheduleSlots,
  rescheduleSlotsLoading,
  selectedRescheduleSlot,
  onSelectRescheduleSlot,
  rescheduleManualAt,
  onRescheduleManualChange,
  onSubmit,
  onDismiss,
  rescheduling,
}: {
  booking: BookingRow;
  locale: PublicLocale;
  t: (key: PublicI18nKey) => string;
  policyWindowHours: number;
  rescheduleDate: string;
  onRescheduleDateChange?: (v: string) => void;
  rescheduleSlots: AvailabilitySlot[];
  rescheduleSlotsLoading: boolean;
  selectedRescheduleSlot: AvailabilitySlot | null;
  onSelectRescheduleSlot?: (s: AvailabilitySlot | null) => void;
  rescheduleManualAt: string;
  onRescheduleManualChange?: (v: string) => void;
  onSubmit: () => void;
  onDismiss?: () => void;
  rescheduling: boolean;
}) {
  const ids = getRescheduleBranchServiceIds(b);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
      <p className="text-xs text-gray-500">
        {t("reschedulePolicyReminder").replace("{hours}", String(policyWindowHours))}
      </p>
      {ids ? (
        <>
          <p className="text-xs text-gray-500">{t("rescheduleSlotsHint")}</p>
          <div>
            <label htmlFor={`reschedule-date-${b.id}`} className="block text-xs font-medium text-muted-foreground mb-1">
              {t("reschedulePickDate")}
            </label>
            <Input
              id={`reschedule-date-${b.id}`}
              type="date"
              value={rescheduleDate}
              min={today}
              onChange={(e) => onRescheduleDateChange?.(e.target.value)}
              className="w-full sm:w-auto py-2"
            />
          </div>
          {rescheduleSlotsLoading ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <Spinner size="sm" />
              <span className="text-xs text-gray-500">{t("rescheduleLoadingSlots")}</span>
            </div>
          ) : rescheduleSlots.length === 0 ? (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              {t("rescheduleNoSlots")}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2" role="listbox" aria-label={t("reschedulePickDate")}>
              {rescheduleSlots.map((slot) => {
                const selected =
                  selectedRescheduleSlot?.start === slot.start &&
                  selectedRescheduleSlot?.staff_id === slot.staff_id;
                return (
                  <button
                    key={`${slot.start}-${slot.staff_id}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => onSelectRescheduleSlot?.(slot)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors
                      ${selected
                        ? "border-salon-gold bg-salon-gold/10 text-salon-espresso"
                        : "border-gray-200 hover:border-salon-gold/60 text-salon-espresso"}`}
                  >
                    {fmt(slot.start, LOCALE_BCP47[locale])}
                  </button>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            {t("rescheduleManualFallbackHint")}
          </p>
          <Input
            type="datetime-local"
            value={rescheduleManualAt}
            min={new Date().toISOString().slice(0, 16)}
            onChange={(e) => onRescheduleManualChange?.(e.target.value)}
            className="w-full sm:w-auto py-2"
          />
        </>
      )}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onSubmit}
          disabled={rescheduling}
          className="px-3 py-2 text-xs font-medium bg-salon-gold text-white rounded-lg disabled:opacity-50"
        >
          {rescheduling ? t("savingReschedule") : t("save")}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg"
        >
          {t("cancelAction")}
        </button>
      </div>
    </div>
  );
}

function BookingCard({
  booking: b,
  rebookHref,
  isFavorite,
  onAddFavorite,
  onRemoveFavorite,
  onCancel,
  onStartReschedule,
  onSubmitReschedule,
  onDismissReschedule,
  onOpenReview,
  onSubmitReview,
  onDismissReview,
  onStartQuickRebook,
  onSubmitQuickRebook,
  onDismissQuickRebook,
  quickRebookOpen,
  quickRebookValue,
  onQuickRebookValueChange,
  quickRebooking,
  rescheduleOpen,
  rescheduleDate,
  onRescheduleDateChange,
  rescheduleSlots,
  rescheduleSlotsLoading,
  selectedRescheduleSlot,
  onSelectRescheduleSlot,
  rescheduleManualAt,
  onRescheduleManualChange,
  policyWindowHours = POLICY_WINDOW_HOURS,
  reviewOpen,
  reviewRating,
  reviewComment,
  onReviewRatingChange,
  onReviewCommentChange,
  cancelling,
  rescheduling,
  submittingReview,
  locale,
  statusLabel,
  cancelLabel,
  cancellingLabel,
  t,
}: {
  booking: BookingRow;
  rebookHref?: string;
  isFavorite?: boolean;
  onAddFavorite?: () => void;
  onRemoveFavorite?: () => void;
  onCancel?: (id: string) => void;
  onStartReschedule?: () => void;
  onSubmitReschedule?: (id: string) => void;
  onDismissReschedule?: () => void;
  onOpenReview?: () => void;
  onSubmitReview?: (id: string) => void;
  onDismissReview?: () => void;
  onStartQuickRebook?: () => void;
  onSubmitQuickRebook?: (id: string) => void;
  onDismissQuickRebook?: () => void;
  quickRebookOpen?: boolean;
  quickRebookValue?: string;
  onQuickRebookValueChange?: (v: string) => void;
  quickRebooking?: boolean;
  rescheduleOpen?: boolean;
  rescheduleDate?: string;
  onRescheduleDateChange?: (v: string) => void;
  rescheduleSlots?: AvailabilitySlot[];
  rescheduleSlotsLoading?: boolean;
  selectedRescheduleSlot?: AvailabilitySlot | null;
  onSelectRescheduleSlot?: (s: AvailabilitySlot | null) => void;
  rescheduleManualAt?: string;
  onRescheduleManualChange?: (v: string) => void;
  policyWindowHours?: number;
  reviewOpen?: boolean;
  reviewRating?: number;
  reviewComment?: string;
  onReviewRatingChange?: (v: number) => void;
  onReviewCommentChange?: (v: string) => void;
  cancelling?: boolean;
  rescheduling?: boolean;
  submittingReview?: boolean;
  locale: PublicLocale;
  statusLabel: Record<string, string>;
  cancelLabel: string;
  cancellingLabel: string;
  t: (key: PublicI18nKey) => string;
}) {
  const startIso = b.starts_at ?? b.start_at;
  const endIso   = b.ends_at   ?? b.end_at;

  const serviceName = b.services?.[0]?.service?.name ?? b.Service?.name ?? "—";
  const branchName  = b.branch?.name ?? b.Location?.name ?? "—";
  const branchAddress = b.branch?.address ?? null;
  const staffName   = b.staff?.name ?? "—";

  const status = String(b.status);
  const canCancel = CANCELLABLE.includes(status) && onCancel;
  const canReschedule = RESCHEDULABLE.includes(status) && onStartReschedule;
  const canReview = status === "completed" && !b.review && onOpenReview;
  const canQuickRebook = Boolean(onStartQuickRebook);
  const showActionsColumn = Boolean(
    rebookHref ||
      onAddFavorite ||
      onRemoveFavorite ||
      canCancel ||
      canReschedule ||
      canReview ||
      canQuickRebook ||
      b.review,
  );

  const dateStr = startIso
    ? localDate(startIso).toLocaleDateString(LOCALE_BCP47[locale], {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
  const timeStr = startIso && endIso
    ? `${fmt(startIso, LOCALE_BCP47[locale])} – ${fmt(endIso, LOCALE_BCP47[locale])}`
    : startIso
      ? fmt(startIso, LOCALE_BCP47[locale])
      : "—";

  return (
    <div className="bg-card rounded-2xl border border-gray-100 shadow-sm p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-salon-espresso text-sm">{serviceName}</p>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-500"}`}
            >
              {statusLabel[status] ?? status}
            </span>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-gray-400">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {branchName}{branchAddress ? ` · ${branchAddress}` : ""}
            </span>
          </p>

          <div className="flex items-center gap-3">
            <p className="flex items-center gap-1.5 text-xs text-gray-500">
              <CalendarDays className="w-3 h-3 shrink-0" />
              {dateStr}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="w-3 h-3 shrink-0" />
              {timeStr}
            </p>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-gray-400">
            <User className="w-3 h-3 shrink-0" />
            {staffName}
          </p>
        </div>

        {showActionsColumn && (
          <div className="shrink-0 flex flex-col gap-2">
            {rebookHref && (
              <Link
                href={rebookHref}
                className="text-xs font-medium text-salon-espresso hover:text-salon-gold
                  border border-gray-200 hover:border-salon-gold px-3 py-1.5 rounded-lg transition-colors text-center"
              >
                {t("rebook")}
              </Link>
            )}
            {canQuickRebook && (
              <button
                type="button"
                onClick={onStartQuickRebook}
                className="text-xs font-medium text-salon-espresso hover:text-salon-gold
                  border border-gray-200 hover:border-salon-gold px-3 py-1.5 rounded-lg transition-colors"
              >
                {t("pickNewTime")}
              </button>
            )}
            {(onAddFavorite || onRemoveFavorite) && (
              <button
                type="button"
                onClick={isFavorite ? onRemoveFavorite : onAddFavorite}
                className="text-xs font-medium text-salon-espresso hover:text-salon-gold
                  border border-gray-200 hover:border-salon-gold px-3 py-1.5 rounded-lg transition-colors"
              >
                {isFavorite ? t("unfavorite") : t("addFavorite")}
              </button>
            )}
            {canReschedule && (
              <button
                type="button"
                onClick={onStartReschedule}
                className="text-xs font-medium text-salon-espresso hover:text-salon-gold
                  border border-gray-200 hover:border-salon-gold px-3 py-1.5 rounded-lg transition-colors"
              >
                {t("rescheduleBooking")}
              </button>
            )}
            {canCancel && (
              <button
                type="button"
                onClick={() => onCancel(b.id)}
                disabled={!!cancelling}
                className="text-xs font-medium text-red-500 hover:text-red-700
                  border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg
                  disabled:opacity-50 transition-colors"
              >
                {cancelling ? cancellingLabel : cancelLabel}
              </button>
            )}
            {canReview && (
              <button
                type="button"
                onClick={onOpenReview}
                className="text-xs font-medium text-salon-espresso hover:text-salon-gold
                  border border-gray-200 hover:border-salon-gold px-3 py-1.5 rounded-lg transition-colors"
              >
                {t("rateAndReview")}
              </button>
            )}
            {b.review && (
              <span className="text-[11px] px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 text-center">
                {t("reviewStatusPrefix")} {String(b.review.status ?? "pending")}
              </span>
            )}
          </div>
        )}
      </div>
      {rescheduleOpen && (
        <ReschedulePanel
          booking={b}
          locale={locale}
          t={t}
          policyWindowHours={policyWindowHours}
          rescheduleDate={rescheduleDate ?? ""}
          onRescheduleDateChange={onRescheduleDateChange}
          rescheduleSlots={rescheduleSlots ?? []}
          rescheduleSlotsLoading={!!rescheduleSlotsLoading}
          selectedRescheduleSlot={selectedRescheduleSlot ?? null}
          onSelectRescheduleSlot={onSelectRescheduleSlot}
          rescheduleManualAt={rescheduleManualAt ?? ""}
          onRescheduleManualChange={onRescheduleManualChange}
          onSubmit={() => onSubmitReschedule?.(b.id)}
          onDismiss={onDismissReschedule}
          rescheduling={!!rescheduling}
        />
      )}
      {quickRebookOpen && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2">
          <p className="text-xs text-gray-500">{t("quickRebookHint")}</p>
          <Input
            type="datetime-local"
            value={quickRebookValue ?? ""}
            min={new Date().toISOString().slice(0, 16)}
            onChange={(e) => onQuickRebookValueChange?.(e.target.value)}
            className="w-full sm:w-auto py-2"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onSubmitQuickRebook?.(b.id)}
              disabled={!!quickRebooking}
              className="px-3 py-2 text-xs font-medium bg-salon-gold text-white rounded-lg disabled:opacity-50"
            >
              {quickRebooking ? t("quickRebooking") : t("saveQuickRebook")}
            </button>
            <button
              type="button"
              onClick={onDismissQuickRebook}
              className="px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg"
            >
              {t("cancelAction")}
            </button>
          </div>
        </div>
      )}
      {reviewOpen && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t("ratingLabel")}</label>
            <select
              value={reviewRating ?? 5}
              onChange={(e) => onReviewRatingChange?.(Number(e.target.value))}
              className="w-full sm:w-40 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r} {r > 1 ? t("stars") : t("star")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t("commentOptional")}</label>
            <textarea
              value={reviewComment ?? ""}
              onChange={(e) => onReviewCommentChange?.(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              placeholder={t("reviewCommentPlaceholder")}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onSubmitReview?.(b.id)}
              disabled={!!submittingReview}
              className="px-3 py-2 text-xs font-medium bg-salon-gold text-white rounded-lg disabled:opacity-50"
            >
              {submittingReview ? t("submittingReview") : t("submitReview")}
            </button>
            <button
              type="button"
              onClick={onDismissReview}
              className="px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg"
            >
              {t("cancelAction")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ t }: { t: (k: PublicI18nKey) => string }) {
  return (
    <div className="text-center py-16 px-6 bg-card rounded-2xl border border-gray-100 shadow-sm">
      <div className="w-14 h-14 rounded-full bg-salon-gold/10 flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-6 h-6 text-salon-gold" />
      </div>
      <h2 className="font-display text-lg font-semibold text-salon-espresso mb-1">
        {t("noAppointmentsYet")}
      </h2>
      <p className="text-gray-400 text-sm mb-6">
        {t("noAppointmentsDesc")}
      </p>
      <Link
        href="/book"
        className="inline-flex items-center gap-1.5 px-5 py-3 bg-salon-gold text-white text-sm font-semibold
          rounded-xl hover:opacity-90 transition-colors shadow-sm"
      >
        <Plus className="w-4 h-4" />
        {t("bookAVisitCta")}
      </Link>
    </div>
  );
}

// ── Rebook link ───────────────────────────────────────────────────────────────

function buildRebookHref(booking: BookingRow): string {
  const serviceId = booking.services?.[0]?.service?.id ?? booking.service_id ?? booking.Service?.id ?? "";
  const branchId = booking.branch?.id ?? booking.branch_id ?? booking.location_id ?? "";
  const staffId = booking.staff?.id ?? booking.staff_id ?? "";
  const params = new URLSearchParams();
  if (booking.tenant_id) params.set("salon_id", String(booking.tenant_id));
  if (serviceId) params.set("service_id", String(serviceId));
  if (branchId) params.set("branch_id", String(branchId));
  if (staffId) params.set("staff_id", String(staffId));
  const query = params.toString();
  return query ? `/book?${query}` : "/book";
}
