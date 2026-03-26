'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { appointmentsApi, clientsApi, locationsApi, servicesApi, type Appointment, type Client, type Location, type Service } from '@/lib/api';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'day' | 'week'>('list');
  const [focusDate, setFocusDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [changingId, setChangingId] = useState<string | null>(null);
  const [showWalkIn, setShowWalkIn] = useState(false);

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

  const loadAppointments = () => {
    setLoading(true);
    const params = viewMode === 'list' ? {} : viewMode === 'week'
      ? { from: focusDate, to: new Date(new Date(focusDate).setDate(new Date(focusDate).getDate() + 6)).toISOString().slice(0, 10) }
      : { from: focusDate, to: focusDate };
    appointmentsApi.list(params).then((res) => {
      setLoading(false);
      if ('error' in res && res.error) setError(res.error);
      else if (res.data?.appointments) setAppointments(res.data.appointments);
    });
  };

  useEffect(() => {
    loadAppointments();
  }, [focusDate, viewMode]);

  // Lightweight "real-time" sync via polling
  useEffect(() => {
    if (viewMode === 'list') return;
    const id = setInterval(() => {
      loadAppointments();
    }, 30000);
    return () => clearInterval(id);
  }, [viewMode, focusDate]);

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
    // Refresh list for real-time view
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

  if (loading && appointments.length === 0) return <p className="text-salon-stone">Loading appointments...</p>;
  if (error) return <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl">{error}</div>;

  const statuses = ['scheduled', 'checked_in', 'completed', 'cancelled'] as const;

  const focus = new Date(focusDate);
  const dayStart = new Date(focus);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(focus);
  dayEnd.setHours(23, 59, 59, 999);
  const weekDays = viewMode === 'week' ? Array.from({ length: 7 }, (_, i) => { const d = new Date(focus); d.setDate(d.getDate() + i); return d; }) : [focus];
  const slots = Array.from({ length: 10 }, (_, i) => i + 9);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-salon-espresso mb-4">Calendar / Appointments</h1>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <input type="date" value={focusDate} onChange={(e) => setFocusDate(e.target.value)} className="border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-salon-espresso focus:outline-none focus:ring-2 focus:ring-salon-gold/40" />
        <button type="button" onClick={() => setViewMode('list')} className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-salon-gold text-white' : 'bg-salon-sand/40 text-salon-stone hover:bg-salon-sand/60'}`}>List</button>
        <button type="button" onClick={() => setViewMode('day')} className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${viewMode === 'day' ? 'bg-salon-gold text-white' : 'bg-salon-sand/40 text-salon-stone hover:bg-salon-sand/60'}`}>Day</button>
        <button type="button" onClick={() => setViewMode('week')} className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${viewMode === 'week' ? 'bg-salon-gold text-white' : 'bg-salon-sand/40 text-salon-stone hover:bg-salon-sand/60'}`}>Week</button>
        <button
          type="button"
          onClick={() => setShowWalkIn(true)}
          className="ml-auto px-4 py-2 rounded-xl text-sm font-semibold bg-salon-espresso text-white hover:bg-salon-bark transition-colors"
        >
          + Walk-in booking
        </button>
      </div>

      {(viewMode === 'day' || viewMode === 'week') && (
        <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-salon-sand/60">
                <th className="w-16 p-3 text-left text-xs font-semibold text-salon-stone">Time</th>
                {weekDays.map((d) => (
                  <th key={d.toISOString()} className="p-3 min-w-[120px] text-left text-xs font-semibold text-salon-stone">
                    {d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((hour) => (
                <tr key={hour} className="border-b border-salon-sand/40">
                  <td className="p-2 text-sm text-salon-stone">{hour}:00</td>
                  {weekDays.map((d) => {
                    const cellStart = new Date(d);
                    cellStart.setHours(hour, 0, 0, 0);
                    const cellEnd = new Date(d);
                    cellEnd.setHours(hour + 1, 0, 0, 0);
                    const inCell = appointments.filter((a) => {
                      const start = new Date(a.start_at ?? '');
                      return start >= cellStart && start < cellEnd;
                    });
                    return (
                      <td key={d.toISOString() + hour} className="p-1 align-top">
                        {inCell.map((a) => (
                          <div key={a.id} className="text-xs bg-salon-gold/10 border border-salon-gold/20 rounded-lg p-2 mb-1">
                            <div className="font-medium text-salon-espresso">{a.Client?.full_name ?? a.client_id}</div>
                            <div className="text-salon-stone">{a.Service?.name}</div>
                          <div className="flex items-center justify-between gap-2 mt-1">
                            <span className="text-salon-stone">{a.status}</span>
                            <div className="flex gap-1">
                              {statuses.map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  disabled={changingId === a.id || a.status === st}
                                  onClick={() => updateStatus(a.id, st)}
                                  className={`px-2 py-0.5 rounded-full text-[10px] border ${
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
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
                    <p className="text-xs text-salon-stone mt-1">
                      {isNaN(new Date(a.start_at ?? '').getTime()) ? '—' : new Date(a.start_at ?? '').toLocaleString()}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full border border-salon-sand/60 text-salon-stone">
                    {a.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
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
            ))}
            {appointments.length === 0 && <p className="p-6 text-salon-stone text-center">No appointments found.</p>}
          </div>

          {/* Desktop/tablet: table */}
          <div className="hidden sm:block bg-white rounded-xl border border-salon-sand/40 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-salon-sand/60">
              <thead className="bg-salon-sand/30">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Start</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-salon-sand/60">
                {appointments.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3 text-sm text-salon-stone">
                      {isNaN(new Date(a.start_at ?? '').getTime()) ? '—' : new Date(a.start_at ?? '').toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-salon-espresso">{a.Client?.full_name ?? a.client_id}</td>
                    <td className="px-4 py-3 text-sm text-salon-stone">{a.Service?.name ?? a.service_id}</td>
                    <td className="px-4 py-3 text-sm text-salon-stone">{a.status}</td>
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
            {appointments.length === 0 && <p className="p-6 text-salon-stone text-center">No appointments found.</p>}
          </div>
        </>
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
