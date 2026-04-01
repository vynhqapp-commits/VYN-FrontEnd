"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Clock, MapPin, User, Plus, AlertCircle } from "lucide-react";
import { customerApi } from "@/lib/api";
import type { Appointment } from "@/lib/api";
import { Spinner } from "@/components/ui";
import { toast } from "sonner";
import { useLocale } from "@/components/LocaleProvider";
import { getPublicT } from "@/lib/i18n-public";
import type { PublicI18nKey } from "@/lib/i18n-public";

type BookingRow = Appointment;

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

export default function MyBookingsPage() {
  const { locale } = useLocale();
  const t = getPublicT(locale);

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleStartAt, setRescheduleStartAt] = useState("");
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);

  useEffect(() => {
    customerApi.myBookings().then((res) => {
      setLoading(false);
      if ("error" in res) {
        toast.error(res.error ?? t("failedToLoadBookings"));
      } else if (res.data?.bookings) {
        setBookings(res.data.bookings as BookingRow[]);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        toast.warning(`Applied inside ${data.policy.window_hours}h policy window.`);
      }
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)),
      );
    }
  };

  const openReschedule = (booking: BookingRow) => {
    const startIso = booking.starts_at ?? booking.start_at;
    setRescheduleId(booking.id);
    setRescheduleStartAt(startIso ? toDatetimeLocal(startIso) : "");
  };

  const submitReschedule = async (id: string) => {
    if (!rescheduleStartAt) {
      toast.error("Select a new date and time first.");
      return;
    }
    setReschedulingId(id);
    const iso = new Date(rescheduleStartAt).toISOString();
    const { data, error } = await customerApi.rescheduleBooking(id, { start_at: iso });
    setReschedulingId(null);
    if (error || !data?.booking) {
      toast.error(error ?? "Failed to reschedule booking.");
      return;
    }
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...data.booking } : b)));
    if (data?.policy?.violated) {
      toast.warning(`Rescheduled inside ${data.policy.window_hours}h policy window.`);
    } else {
      toast.success("Booking rescheduled.");
    }
    setRescheduleId(null);
    setRescheduleStartAt("");
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
            rounded-xl hover:bg-salon-goldLight transition-colors shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          {t("bookNew")}
        </Link>
      </div>

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
                  onCancel={handleCancel}
                  onStartReschedule={() => openReschedule(b)}
                  onSubmitReschedule={submitReschedule}
                  onDismissReschedule={() => { setRescheduleId(null); setRescheduleStartAt(""); }}
                  rescheduleOpen={rescheduleId === b.id}
                  rescheduleValue={rescheduleStartAt}
                  onRescheduleValueChange={setRescheduleStartAt}
                  cancelling={cancellingId === b.id}
                  rescheduling={reschedulingId === b.id}
                  locale={locale}
                  statusLabel={statusLabel}
                  cancelLabel={t("cancelBooking")}
                  cancellingLabel={t("cancellingBooking")}
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
                  locale={locale}
                  statusLabel={statusLabel}
                  cancelLabel={t("cancelBooking")}
                  cancellingLabel={t("cancellingBooking")}
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

function BookingCard({
  booking: b,
  onCancel,
  onStartReschedule,
  onSubmitReschedule,
  onDismissReschedule,
  rescheduleOpen,
  rescheduleValue,
  onRescheduleValueChange,
  cancelling,
  rescheduling,
  locale,
  statusLabel,
  cancelLabel,
  cancellingLabel,
}: {
  booking: BookingRow;
  onCancel?: (id: string) => void;
  onStartReschedule?: () => void;
  onSubmitReschedule?: (id: string) => void;
  onDismissReschedule?: () => void;
  rescheduleOpen?: boolean;
  rescheduleValue?: string;
  onRescheduleValueChange?: (v: string) => void;
  cancelling?: boolean;
  rescheduling?: boolean;
  locale: string;
  statusLabel: Record<string, string>;
  cancelLabel: string;
  cancellingLabel: string;
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

  const dateStr = startIso
    ? localDate(startIso).toLocaleDateString(locale, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
  const timeStr = startIso && endIso
    ? `${fmt(startIso, locale)} – ${fmt(endIso, locale)}`
    : startIso
      ? fmt(startIso, locale)
      : "—";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 transition-shadow hover:shadow-md">
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

        {(canCancel || canReschedule) && (
          <div className="shrink-0 flex flex-col gap-2">
            {canReschedule && (
              <button
                type="button"
                onClick={onStartReschedule}
                className="text-xs font-medium text-salon-espresso hover:text-salon-gold
                  border border-gray-200 hover:border-salon-gold px-3 py-1.5 rounded-lg transition-colors"
              >
                Reschedule
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
          </div>
        )}
      </div>
      {rescheduleOpen && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            type="datetime-local"
            value={rescheduleValue ?? ""}
            min={new Date().toISOString().slice(0, 16)}
            onChange={(e) => onRescheduleValueChange?.(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onSubmitReschedule?.(b.id)}
              disabled={!!rescheduling}
              className="px-3 py-2 text-xs font-medium bg-salon-gold text-white rounded-lg disabled:opacity-50"
            >
              {rescheduling ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={onDismissReschedule}
              className="px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ t }: { t: (k: PublicI18nKey) => string }) {
  return (
    <div className="text-center py-16 px-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
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
          rounded-xl hover:bg-salon-goldLight transition-colors shadow-sm"
      >
        <Plus className="w-4 h-4" />
        {t("bookAVisitCta")}
      </Link>
    </div>
  );
}

// ── Time helpers ──────────────────────────────────────────────────────────────

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
