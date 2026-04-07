'use client';

import React from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Appointment } from '@/lib/api';

type CalendarView = 'day' | 'week' | 'month';

const DEFAULT_DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export type CalendarGridStrings = {
  weekSubtitle: string;
  dayStaffSubtitle: string;
  emptyRange: string;
  monthTitle: string;
  monthHelp: string;
  monthNoAppointments: string;
  unassigned: string;
  placeholderDash: string;
  moreAppointments: string;
  statusScheduled: string;
  statusCheckedIn: string;
  statusCompleted: string;
  statusCancelled: string;
  ariaAppointment: string;
};

const defaultCalendarCopy: CalendarGridStrings = {
  weekSubtitle: 'Appointments are shown as blocks by time',
  dayStaffSubtitle:
    'One column per staff member. Drag-and-drop updates time only (staff unchanged until the API supports it).',
  emptyRange: 'No appointments in this range.',
  monthTitle: 'Month',
  monthHelp: 'Click a day to open the agenda view',
  monthNoAppointments: 'No appointments in this month.',
  unassigned: 'Unassigned',
  placeholderDash: '—',
  moreAppointments: '+{count} more',
  statusScheduled: 'scheduled',
  statusCheckedIn: 'checked in',
  statusCompleted: 'completed',
  statusCancelled: 'cancelled',
  ariaAppointment: 'Appointment {id}',
};

export type CalendarGridCopy = Partial<CalendarGridStrings> & {
  dowLabels?: readonly string[];
};

function appointmentDragId(id: string) {
  return `appointment-${id}`;
}

type DropMonthData = { kind: 'month'; day: Date };
type DropTimeData = { kind: 'time'; day: Date; timeStart: number; timeEnd: number; hourHeight: number };

function MonthDayDroppable({
  id,
  day,
  children,
  className,
  onPointerClick,
  title,
  onKeyDown,
}: {
  id: string;
  day: Date;
  children: React.ReactNode;
  className: string;
  onPointerClick: () => void;
  title: string;
  onKeyDown: (e: React.KeyboardEvent) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { kind: 'month', day } satisfies DropMonthData,
  });
  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      className={`${className} ${isOver ? 'ring-2 ring-salon-gold/40 ring-inset' : ''}`}
      onClick={onPointerClick}
      title={title}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  );
}

function MonthDraggableChip({
  appt,
  className,
  disabled,
  ariaLabel,
  onOpen,
  children,
}: {
  appt: Appointment;
  className: string;
  disabled: boolean;
  ariaLabel: string;
  onOpen: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appointmentDragId(appt.id),
    disabled,
    data: { appointment: appt },
  });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    ...(isDragging ? { zIndex: 30, position: 'relative' as const } : {}),
  };
  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      {...listeners}
      {...attributes}
      className={className}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        if (!isDragging) onOpen();
      }}
    >
      {children}
    </button>
  );
}

function TimeColumnDroppable({
  id,
  data,
  height,
  staffColumnLayout,
  children,
}: {
  id: string;
  data: DropTimeData;
  height: number;
  staffColumnLayout?: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data });
  return (
    <div
      ref={setNodeRef}
      className={`relative border-b border-salon-sand/30 ${staffColumnLayout ? 'border-l border-salon-sand/20' : ''} ${isOver ? 'bg-salon-gold/5' : ''}`}
      style={{ height }}
    >
      {children}
    </div>
  );
}

function TimeDraggableBlock({
  appt,
  disabled,
  className,
  style,
  title,
  ariaLabel,
  onOpen,
  children,
}: {
  appt: Appointment;
  disabled: boolean;
  className: string;
  style: React.CSSProperties;
  title: string;
  ariaLabel: string;
  onOpen: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appointmentDragId(appt.id),
    disabled,
    data: { appointment: appt },
  });
  const merged: React.CSSProperties = {
    ...style,
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    zIndex: isDragging ? 40 : undefined,
  };
  return (
    <button
      ref={setNodeRef}
      type="button"
      style={merged}
      {...listeners}
      {...attributes}
      className={className}
      title={title}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => {
        if (!isDragging) onOpen();
      }}
    >
      {children}
    </button>
  );
}

