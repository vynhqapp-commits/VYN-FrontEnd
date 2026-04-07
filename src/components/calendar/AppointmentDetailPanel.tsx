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
};

export default function AppointmentDetailPanel({
  appointment,
  onClose,
  onStatusChange,
  changingId,
  statuses,
  labels,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => Promise<void>;
  changingId: string | null;
  statuses: readonly string[];
  labels: AppointmentDetailLabels;
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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative ml-auto w-full max-w-md bg-white h-full shadow-xl border-l border-salon-sand/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-salon-sand/30">
          <div>
            <h2 className="font-display text-base font-semibold text-salon-espresso">{labels.title}</h2>
            <p className="text-xs text-salon-stone mt-1">
              {labels.statusPrefix} {statusLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-lg flex items-center justify-center text-salon-stone hover:bg-salon-sand/40 transition-colors"
            aria-label={labels.close}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-xs text-salon-stone">{labels.client}</p>
              <p className="font-medium text-salon-espresso">{clientName}</p>
            </div>
            <div>
              <p className="text-xs text-salon-stone">{labels.service}</p>
              <p className="font-medium text-salon-espresso">{serviceName}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-salon-stone">{labels.staff}</p>
                <p className="text-sm text-salon-espresso mt-1">{staffName}</p>
              </div>
              <div>
                <p className="text-xs text-salon-stone">{labels.location}</p>
                <p className="text-sm text-salon-espresso mt-1">{locationName}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-salon-stone">{labels.time}</p>
              <p className="text-sm text-salon-espresso mt-1">
                {start && !Number.isNaN(start.getTime()) ? start.toLocaleString() : '—'}
                {end && !Number.isNaN(end.getTime()) ? ` - ${end.toLocaleTimeString()}` : ''}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-salon-sand/40 bg-salon-cream/30 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-salon-espresso">{labels.updateStatus}</p>
              <p className="text-xs text-salon-stone">{changingId === appointment.id ? labels.updating : ''}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {statuses.map((st) => (
                <button
                  key={st}
                  type="button"
                  disabled={changingId === appointment.id || appointment.status === st}
                  onClick={() => onStatusChange(appointment.id, st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    appointment.status === st
                      ? 'bg-salon-gold text-white border-salon-gold'
                      : 'bg-white text-salon-stone border-salon-sand/60 hover:border-salon-gold'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-salon-stone">{labels.tip}</div>
        </div>
      </div>
    </div>
  );
}
