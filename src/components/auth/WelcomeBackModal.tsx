'use client';

import { useEffect, useState } from 'react';
import { X, Sparkles, Calendar, MapPin, User, Clock, ChevronRight } from 'lucide-react';
import { authApi } from '@/lib/api';

interface LinkedSalon {
  salon_id: number;
  salon_name: string;
  salon_logo: string | null;
  customer_name: string;
  appointments: Array<{
    id: number;
    date: string;
    time: string;
    status: string;
    branch: string | null;
    staff: string | null;
    services: Array<{ name: string; price: number }>;
  }>;
}

interface WelcomeBackModalProps {
  open: boolean;
  onClose: () => void;
  userName?: string;
}

export function WelcomeBackModal({ open, onClose, userName }: WelcomeBackModalProps) {
  const [salons, setSalons] = useState<LinkedSalon[]>([]);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const { data } = await authApi.linkedHistory();
        if (data) {
          setSalons(data.salons);
          setTotalAppointments(data.total_appointments);
        }
      } catch (err) {
        console.error('Failed to fetch linked history', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[var(--elite-card)] border border-[var(--elite-border)] rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
        {/* Gradient Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-pink-500 px-6 pt-8 pb-10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-50" />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="relative flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Welcome Back!</h2>
              <p className="text-white/80 text-sm font-medium">
                {userName ? `Great to see you, ${userName}` : 'We recognized you'}
              </p>
            </div>
          </div>
          <p className="relative text-white/90 text-sm leading-relaxed">
            We found your previous visit history and connected it to your new account automatically.
          </p>
        </div>

        {/* Stats Bar */}
        {!loading && salons.length > 0 && (
          <div className="flex items-center gap-4 px-6 py-3 bg-[var(--elite-surface)] border-b border-[var(--elite-border)]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-[var(--elite-text)]">{totalAppointments}</p>
                <p className="text-[10px] uppercase tracking-wider text-[var(--elite-muted)] font-medium">Visits</p>
              </div>
            </div>
            <div className="w-px h-8 bg-[var(--elite-border)]" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-[var(--elite-text)]">{salons.length}</p>
                <p className="text-[10px] uppercase tracking-wider text-[var(--elite-muted)] font-medium">
                  {salons.length === 1 ? 'Salon' : 'Salons'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-4 max-h-[300px] overflow-y-auto elite-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[var(--elite-muted)]">Loading your history...</p>
            </div>
          ) : salons.length === 0 ? (
            <p className="text-center text-sm text-[var(--elite-muted)] py-6">
              Your account has been created successfully!
            </p>
          ) : (
            <div className="space-y-4">
              {salons.map((salon) => (
                <div
                  key={salon.salon_id}
                  className="rounded-xl border border-[var(--elite-border)] bg-[var(--elite-surface)] overflow-hidden"
                >
                  {/* Salon Header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--elite-border)]/50">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {salon.salon_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--elite-text)] truncate">{salon.salon_name}</p>
                      <p className="text-xs text-[var(--elite-muted)]">
                        {salon.appointments.length} visit{salon.appointments.length !== 1 ? 's' : ''} as "{salon.customer_name}"
                      </p>
                    </div>
                  </div>

                  {/* Appointments List */}
                  <div className="divide-y divide-[var(--elite-border)]/30">
                    {salon.appointments.slice(0, 5).map((apt) => (
                      <div key={apt.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-semibold text-[var(--elite-text)]">
                              {apt.services.map(s => s.name).join(', ') || 'Appointment'}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              apt.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' :
                              apt.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                              'bg-blue-500/10 text-blue-500'
                            }`}>
                              {apt.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-[var(--elite-muted)]">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {apt.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {apt.time}
                            </span>
                            {apt.staff && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {apt.staff}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-[var(--elite-muted)] shrink-0" />
                      </div>
                    ))}
                    {salon.appointments.length > 5 && (
                      <div className="px-4 py-2 text-center">
                        <span className="text-xs text-[var(--elite-muted)]">
                          +{salon.appointments.length - 5} more visits
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--elite-border)] bg-[var(--elite-surface)]/50">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold text-sm transition-all shadow-lg shadow-orange-500/20"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
