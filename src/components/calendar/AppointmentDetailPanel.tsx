'use client';

import React from 'react';
import type { Appointment } from '@/lib/api';
import { X } from 'lucide-react';

export type AppointmentDetailLabels = {
  title: string;
  statusPrefix: string;
  close: string;
  client: string;
  service: string;
  staff: string;
  location: string;
  time: string;
  updateStatus: string;
  updating: string;
  tip: string;
  checkout: string;
};

export default function AppointmentDetailPanel({
  appointment,
  onClose,
  onStatusChange,
  changingId,
  statuses,
  labels,
  onCheckout,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => Promise<void>;
  changingId: string | null;
  statuses: readonly string[];
  labels: AppointmentDetailLabels;
  onCheckout?: (id: string) => void;
}) {
  if (!appointment) return null;

  const startRaw = appointment.start_at ?? appointment.starts_at ?? '';
  const endRaw = appointment.end_at ?? appointment.ends_at ?? '';

  const start = startRaw ? new Date(startRaw) : null;
  const end = endRaw ? new Date(endRaw) : null;

  const clientName =
    appointment.Client?.full_name ?? appointment.client_id ?? appointment.customer_id ?? '—';
  const serviceName =
    appointment.Service?.name ??
    appointment.service_id ??
    appointment.services?.[0]?.service?.name ??
    '—';
  const staffName =
    (appointment.Staff && appointment.Staff.name) ||
    appointment.staff?.name ||
    (appointment as { staff_id?: string }).staff_id ||
    '—';
  const locationName =
    appointment.branch?.name ||
    appointment.Location?.name ||
    (appointment as { branch_id?: string }).branch_id ||
    '—';

  const statusLabel = appointment.status.replace('_', ' ');

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" onClick={onClose} />
      <div
        className="relative mt-auto w-full h-[86vh] max-h-[86vh] rounded-t-2xl border-t border-[var(--elite-border)] bg-[var(--elite-surface)] shadow-xl overflow-y-auto
          md:mt-0 md:ml-auto md:h-full md:max-h-full md:max-w-md md:rounded-none md:border-t-0 md:border-l elite-shell"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-[var(--elite-border)] bg-[var(--elite-surface)]">
          <div>
            <h2 className="font-display text-base font-semibold elite-title">{labels.title}</h2>
            <p className="text-xs elite-subtle mt-1">
              {labels.statusPrefix} {statusLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-lg flex items-center justify-center elite-subtle hover:bg-[var(--elite-card)] transition-colors"
            aria-label={labels.close}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-xs elite-subtle">{labels.client}</p>
              <p className="font-medium elite-title">{clientName}</p>
            </div>
            <div>
              <p className="text-xs elite-subtle">{labels.service}</p>
              <p className="font-medium elite-title">{serviceName}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs elite-subtle">{labels.staff}</p>
                <p className="text-sm elite-title mt-1">{staffName}</p>
              </div>
              <div>
                <p className="text-xs elite-subtle">{labels.location}</p>
                <p className="text-sm elite-title mt-1">{locationName}</p>
              </div>
            </div>
            <div>
              <p className="text-xs elite-subtle">{labels.time}</p>
              <p className="text-sm elite-title mt-1">
                {start && !Number.isNaN(start.getTime()) ? start.toLocaleString() : '—'}
                {end && !Number.isNaN(end.getTime()) ? ` - ${end.toLocaleTimeString()}` : ''}
              </p>
            </div>
          </div>

          {onCheckout && (appointment.status === 'scheduled' || appointment.status === 'checked_in') && (
            <div className="rounded-2xl border border-[var(--elite-border)] bg-[var(--elite-card)] p-4">
              <button
                type="button"
                onClick={() => onCheckout(appointment.id)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border transition-colors elite-btn-primary"
              >
                {labels.checkout}
              </button>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold elite-title">{labels.updateStatus}</p>
              <p className="text-xs elite-subtle">{changingId === appointment.id ? labels.updating : ''}</p>
            </div>
            <div className="rounded-2xl border border-[var(--elite-border)] bg-[var(--elite-card)] p-4">
              <div className="flex flex-wrap gap-2">
                {statuses.map((st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={changingId === appointment.id || appointment.status === st}
                    onClick={() => onStatusChange(appointment.id, st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      appointment.status === st
                        ? 'elite-btn-primary'
                        : 'elite-btn-ghost'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-xs elite-subtle">{labels.tip}</div>
        </div>
      </div>
    </div>
  );
}
