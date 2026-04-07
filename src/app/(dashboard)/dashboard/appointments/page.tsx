'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import AppointmentDetailPanel from '@/components/calendar/AppointmentDetailPanel';
import SaleCheckoutForm from '@/components/pos/SaleCheckoutForm';
import { appointmentsApi, clientsApi, locationsApi, servicesApi, type Appointment, type Client, type Location, type Service } from '@/lib/api';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocale } from '@/components/LocaleProvider';
import { getDashboardT } from '@/lib/i18n-dashboard';
import type { PublicLocale } from '@/lib/i18n-public';

const LOCALE_BCP47: Record<PublicLocale, string> = {
  en: 'en-US',
  ar: 'ar-u-nu-latn',
  fr: 'fr-FR',
};

export default function AppointmentsPage() {
  const { locale } = useLocale();
  const td = getDashboardT(locale);

  const calendarDowLabels = useMemo(() => {
    const base = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d.toLocaleDateString(LOCALE_BCP47[locale], { weekday: 'short' });
    });
  }, [locale]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'day' | 'week' | 'month'>('day');
  // When `viewMode === 'list'`, we still respect a date window based on the last selected range.
  const [rangeMode, setRangeMode] = useState<'day' | 'week' | 'month'>('day');
  const [focusDate, setFocusDate] = useState(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [changingId, setChangingId] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const pollInFlightRef = useRef(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [checkoutAppointmentId, setCheckoutAppointmentId] = useState<string | null>(null);

  // Walk-in modal state
  const [walkInLoading, setWalkInLoading] = useState(false);
  const [walkInError, setWalkInError] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [walkInForm, setWalkInForm] = useState<{
    location_id: string;
    client_id: string;
    staff_id: string;
    service_id: string;
    date: string;
    time: string;
    notes: string;
  }>({
    location_id: '',
    client_id: '',
    staff_id: '',
    service_id: '',
    date: new Date().toISOString().slice(0, 10),
    time: '10:00',
    notes: 'Walk-in',
  });

  const parseDateKey = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const formatDateKey = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const addDays = (d: Date, days: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
  };

  const addMonths = (d: Date, months: number) => {
    const x = new Date(d);
    x.setMonth(x.getMonth() + months);
    return x;
  };

  const staffPalette = [
    { bg: 'bg-emerald-100/80', border: 'border-emerald-200', text: 'text-emerald-900' },
    { bg: 'bg-blue-100/80', border: 'border-blue-200', text: 'text-blue-900' },
    { bg: 'bg-violet-100/80', border: 'border-violet-200', text: 'text-violet-900' },
    { bg: 'bg-rose-100/80', border: 'border-rose-200', text: 'text-rose-900' },
    { bg: 'bg-amber-100/80', border: 'border-amber-200', text: 'text-amber-900' },
    { bg: 'bg-teal-100/80', border: 'border-teal-200', text: 'text-teal-900' },
    { bg: 'bg-sky-100/80', border: 'border-sky-200', text: 'text-sky-900' },
    { bg: 'bg-fuchsia-100/80', border: 'border-fuchsia-200', text: 'text-fuchsia-900' },
  ] as const;

  const getStaffLabel = (a: Appointment) => a.Staff?.name ?? a.staff?.name ?? a.staff_id ?? '—';

  const staffHash = (s: string) => {
    // Small deterministic hash so the same staff_id gets the same color.
    let hash = 0;
    for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
    return hash;
  };

  const getStaffColorMeta = (staffId: string | undefined | null) => {
    const id = staffId ? String(staffId) : '';
    if (!id) return { bg: 'bg-salon-sand/30', border: 'border-salon-sand/60', text: 'text-salon-stone' };
    const idx = staffHash(id) % staffPalette.length;
    return staffPalette[idx];
  };

  const getAppointmentStartDate = (a: Appointment): Date | null => {
    const raw = a.start_at ?? a.starts_at ?? '';
    if (!raw) return null;
    const d = new Date(String(raw));
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const getAppointmentEndDate = (a: Appointment, start: Date): Date => {
    const rawEnd = a.end_at ?? a.ends_at ?? '';
    if (!rawEnd) return new Date(start.getTime() + 30 * 60 * 1000);
    const d = new Date(String(rawEnd));
    if (Number.isNaN(d.getTime())) return new Date(start.getTime() + 30 * 60 * 1000);
    return d;
  };

  const filterAppointmentsForSelectedRange = (list: Appointment[]) => {
    if (viewMode !== 'list') return list;

    const focus = parseDateKey(focusDate);
    const effectiveMode = rangeMode;

    const fromKey =
      effectiveMode === 'week'
        ? focusDate
        : effectiveMode === 'month'
          ? (() => formatDateKey(new Date(focus.getFullYear(), focus.getMonth(), 1)))()
          : focusDate;
    const toKey =
      effectiveMode === 'week'
        ? formatDateKey(addDays(focus, 6))
        : effectiveMode === 'month'
          ? (() => formatDateKey(new Date(focus.getFullYear(), focus.getMonth() + 1, 0)))()
          : focusDate;

    const rangeStart = parseDateKey(fromKey);
    const rangeEndExclusive = addDays(parseDateKey(toKey), 1);

    return list.filter((a) => {
      const start = getAppointmentStartDate(a);
      if (!start) return false;
      const end = getAppointmentEndDate(a, start);
      // Overlap check: appointment intersects [rangeStart, rangeEndExclusive)
      return start < rangeEndExclusive && end > rangeStart;
    });
  };

  const loadAppointments = async () => {
    // Clear previous global errors so the UI doesn't get "stuck" in an error-only render.
    setError(null);
    setLoading(true);
    const focus = parseDateKey(focusDate);

    const effectiveMode = viewMode === 'list' ? rangeMode : viewMode;
    const params =
      effectiveMode === 'week'
        ? { from: focusDate, to: formatDateKey(addDays(focus, 6)) }
        : effectiveMode === 'month'
          ? (() => {
              const from = new Date(focus.getFullYear(), focus.getMonth(), 1);
              const to = new Date(focus.getFullYear(), focus.getMonth() + 1, 0);
              return { from: formatDateKey(from), to: formatDateKey(to) };
            })()
          : { from: focusDate, to: focusDate }; // day
    try {
      const res = await appointmentsApi.list(params);
      if ('error' in res && res.error) setError(res.error);
      else if (res.data?.appointments) setAppointments(filterAppointmentsForSelectedRange(res.data.appointments));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load appointments';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [focusDate, viewMode, rangeMode]);

  // Responsive default: on small screens show a single-column day agenda
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth < 768) setViewMode('day');
  }, []);

  useEffect(() => {
    if (viewMode === 'list') setSelectedAppointmentId(null);
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== 'list') setRangeMode(viewMode);
  }, [viewMode]);

  // Lightweight "real-time" sync via polling
  useEffect(() => {
    const id = setInterval(() => {
      if (pollInFlightRef.current) return;
      pollInFlightRef.current = true;
      void loadAppointments().finally(() => {
        pollInFlightRef.current = false;
      });
    }, 5000);
    return () => clearInterval(id);
  }, [viewMode, focusDate, rangeMode]);

  // Preload reference data for walk-in bookings
  useEffect(() => {
    Promise.all([locationsApi.list(), servicesApi.list(), clientsApi.list()]).then(([loc, svc, cls]) => {
      if (!('error' in loc) && loc.data?.locations) setLocations(loc.data.locations);
      if (!('error' in svc) && svc.data?.services) setServices(svc.data.services);
      if (!('error' in cls) && cls.data?.clients) setClients(cls.data.clients);
    });
  }, []);

  const updateStatus = async (id: string, status: string) => {
    setChangingId(id);
    const res = await appointmentsApi.updateStatus(id, status);
    setChangingId(null);
    if ('error' in res && res.error) {
      setError(res.error);
      return;
    }
    setError(null);
    // Refresh list for real-time view
    loadAppointments();
  };

  const rescheduleAppointment = async (id: string, start: Date, end: Date) => {
    setReschedulingId(id);
    const res = await appointmentsApi.reschedule(id, {
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    });
    setReschedulingId(null);

    if ('error' in res && res.error) {
      setError(res.error);
      return;
    }

    // Refresh calendar/list for the updated time window.
    setError(null);
    setSelectedAppointmentId(null);
    loadAppointments();
  };

  const handleWalkInCreate = async () => {
    if (!walkInForm.location_id || !walkInForm.client_id || !walkInForm.service_id || !walkInForm.time) return;
    setWalkInLoading(true);
    setWalkInError(null);
    const startAt = `${walkInForm.date}T${walkInForm.time}:00`;
    const res = await appointmentsApi.create({
      location_id: walkInForm.location_id,
      client_id: walkInForm.client_id,
      staff_id: walkInForm.staff_id,
      service_id: walkInForm.service_id,
      start_at: startAt,
      source: 'walk-in',
      notes: walkInForm.notes,
    });
    setWalkInLoading(false);
    if ('error' in res && res.error) {
      setWalkInError(res.error);
      return;
    }
    setShowWalkIn(false);
    // Reset minimal fields
    setWalkInForm((f) => ({ ...f, notes: 'Walk-in' }));
    loadAppointments();
  };

  // Non-blocking global error handling:
  // - Keep UI mounted (calendar/list + detail panel)
  // - Show errors via toast
  useEffect(() => {
    if (!error) return;
    toast.error(error);
    setError(null);
  }, [error]);

  if (loading && appointments.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
        <Skeleton className="h-[420px] w-full rounded-2xl" />
      </div>
    );
  }

  const statuses = ['scheduled', 'checked_in', 'completed', 'cancelled'] as const;

  const focus = parseDateKey(focusDate);
  const selectedAppointment = selectedAppointmentId ? appointments.find((a) => a.id === selectedAppointmentId) ?? null : null;
  const checkoutAppointment = checkoutAppointmentId ? appointments.find((a) => a.id === checkoutAppointmentId) ?? null : null;

  const openCheckout = (id: string) => {
    setCheckoutAppointmentId(id);
  };

  const moveFocus = (dir: 'prev' | 'next' | 'today') => {
    if (dir === 'today') {
      const d = new Date();
      setFocusDate(formatDateKey(d));
      return;
    }

    const stepMode = viewMode === 'list' ? rangeMode : viewMode;
    if (stepMode === 'day') {
      setFocusDate(formatDateKey(addDays(focus, dir === 'prev' ? -1 : 1)));
      return;
    }

    if (stepMode === 'week') {
      setFocusDate(formatDateKey(addDays(focus, dir === 'prev' ? -7 : 7)));
      return;
    }

    // month
    setFocusDate(formatDateKey(addMonths(focus, dir === 'prev' ? -1 : 1)));
  };

  const navLabel = () => {
    const labelMode = viewMode === 'list' ? rangeMode : viewMode;
    if (labelMode === 'day') {
      return focus.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (labelMode === 'week') {
      const a = focus.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const b = addDays(focus, 6).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      return `${a} - ${b}`;
    }
    // month
    return focus.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-salon-espresso mb-4">{td('calPageTitle')}</h1>
      <div className="flex gap-2 mb-2 flex-wrap items-center">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => moveFocus('prev')} className="size-10 rounded-xl border border-salon-sand/60 bg-salon-cream/50 hover:bg-salon-sand/30 transition-colors text-salon-espresso" aria-label={td('calNavPrevious')}>
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" onClick={() => moveFocus('today')} className="px-3 py-2 rounded-xl text-sm font-semibold border border-salon-sand/60 bg-white hover:bg-salon-cream/50 transition-colors text-salon-stone" aria-label={td('calNavToday')}>
            {td('calNavToday')}
          </button>
          <button type="button" onClick={() => moveFocus('next')} className="size-10 rounded-xl border border-salon-sand/60 bg-salon-cream/50 hover:bg-salon-sand/30 transition-colors text-salon-espresso" aria-label={td('calNavNext')}>
            <ChevronRight className="size-4" />
          </button>
          <span className="ml-2 text-sm font-medium text-salon-stone">{navLabel()}</span>
        </div>

        <div className="flex gap-2 ml-auto">
          <button type="button" onClick={() => setViewMode('list')} className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-salon-gold text-white' : 'bg-salon-sand/40 text-salon-stone hover:bg-salon-sand/60'}`}>{td('calViewList')}</button>
          <button type="button" onClick={() => { setRangeMode('day'); setViewMode('day'); }} className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${viewMode === 'day' ? 'bg-salon-gold text-white' : 'bg-salon-sand/40 text-salon-stone hover:bg-salon-sand/60'}`}>{td('calViewDay')}</button>
          <button type="button" onClick={() => { setRangeMode('week'); setViewMode('week'); }} className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${viewMode === 'week' ? 'bg-salon-gold text-white' : 'bg-salon-sand/40 text-salon-stone hover:bg-salon-sand/60'}`}>{td('calViewWeek')}</button>
          <button type="button" onClick={() => { setRangeMode('month'); setViewMode('month'); }} className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${viewMode === 'month' ? 'bg-salon-gold text-white' : 'bg-salon-sand/40 text-salon-stone hover:bg-salon-sand/60'}`}>{td('calViewMonth')}</button>
        </div>

        <button
          type="button"
          onClick={() => setShowWalkIn(true)}
          className="ml-auto px-4 py-2 rounded-xl text-sm font-semibold bg-salon-espresso text-white hover:bg-salon-bark transition-colors"
        >
          {td('calWalkIn')}
        </button>
      </div>
      {viewMode !== 'list' && (viewMode === 'week' || viewMode === 'month') && (
        <p className="text-xs text-salon-stone mb-4">{td('calStaffColumnsHint')}</p>
      )}

      {viewMode !== 'list' &&
        ((viewMode === 'day' || viewMode === 'week') && appointments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm p-8 text-center text-salon-stone">
            {td('calEmptyListRange')}
          </div>
        ) : (
          <CalendarGrid
            view={viewMode}
            focusDate={focus}
            appointments={appointments}
            changingId={changingId ?? reschedulingId}
            onStatusChange={updateStatus}
            onAppointmentClick={(id) => setSelectedAppointmentId(id)}
            onAppointmentCheckout={openCheckout}
            onReschedule={rescheduleAppointment}
            onDayClick={(d) => {
              setSelectedAppointmentId(null);
              setRangeMode('day');
              setViewMode('day');
              setFocusDate(formatDateKey(d));
            }}
            calendarCopy={{
              weekSubtitle: td('calWeekSubtitle'),
              dayStaffSubtitle: td('calDayStaffSubtitle'),
              emptyRange: td('calEmptyRange'),
              monthTitle: td('calMonthTitle'),
              monthHelp: td('calMonthHelp'),
              monthNoAppointments: td('calMonthNoAppointments'),
              unassigned: td('calUnassigned'),
              placeholderDash: td('calPlaceholderDash'),
              moreAppointments: td('calMoreAppointments'),
              statusScheduled: td('calStatusScheduled'),
              statusCheckedIn: td('calStatusCheckedIn'),
              statusCompleted: td('calStatusCompleted'),
              statusCancelled: td('calStatusCancelled'),
              ariaAppointment: td('calAriaAppointment'),
              checkout: td('calCheckout'),
              dowLabels: calendarDowLabels,
            }}
          />
        ))}

      {viewMode === 'list' && (
        <>
          {/* Mobile: cards */}
          <div className="grid gap-3 sm:hidden">
            {appointments.map((a) => (
              <div key={a.id} className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-salon-espresso">
                      {a.Client?.full_name ?? a.client_id}
                    </p>
                    <p className="text-xs text-salon-stone mt-0.5">
                      {a.Service?.name ?? a.service_id}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {(() => {
                        const staffLabel = getStaffLabel(a);
                        const staffMeta = getStaffColorMeta(a.staff_id);
                        return (
                          <span
                            className={`text-xs px-2 py-1 rounded-full border ${staffMeta.bg} ${staffMeta.border} ${staffMeta.text}`}
                          >
                            {staffLabel}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-xs text-salon-stone mt-1">
                      {(() => {
                        const start = getAppointmentStartDate(a);
                        return start ? start.toLocaleString() : '—';
                      })()}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full border border-salon-sand/60 text-salon-stone">
                    {a.status}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {(a.status === 'scheduled' || a.status === 'checked_in') && (
                    <div>
                      <button
                        type="button"
                        onClick={() => openCheckout(a.id)}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border bg-salon-gold text-white border-salon-gold hover:bg-salon-goldLight"
                      >
                        {td('calCheckout')}
                      </button>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {statuses.map((st) => (
                      <button
                        key={st}
                        type="button"
                        disabled={changingId === a.id || a.status === st}
                        onClick={() => updateStatus(a.id, st)}
                        className={`px-2 py-1 rounded-full text-[11px] border ${
                          a.status === st
                            ? 'bg-salon-gold text-white border-salon-gold'
                            : 'bg-white text-salon-stone border-salon-sand/60 hover:border-salon-gold'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {st.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {appointments.length === 0 && <p className="p-6 text-salon-stone text-center">{td('calEmptyListRange')}</p>}
          </div>

          {/* Desktop/tablet: table */}
          <div className="hidden sm:block bg-white rounded-xl border border-salon-sand/40 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-salon-sand/60">
              <thead className="bg-salon-sand/30">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Start</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Staff</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">{td('calCheckout')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-salon-sand/60">
                {appointments.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3 text-sm text-salon-stone">
                      {(() => {
                        const start = getAppointmentStartDate(a);
                        return start ? start.toLocaleString() : '—';
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm text-salon-espresso">{a.Client?.full_name ?? a.client_id}</td>
                    <td className="px-4 py-3 text-sm text-salon-stone">{a.Service?.name ?? a.service_id}</td>
                    <td className="px-4 py-3 text-sm">
                      {(() => {
                        const staffLabel = getStaffLabel(a);
                        const staffMeta = getStaffColorMeta(a.staff_id);
                        return (
                          <span
                            className={`inline-flex items-center text-xs px-2 py-1 rounded-full border ${staffMeta.bg} ${staffMeta.border} ${staffMeta.text}`}
                          >
                            {staffLabel}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm text-salon-stone">{a.status}</td>
                    <td className="px-4 py-3 text-sm text-salon-stone">
                      {(a.status === 'scheduled' || a.status === 'checked_in') && (
                        <button
                          type="button"
                          onClick={() => openCheckout(a.id)}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border bg-salon-gold text-white border-salon-gold hover:bg-salon-goldLight"
                        >
                          {td('calCheckout')}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-salon-stone">
                      <div className="flex flex-wrap gap-1">
                        {statuses.map((st) => (
                          <button
                            key={st}
                            type="button"
                            disabled={changingId === a.id || a.status === st}
                            onClick={() => updateStatus(a.id, st)}
                            className={`px-2 py-1 rounded-full text-[11px] border ${
                              a.status === st
                                ? 'bg-salon-gold text-white border-salon-gold'
                                : 'bg-white text-salon-stone border-salon-sand/60 hover:border-salon-gold'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                          >
                            {st.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {appointments.length === 0 && <p className="p-6 text-salon-stone text-center">{td('calEmptyListRange')}</p>}
          </div>
        </>
      )}

      {selectedAppointment && selectedAppointmentId && viewMode !== 'list' && (
        <AppointmentDetailPanel
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointmentId(null)}
          onStatusChange={updateStatus}
          changingId={changingId ?? reschedulingId}
          statuses={statuses}
          labels={{
            title: td('apptPanelTitle'),
            statusPrefix: td('apptPanelStatusPrefix'),
            close: td('apptPanelClose'),
            client: td('apptPanelClient'),
            service: td('apptPanelService'),
            staff: td('apptPanelStaff'),
            location: td('apptPanelLocation'),
            time: td('apptPanelTime'),
            updateStatus: td('apptPanelUpdateStatus'),
            updating: td('apptPanelUpdating'),
            tip: td('apptPanelTip'),
            checkout: td('calCheckout'),
          }}
          onCheckout={openCheckout}
        />
      )}

      {checkoutAppointment && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCheckoutAppointmentId(null)} />
          <div className="relative ml-auto h-full w-full max-w-5xl overflow-y-auto border-l border-salon-sand/40 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-salon-espresso">{td('calCheckout')}</h2>
              <button type="button" onClick={() => setCheckoutAppointmentId(null)} className="rounded-lg p-1.5 text-salon-stone hover:bg-salon-sand/40">
                <X className="size-4" />
              </button>
            </div>
            <SaleCheckoutForm
              locationId={String((checkoutAppointment as { branch_id?: string; location_id?: string }).branch_id ?? (checkoutAppointment as { location_id?: string }).location_id ?? '')}
              initialAppointmentId={checkoutAppointment.id}
              appointments={[checkoutAppointment]}
              hideAppointmentPicker
              onSuccess={() => {
                setCheckoutAppointmentId(null);
                loadAppointments();
              }}
            />
          </div>
        </div>
      )}

      {showWalkIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowWalkIn(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold text-salon-espresso">New walk-in appointment</h2>
              <button
                type="button"
                onClick={() => setShowWalkIn(false)}
                className="p-1.5 rounded-lg text-salon-stone hover:bg-salon-sand/40 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {walkInError && (
              <div className="mb-3 p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
                {walkInError}
              </div>
            )}
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-salon-stone mb-1">Location</label>
                <select
                  className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-white text-salon-espresso"
                  value={walkInForm.location_id}
                  onChange={(e) => setWalkInForm((f) => ({ ...f, location_id: e.target.value }))}
                >
                  <option value="">Select location</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-salon-stone mb-1">Client</label>
                <select
                  className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-white text-salon-espresso"
                  value={walkInForm.client_id}
                  onChange={(e) => setWalkInForm((f) => ({ ...f, client_id: e.target.value }))}
                >
                  <option value="">Select client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-salon-stone mb-1">Service</label>
                <select
                  className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-white text-salon-espresso"
                  value={walkInForm.service_id}
                  onChange={(e) => setWalkInForm((f) => ({ ...f, service_id: e.target.value }))}
                >
                  <option value="">Select service</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-salon-stone mb-1">Date</label>
                  <input
                    type="date"
                    className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-white text-salon-espresso"
                    value={walkInForm.date}
                    onChange={(e) => setWalkInForm((f) => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-salon-stone mb-1">Time</label>
                  <input
                    type="time"
                    className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-white text-salon-espresso"
                    value={walkInForm.time}
                    onChange={(e) => setWalkInForm((f) => ({ ...f, time: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-salon-stone mb-1">Notes</label>
                <textarea
                  className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-white text-salon-espresso"
                  rows={2}
                  value={walkInForm.notes}
                  onChange={(e) => setWalkInForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowWalkIn(false)}
                className="px-4 py-2 rounded-xl text-sm border border-salon-sand/60 text-salon-espresso hover:bg-salon-sand/30 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleWalkInCreate}
                disabled={
                  walkInLoading ||
                  !walkInForm.location_id ||
                  !walkInForm.client_id ||
                  !walkInForm.service_id ||
                  !walkInForm.time
                }
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-salon-gold text-white hover:bg-salon-goldLight disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {walkInLoading ? 'Saving…' : 'Save walk-in'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
