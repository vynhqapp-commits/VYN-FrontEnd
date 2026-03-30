'use client';

import React from 'react';
import type { Appointment } from '@/lib/api';

type CalendarView = 'day' | 'week' | 'month';

export default function CalendarGrid({
  view,
  focusDate,
  appointments,
  onStatusChange: _onStatusChange,
  onDayClick,
  onAppointmentClick,
  changingId,
}: {
  view: CalendarView;
  focusDate: Date;
  appointments: Appointment[];
  onStatusChange: (id: string, status: string) => Promise<void>;
  onDayClick?: (date: Date) => void;
  onAppointmentClick?: (id: string) => void;
  changingId: string | null;
}) {
  const HOUR_HEIGHT = 64;
  // Helpers to make calendar alignment timezone-safe.
  // We intentionally DO NOT rely on JS Date parsing for filtering by day, because
  // `new Date(isoWithZ)` converts to local time and can shift the day boundary.
  const pad2 = (n: number) => String(n).padStart(2, '0');

  const dateKeyLocal = (d: Date) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; // local Y-M-D

  const minutesFromDate = (d: Date) => d.getHours() * 60 + d.getMinutes();

  const parseStart = (a: Appointment): Date | null => {
    const raw = a.start_at ?? a.starts_at;
    if (!raw) return null;
    const d = new Date(String(raw));
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const parseEnd = (a: Appointment, start: Date): Date => {
    const raw = a.end_at ?? a.ends_at;
    if (raw) {
      const d = new Date(String(raw));
      if (!Number.isNaN(d.getTime())) return d;
    }
    return new Date(start.getTime() + 30 * 60 * 1000); // default 30 minutes
  };

  const startRange = new Date(focusDate);
  startRange.setHours(0, 0, 0, 0);

  const clientName = (a: Appointment) => a.Client?.full_name ?? a.client_id ?? a.customer_id ?? '—';
  const serviceName = (a: Appointment) => a.Service?.name ?? a.service_id ?? a.services?.[0]?.service?.name ?? '—';

  const statusMeta = (status: string) => {
    if (status === 'scheduled') return { bg: 'bg-salon-gold/15', border: 'border-salon-gold/30', text: 'text-salon-gold', label: 'scheduled' };
    if (status === 'checked_in') return { bg: 'bg-blue-100/80', border: 'border-blue-200', text: 'text-blue-800', label: 'checked in' };
    if (status === 'completed') return { bg: 'bg-emerald-100', border: 'border-emerald-200', text: 'text-emerald-700', label: 'completed' };
    if (status === 'cancelled') return { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-600', label: 'cancelled' };
    return { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-600', label: status };
  };

  const getDayColumns = () => {
    if (view === 'day') return [startRange];
    // week
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startRange);
      d.setDate(d.getDate() + i);
      return d;
    });
  };

  if (view === 'month') {
    const year = focusDate.getFullYear();
    const month = focusDate.getMonth(); // 0-11

    const dateKeyLocal = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const monthStart = new Date(year, month, 1);
    const firstDay = monthStart.getDay(); // 0=Sun
    // Convert to Monday-first offset: Mon => 0 ... Sun => 6
    const offset = (firstDay + 6) % 7;

    const gridStart = new Date(year, month, 1 - offset);
    const cells = Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });

    const monthHasAppointments = appointments.some((a) => {
      const s = parseStart(a);
      return s ? s.getFullYear() === year && s.getMonth() === month : false;
    });

    const apptOn = (d: Date) => {
      const dk = dateKeyLocal(d);
      if (!dk) return [];
      return appointments.filter((a) => {
        const s = parseStart(a);
        return s ? dateKeyLocal(s) === dk : false;
      });
    };

    const fmtMonthDay = (d: Date) =>
      d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });

    return (
      <div className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-salon-sand/30">
          <span className="text-salon-gold font-display font-semibold">Month</span>
          <span className="text-xs text-salon-stone">Click a day to open the agenda view</span>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-7 border-b border-salon-sand/30 bg-salon-cream/60">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((h) => (
                <div key={h} className="px-3 py-2 text-xs font-semibold text-salon-stone">
                  {h}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {!monthHasAppointments ? (
                <div className="col-span-7 py-16 text-center text-salon-stone text-sm">
                  No appointments in this month.
                </div>
              ) : (
                cells.map((d, idx) => {
                const inMonth = d.getMonth() === month;
                const dayAppointments = apptOn(d);
                const top = dayAppointments.slice(0, 3);
                const more = Math.max(0, dayAppointments.length - top.length);

                return (
                  <div
                    key={idx}
                    role="button"
                    tabIndex={0}
                    className={`p-2 text-left border-r border-b border-salon-sand/30 hover:bg-salon-cream/20 transition-colors cursor-pointer ${
                      inMonth ? 'bg-white' : 'bg-salon-cream/20'
                    }`}
                    onClick={() => onDayClick?.(d)}
                    title={fmtMonthDay(d)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') onDayClick?.(d);
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-medium ${inMonth ? 'text-salon-espresso' : 'text-salon-stone/60'}`}>
                        {d.getDate()}
                      </span>
                      {dayAppointments.length > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-salon-gold/10 text-salon-gold border border-salon-gold/20">
                          {dayAppointments.length}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 space-y-1">
                      {top.map((a) => {
                        const meta = statusMeta(a.status);
                        return (
                          <button
                            key={a.id}
                            type="button"
                            className={`rounded-md border px-2 py-1 text-[10px] truncate ${meta.bg} ${meta.border} ${meta.text}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onAppointmentClick?.(a.id);
                            }}
                            aria-label={`Appointment ${a.id}`}
                          >
                            {clientName(a)}
                          </button>
                        );
                      })}
                      {more > 0 && <div className="text-[10px] text-salon-stone/70">+{more} more</div>}
                    </div>
                  </div>
                );
              })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const days = getDayColumns();

  const dayKeys = days.map((d) => dateKeyLocal(d));
  const visibleAppointments = appointments.filter((a) => {
    const s = parseStart(a);
    return s ? dayKeys.includes(dateKeyLocal(s)) : false;
  });

  // Compute a dynamic time range based on the visible appointments.
  // Fallback to 08:00–18:00 if there is no data.
  const fallbackStartHour = 8;
  const fallbackEndHour = 18;

  let minStartMinute: number | null = null;
  let maxEndMinute: number | null = null;

  for (const a of visibleAppointments) {
    const sDate = parseStart(a);
    if (!sDate) continue;
    const eDate = parseEnd(a, sDate);
    const sMin = minutesFromDate(sDate);
    const eMin = minutesFromDate(eDate);
    // Handle if it crosses midnight: treat end as 24:00+minutes for window calculations.
    const crosses = dateKeyLocal(eDate) !== dateKeyLocal(sDate);
    const endWithinDay = crosses ? 1440 : eMin;
    minStartMinute = minStartMinute == null ? sMin : Math.min(minStartMinute, sMin);
    maxEndMinute = maxEndMinute == null ? endWithinDay : Math.max(maxEndMinute, endWithinDay);
  }

  const minMinute = minStartMinute ?? fallbackStartHour * 60;
  const maxMinute = maxEndMinute ?? fallbackEndHour * 60;

  const bufferedStartHour = Math.max(0, Math.floor(minMinute / 60) - 1);
  const bufferedEndHour = Math.min(24, Math.ceil(maxMinute / 60) + 1);

  let startHour = bufferedStartHour;
  let endHour = bufferedEndHour;

  // Ensure at least 4 hours window
  if (endHour - startHour < 4) {
    const center = (startHour + endHour) / 2;
    startHour = Math.max(0, Math.floor(center - 2));
    endHour = Math.min(24, Math.ceil(center + 2));
  }

  const TIME_START = startHour; // hour integer
  const TIME_END = endHour; // exclusive hour integer

  const hours = Array.from({ length: TIME_END - TIME_START }, (_, i) => TIME_START + i);
  const totalHeight = hours.length * HOUR_HEIGHT;

  const appointmentsForDay = (d: Date) => {
    const dk = dateKeyLocal(d);
    return appointments.filter((a) => {
      const s = parseStart(a);
      return s ? dateKeyLocal(s) === dk : false;
    });
  };

  const renderAppointmentBlock = (a: Appointment, day: Date) => {
    const start = parseStart(a);
    if (!start) return null;
    const end = parseEnd(a, start);

    const dayRangeStart = new Date(day);
    dayRangeStart.setHours(TIME_START, 0, 0, 0);
    const dayRangeEnd = new Date(day);
    dayRangeEnd.setHours(TIME_END, 0, 0, 0);

    if (end <= dayRangeStart || start >= dayRangeEnd) return null;

    const clampedStart = start < dayRangeStart ? dayRangeStart : start;
    const clampedEnd = end > dayRangeEnd ? dayRangeEnd : end;

    const durationMinutes = (clampedEnd.getTime() - clampedStart.getTime()) / 60000;
    const minMinutes = 30;
    const desiredHeightMinutes = Math.max(minMinutes, durationMinutes);
    const maxAllowedMinutes = (dayRangeEnd.getTime() - clampedStart.getTime()) / 60000;
    const heightMinutes = Math.min(desiredHeightMinutes, Math.max(minMinutes, maxAllowedMinutes));

    const top = ((clampedStart.getTime() - dayRangeStart.getTime()) / 60000 / 60) * HOUR_HEIGHT;
    const height = (heightMinutes / 60) * HOUR_HEIGHT;

    const meta = statusMeta(a.status);

    return (
      <button
        type="button"
        key={a.id}
        onClick={() => onAppointmentClick?.(a.id)}
        className={`absolute rounded-lg border shadow-sm p-2 text-left cursor-pointer ${meta.bg} ${meta.border} ${meta.text}`}
        style={{ top, height, left: 6, right: 6 } as React.CSSProperties}
        title={`${clientName(a)} - ${serviceName(a)}`}
        aria-label={`Appointment ${a.id}`}
        disabled={changingId === a.id}
      >
        <div className="text-[11px] font-medium truncate">{clientName(a)}</div>
        <div className="text-[10px] truncate opacity-90">{serviceName(a)}</div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-[10px] font-medium">{meta.label}</span>
        </div>
      </button>
    );
  };

  const anyVisible = visibleAppointments.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-salon-sand/30">
        <span className="text-salon-gold font-display font-semibold capitalize">{view}</span>
        <span className="text-xs text-salon-stone">Appointments are shown as blocks by time</span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid" style={{ gridTemplateColumns: `72px repeat(${days.length}, minmax(160px, 1fr))` }}>
            <div />
            {days.map((d) => (
              <div key={d.toISOString()} className="px-3 py-3 text-left text-xs font-semibold text-salon-stone border-b border-salon-sand/30 bg-salon-cream/60">
                {d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
            ))}

            <div className="bg-salon-cream/60" style={{ height: totalHeight }}>
              {hours.map((h, i) => (
                <div key={h} className="h-[64px] border-b border-salon-sand/30 flex items-start justify-end pr-2 pt-2 text-[10px] text-salon-stone">
                  {h}:00
                </div>
              ))}
            </div>

            {days.map((day) => {
              const dayAppointments = appointmentsForDay(day);
              return (
                <div
                  key={day.toISOString()}
                  className="relative border-b border-salon-sand/30"
                  style={{ height: totalHeight }}
                >
                  {hours.map((h, i) => (
                    <div key={h} className="absolute left-0 right-0 border-t border-salon-sand/30" style={{ top: i * HOUR_HEIGHT }} />
                  ))}

                  {dayAppointments.map((a) => renderAppointmentBlock(a, day))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {!anyVisible && (
        <div className="px-6 py-12 text-center text-salon-stone">
          No appointments in this range.
        </div>
      )}
    </div>
  );
}

