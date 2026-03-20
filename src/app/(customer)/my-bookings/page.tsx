"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Clock, MapPin, User, Plus, AlertCircle } from "lucide-react";
import { customerApi } from "@/lib/api";
import type { Appointment } from "@/lib/api";
import { Spinner } from "@/components/ui";
import { toast } from "sonner";

// Extended type that covers the relations the backend eagerly loads
type BookingRow = Appointment & {
  branch?: { id: string; name: string; address?: string };
  staff?: { id: string; name: string };
  services?: { service: { id: string; name: string; duration_minutes: number; price: number } }[];
};

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-700 border border-blue-100",
  confirmed: "bg-green-50 text-green-700 border border-green-100",
  completed: "bg-gray-100 text-gray-600 border border-gray-200",
  cancelled: "bg-red-50 text-red-600 border border-red-100",
  pending: "bg-amber-50 text-amber-700 border border-amber-100",
  no_show: "bg-orange-50 text-orange-700 border border-orange-100",
};

const CANCELLABLE = ["scheduled", "confirmed", "pending"];

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    customerApi.myBookings().then((res) => {
      setLoading(false);
      if ("error" in res) {
        toast.error(res.error ?? "Failed to load bookings");
      } else if (res.data?.bookings) {
        setBookings(res.data.bookings as BookingRow[]);
      }
    });
  }, []);

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    setCancellingId(id);
    const { error: err } = await customerApi.cancelBooking(id);
    setCancellingId(null);
    if (err) {
      toast.error(err);
    } else {
      toast.success("Booking cancelled");
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)),
      );
    }
  };

  const upcoming = bookings.filter((b) =>
    ["scheduled", "confirmed", "pending"].includes(String(b.status))
  );
  const past = bookings.filter((b) =>
    !["scheduled", "confirmed", "pending"].includes(String(b.status))
  );

  return (
    <div className="max-w-2xl mx-auto">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold text-salon-espresso">
            My Appointments
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            View and manage all your bookings.
          </p>
        </div>
        <Link
          href="/book"
          className="flex items-center gap-1.5 px-4 py-2.5 bg-salon-gold text-white text-sm font-semibold
            rounded-xl hover:bg-salon-goldLight transition-colors shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Book new
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <Section title="Upcoming" count={upcoming.length}>
              {upcoming.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  onCancel={handleCancel}
                  cancelling={cancellingId === b.id}
                />
              ))}
            </Section>
          )}

          {past.length > 0 && (
            <Section title="Past" count={past.length}>
              {past.map((b) => (
                <BookingCard key={b.id} booking={b} />
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
  cancelling,
}: {
  booking: BookingRow;
  onCancel?: (id: string) => void;
  cancelling?: boolean;
}) {
  const serviceName =
    b.services?.[0]?.service?.name ?? "—";
  const branchName = b.branch?.name ?? "—";
  const branchAddress = b.branch?.address ?? null;
  const staffName = b.staff?.name ?? "—";
  const status = String(b.status);
  const canCancel = CANCELLABLE.includes(status) && onCancel;

  const dateStr = b.starts_at
    ? localDate(b.starts_at).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
  const timeStr = b.starts_at && b.ends_at
    ? `${fmt(b.starts_at)} – ${fmt(b.ends_at)}`
    : b.starts_at
      ? fmt(b.starts_at)
      : "—";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          {/* Service name + status */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-salon-espresso text-sm">{serviceName}</p>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-500"}`}
            >
              {status.replace("_", " ")}
            </span>
          </div>

          {/* Branch */}
          <p className="flex items-center gap-1.5 text-xs text-gray-400">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {branchName}{branchAddress ? ` · ${branchAddress}` : ""}
            </span>
          </p>

          {/* Date & time */}
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

          {/* Staff */}
          <p className="flex items-center gap-1.5 text-xs text-gray-400">
            <User className="w-3 h-3 shrink-0" />
            {staffName}
          </p>
        </div>

        {/* Cancel button */}
        {canCancel && (
          <button
            type="button"
            onClick={() => onCancel(b.id)}
            disabled={!!cancelling}
            className="shrink-0 text-xs font-medium text-red-500 hover:text-red-700
              border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg
              disabled:opacity-50 transition-colors"
          >
            {cancelling ? "Cancelling…" : "Cancel"}
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 px-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="w-14 h-14 rounded-full bg-salon-gold/10 flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-6 h-6 text-salon-gold" />
      </div>
      <h2 className="font-display text-lg font-semibold text-salon-espresso mb-1">
        No appointments yet
      </h2>
      <p className="text-gray-400 text-sm mb-6">
        Book your first visit and it will appear here.
      </p>
      <Link
        href="/book"
        className="inline-flex items-center gap-1.5 px-5 py-3 bg-salon-gold text-white text-sm font-semibold
          rounded-xl hover:bg-salon-goldLight transition-colors shadow-sm"
      >
        <Plus className="w-4 h-4" />
        Book a visit
      </Link>
    </div>
  );
}

// ── Time helpers ──────────────────────────────────────────────────────────────

function fmt(iso: string) {
  const local = iso.replace(/Z$/, "");
  return new Date(local).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function localDate(iso: string): Date {
  return new Date(iso.replace(/Z$/, ""));
}