export default function CalendarGrid({
  view,
  focusDate,
  appointments,
  onStatusChange: _onStatusChange,
  onDayClick,
  onAppointmentClick,
  changingId,
  onReschedule,
  calendarCopy,
}: {
  view: CalendarView;
  focusDate: Date;
  appointments: Appointment[];
  onStatusChange: (id: string, status: string) => Promise<void>;
  onDayClick?: (date: Date) => void;
  onAppointmentClick?: (id: string) => void;
  changingId: string | null;
  onReschedule?: (id: string, start: Date, end: Date) => Promise<void>;
  calendarCopy?: CalendarGridCopy;
}) {
  const copy = { ...defaultCalendarCopy, ...calendarCopy };
  const dowLabels = (copy.dowLabels?.length === 7 ? copy.dowLabels : DEFAULT_DOW) as readonly string[];

  const HOUR_HEIGHT = 64;
  const pad2 = (n: number) => String(n).padStart(2, '0');

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

  const getStaffId = (a: Appointment): string | null => {
    const v = a.staff_id ?? a.staff?.id ?? a.Staff?.id;
    return v != null && String(v) !== '' ? String(v) : null;
  };

  const staffName = (a: Appointment) => a.Staff?.name ?? a.staff?.name ?? a.staff_id ?? copy.placeholderDash;

  type StaffColumn = { key: string; label: string; staffId: string | null };

  const buildStaffColumnsForDay = (dayApps: Appointment[]): StaffColumn[] => {
    const byStaff = new Map<string, string>();
    let hasUnassigned = false;
    for (const a of dayApps) {
      const sid = getStaffId(a);
      if (!sid) hasUnassigned = true;
      else if (!byStaff.has(sid)) byStaff.set(sid, staffName(a));
    }
    const cols: StaffColumn[] = [...byStaff.entries()]
      .sort((x, y) => x[1].localeCompare(y[1]))
      .map(([id, label]) => ({ key: `staff-${id}`, label, staffId: id }));
    if (hasUnassigned) {
      cols.push({ key: 'unassigned', label: copy.unassigned, staffId: null });
    }
    if (cols.length === 0) {
      cols.push({ key: 'placeholder', label: copy.placeholderDash, staffId: '__none__' });
    }
    return cols;
  };

  const appointmentInStaffColumn = (a: Appointment, col: StaffColumn): boolean => {
    if (col.staffId === '__none__') return false;
    const sid = getStaffId(a);
    if (col.staffId === null) return sid === null;
    return sid === col.staffId;
  };

  const staffHash = (s: string) => {
    let hash = 0;
    for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
    return hash;
  };

  const staffColorMeta = (staffId: string | undefined | null) => {
    const id = staffId ? String(staffId) : '';
    if (!id) return { bg: 'bg-salon-sand/30', border: 'border-salon-sand/60', text: 'text-salon-stone' };
    const idx = staffHash(id) % staffPalette.length;
    return staffPalette[idx];
  };

  const ACTIVE_STATUSES = ['pending', 'scheduled', 'confirmed', 'checked_in'] as const;
  const isActiveStatus = (status: string) => (ACTIVE_STATUSES as readonly string[]).includes(status);

  const dateKeyLocal = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

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
    return new Date(start.getTime() + 30 * 60 * 1000);
  };

  const startRange = new Date(focusDate);
  startRange.setHours(0, 0, 0, 0);

  const clientName = (a: Appointment) => a.Client?.full_name ?? a.client_id ?? a.customer_id ?? copy.placeholderDash;
  const serviceName = (a: Appointment) =>
    a.Service?.name ?? a.service_id ?? a.services?.[0]?.service?.name ?? copy.placeholderDash;

  const statusMeta = (status: string) => {
    if (status === 'scheduled')
      return {
        bg: 'bg-salon-gold/15',
        border: 'border-salon-gold/30',
        text: 'text-salon-gold',
        label: copy.statusScheduled,
      };
    if (status === 'checked_in')
      return { bg: 'bg-blue-100/80', border: 'border-blue-200', text: 'text-blue-800', label: copy.statusCheckedIn };
    if (status === 'completed')
      return { bg: 'bg-emerald-100', border: 'border-emerald-200', text: 'text-emerald-700', label: copy.statusCompleted };
    if (status === 'cancelled')
      return { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-600', label: copy.statusCancelled };
    return { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-600', label: status };
  };

  const getDayColumns = () => {
    if (view === 'day') return [startRange];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startRange);
      d.setDate(d.getDate() + i);
      return d;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleMonthDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      if (!onReschedule) return;
      const { active, over } = event;
      if (!over) return;
      const appt = active.data.current?.appointment as Appointment | undefined;
      if (!appt) return;
      const drop = over.data.current as DropMonthData | undefined;
      if (!drop || drop.kind !== 'month') return;

      const draggedStart = parseStart(appt);
      if (!draggedStart) return;
      const draggedEnd = parseEnd(appt, draggedStart);
      const durationMinutes = Math.max(1, Math.round((draggedEnd.getTime() - draggedStart.getTime()) / 60000));

      const newStart = new Date(drop.day);
      newStart.setHours(draggedStart.getHours(), draggedStart.getMinutes(), 0, 0);
      const newEnd = new Date(newStart.getTime() + durationMinutes * 60000);
      void onReschedule(appt.id, newStart, newEnd);
    },
    [onReschedule, appointments],
  );

  const handleTimeDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      if (!onReschedule) return;
      const { active, over } = event;
      if (!over) return;
      const appt = active.data.current?.appointment as Appointment | undefined;
      if (!appt) return;
      const drop = over.data.current as DropTimeData | undefined;
      if (!drop || drop.kind !== 'time') return;

      const draggedStart = parseStart(appt);
      if (!draggedStart) return;
      const draggedEnd = parseEnd(appt, draggedStart);
      const durationMinutes = Math.max(1, Math.round((draggedEnd.getTime() - draggedStart.getTime()) / 60000));

      const translated = active.rect.current.translated;
      if (!translated) return;
      const relY = translated.top + translated.height / 2 - over.rect.top;
      const minutesFromVisibleStart = (relY / drop.hourHeight) * 60;
      const snappedMinutes = Math.round(minutesFromVisibleStart / 30) * 30;

      const dayStartAbs = drop.timeStart * 60;
      const dayEndAbs = drop.timeEnd * 60;

      let newStartAbs = dayStartAbs + snappedMinutes;
      const maxStartAbs = dayEndAbs - durationMinutes;
      if (maxStartAbs < dayStartAbs) return;

      newStartAbs = Math.max(dayStartAbs, Math.min(newStartAbs, maxStartAbs));
      const newEndAbs = newStartAbs + durationMinutes;

      const newStart = new Date(drop.day);
      newStart.setHours(Math.floor(newStartAbs / 60), newStartAbs % 60, 0, 0);
      const newEnd = new Date(drop.day);
      newEnd.setHours(Math.floor(newEndAbs / 60), newEndAbs % 60, 0, 0);

      void onReschedule(appt.id, newStart, newEnd);
    },
    [onReschedule],
  );

  if (view === 'month') {
    const year = focusDate.getFullYear();
    const month = focusDate.getMonth();

    const monthStart = new Date(year, month, 1);
    const firstDay = monthStart.getDay();
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
      return appointments.filter((a) => {
        const s = parseStart(a);
        return s ? dateKeyLocal(s) === dk : false;
      });
    };

    const fmtMonthDay = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });

    return (
      <DndContext sensors={sensors} onDragEnd={handleMonthDragEnd}>
        <div className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-salon-sand/30">
            <span className="text-salon-gold font-display font-semibold">{copy.monthTitle}</span>
            <span className="text-xs text-salon-stone">{copy.monthHelp}</span>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-7 border-b border-salon-sand/30 bg-salon-cream/60">
                {dowLabels.map((h) => (
                  <div key={h} className="px-3 py-2 text-xs font-semibold text-salon-stone">
                    {h}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {!monthHasAppointments ? (
                  <div className="col-span-7 py-16 text-center text-salon-stone text-sm">{copy.monthNoAppointments}</div>
                ) : (
                  cells.map((d, idx) => {
                    const inMonth = d.getMonth() === month;
                    const dayAppointments = apptOn(d);
                    const top = dayAppointments.slice(0, 3);
                    const more = Math.max(0, dayAppointments.length - top.length);
                    const dk = dateKeyLocal(d);

                    return (
                      <MonthDayDroppable
                        key={idx}
                        id={`month-cell-${dk}`}
                        day={d}
                        className={`p-2 text-left border-r border-b border-salon-sand/30 hover:bg-salon-cream/20 transition-colors cursor-pointer ${
                          inMonth ? 'bg-white' : 'bg-salon-cream/20'
                        }`}
                        title={fmtMonthDay(d)}
                        onPointerClick={() => onDayClick?.(d)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') onDayClick?.(d);
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-sm font-medium ${inMonth ? 'text-salon-espresso' : 'text-salon-stone/60'}`}
                          >
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
                            const staffMeta = staffColorMeta(getStaffId(a));
                            const draggable = isActiveStatus(a.status) && changingId !== a.id;
                            const aria = copy.ariaAppointment.replace('{id}', a.id);
                            return (
                              <MonthDraggableChip
                                key={a.id}
                                appt={a}
                                disabled={!draggable}
                                ariaLabel={aria}
                                onOpen={() => onAppointmentClick?.(a.id)}
                                className={`w-full text-left rounded-md border px-2 py-1 text-[10px] truncate ${staffMeta.bg} ${staffMeta.border} ${staffMeta.text}`}
                              >
                                {clientName(a)}
                              </MonthDraggableChip>
                            );
                          })}
                          {more > 0 && (
                            <div className="text-[10px] text-salon-stone/70">
                              {copy.moreAppointments.replace('{count}', String(more))}
                            </div>
                          )}
                        </div>
                      </MonthDayDroppable>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </DndContext>
    );
  }

  const days = getDayColumns();

  const dayKeys = days.map((d) => dateKeyLocal(d));
  const visibleAppointments = appointments.filter((a) => {
    const s = parseStart(a);
    return s ? dayKeys.includes(dateKeyLocal(s)) : false;
  });

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

  if (endHour - startHour < 4) {
    const center = (startHour + endHour) / 2;
    startHour = Math.max(0, Math.floor(center - 2));
    endHour = Math.min(24, Math.ceil(center + 2));
  }

  const TIME_START = startHour;
  const TIME_END = endHour;

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

    const statusMetaForBlock = statusMeta(a.status);
    const staffMeta = staffColorMeta(getStaffId(a));
    const draggable = isActiveStatus(a.status) && changingId !== a.id;

    return (
      <TimeDraggableBlock
        key={a.id}
        appt={a}
        disabled={!draggable}
        className={`absolute rounded-lg border shadow-sm p-2 text-left cursor-pointer touch-none ${staffMeta.bg} ${staffMeta.border} ${staffMeta.text}`}
        style={{ top, height, left: 6, right: 6 } as React.CSSProperties}
        title={`${clientName(a)} - ${serviceName(a)} - ${staffName(a)}`}
        ariaLabel={`${copy.ariaAppointment.replace('{id}', a.id)} (${staffName(a)})`}
        onOpen={() => onAppointmentClick?.(a.id)}
      >
        <div className="text-[11px] font-medium truncate">{clientName(a)}</div>
        <div className="text-[10px] truncate opacity-90">
          {serviceName(a)} • {staffName(a)}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-[10px] font-medium">{statusMetaForBlock.label}</span>
        </div>
      </TimeDraggableBlock>
    );
  };

  const anyVisible = visibleAppointments.length > 0;

  const dayViewStaffMode = view === 'day';
  const singleDay = days[0];
  const dayAppointmentsForStaff = singleDay ? appointmentsForDay(singleDay) : [];
  const staffColumns = dayViewStaffMode ? buildStaffColumnsForDay(dayAppointmentsForStaff) : [];
  const gridColumnCount = dayViewStaffMode ? staffColumns.length : days.length;

  const timeDropData = (day: Date): DropTimeData => ({
    kind: 'time',
    day,
    timeStart: TIME_START,
    timeEnd: TIME_END,
    hourHeight: HOUR_HEIGHT,
  });

  return (
    <DndContext sensors={sensors} onDragEnd={handleTimeDragEnd}>
      <div className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm overflow-hidden">
        <div className="flex flex-col gap-1 px-5 py-4 border-b border-salon-sand/30 sm:flex-row sm:items-center sm:gap-2">
          <span className="text-salon-gold font-display font-semibold capitalize">{view}</span>
          <span className="text-xs text-salon-stone">
            {dayViewStaffMode ? copy.dayStaffSubtitle : copy.weekSubtitle}
          </span>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div
              className="grid"
              style={{ gridTemplateColumns: `72px repeat(${gridColumnCount}, minmax(140px, 1fr))` }}
            >
              <div />
              {dayViewStaffMode && singleDay
                ? staffColumns.map((col) => {
                    const chipMeta =
                      col.staffId && col.staffId !== '__none__'
                        ? staffColorMeta(col.staffId)
                        : { bg: 'bg-salon-sand/50', border: 'border-salon-sand/60', text: 'text-salon-stone' };
                    return (
                      <div
                        key={col.key}
                        className="px-2 py-3 text-left border-b border-salon-sand/30 bg-salon-cream/60"
                      >
                        <p className="text-[10px] font-medium text-salon-stone/80 mb-1">
                          {singleDay.toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`shrink-0 w-2.5 h-2.5 rounded-full border ${chipMeta.bg} ${chipMeta.border}`}
                            aria-hidden
                          />
                          <span className="text-xs font-semibold text-salon-stone truncate">{col.label}</span>
                        </div>
                      </div>
                    );
                  })
                : days.map((d) => (
                    <div
                      key={d.toISOString()}
                      className="px-3 py-3 text-left text-xs font-semibold text-salon-stone border-b border-salon-sand/30 bg-salon-cream/60"
                    >
                      {d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                  ))}

              <div className="bg-salon-cream/60" style={{ height: totalHeight }}>
                {hours.map((h) => (
                  <div
                    key={h}
                    className="h-[64px] border-b border-salon-sand/30 flex items-start justify-end pr-2 pt-2 text-[10px] text-salon-stone"
                  >
                    {h}:00
                  </div>
                ))}
              </div>

              {dayViewStaffMode && singleDay
                ? staffColumns.map((col) => {
                    const dk = dateKeyLocal(singleDay);
                    const sid = col.staffId === '__none__' ? 'none' : String(col.staffId ?? 'unassigned');
                    return (
                      <TimeColumnDroppable
                        key={col.key}
                        id={`time-col-${dk}--${sid}`}
                        data={timeDropData(singleDay)}
                        height={totalHeight}
                        staffColumnLayout
                      >
                        {hours.map((h, i) => (
                          <div
                            key={h}
                            className="absolute left-0 right-0 border-t border-salon-sand/30"
                            style={{ top: i * HOUR_HEIGHT }}
                          />
                        ))}
                        {dayAppointmentsForStaff
                          .filter((a) => appointmentInStaffColumn(a, col))
                          .map((a) => renderAppointmentBlock(a, singleDay))}
                      </TimeColumnDroppable>
                    );
                  })
                : days.map((day) => {
                    const dk = dateKeyLocal(day);
                    return (
                      <TimeColumnDroppable
                        key={day.toISOString()}
                        id={`time-col-${dk}--all`}
                        data={timeDropData(day)}
                        height={totalHeight}
                      >
                        {hours.map((h, i) => (
                          <div
                            key={h}
                            className="absolute left-0 right-0 border-t border-salon-sand/30"
                            style={{ top: i * HOUR_HEIGHT }}
                          />
                        ))}
                        {appointmentsForDay(day).map((a) => renderAppointmentBlock(a, day))}
                      </TimeColumnDroppable>
                    );
                  })}
            </div>
          </div>
        </div>

        {!anyVisible && (
          <div className="px-6 py-12 text-center text-salon-stone">{copy.emptyRange}</div>
        )}
      </div>
    </DndContext>
  );
}
