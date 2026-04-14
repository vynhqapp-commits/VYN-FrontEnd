'use client';

import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarDays, CreditCard, LayoutDashboard, Users, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  appointmentsApi,
  clientsApi,
  locationsApi,
  settingsApi,
  staffApi,
  transactionsApi,
  type Appointment,
  type Location,
  type StaffMember,
  type Transaction,
} from '@/lib/api';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { useAuth } from '@/lib/auth-context';

type ApptRow = {
  id: string;
  client: string;
  service: string;
  time: string;
  status: string;
};

type ActivityRow = {
  id: string;
  title: string;
  text: string;
  when: string;
  at: string;
};

function statusVariant(status: string) {
  if (status === 'confirmed') return 'success';
  if (status === 'scheduled') return 'warning';
  if (status === 'checked_in' || status === 'in_progress') return 'secondary';
  if (status === 'cancelled') return 'destructive';
  return 'muted';
}

/** Local calendar Y-m-d (avoids UTC drift from toISOString). */
function localCalendarDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function sumSales(rows: Transaction[]) {
  return rows.reduce((acc, s) => acc + Number(s.total ?? 0), 0);
}

function humanAgo(iso?: string) {
  if (!iso) return 'now';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.floor(diff / 60000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function formatMoney(amount: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  } catch {
    return `${Number(amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currencyCode}`;
  }
}

function appointmentCalendarDay(a: Appointment) {
  const iso = a.start_at ?? a.starts_at;
  if (!iso) return '';
  return localCalendarDay(new Date(iso));
}

/** Prefer booking creation time for “recent activity”; fall back to last update or start time. */
function appointmentActivityInstant(a: Appointment): string {
  return (
    (a.created_at && String(a.created_at)) ||
    (a.updated_at && String(a.updated_at)) ||
    (a.start_at && String(a.start_at)) ||
    (a.starts_at && String(a.starts_at)) ||
    ''
  );
}

function appointmentActivityTitle(status: string) {
  if (status === 'cancelled') return 'Cancellation';
  if (status === 'completed') return 'Completed';
  if (status === 'no_show') return 'No-show';
  if (status === 'in_progress') return 'In progress';
  if (status === 'checked_in') return 'Checked in';
  return 'New booking';
}

function clientDisplayName(a: Appointment) {
  const n = a.Client?.full_name?.trim();
  return n || 'Walk-in';
}

function serviceDisplayName(a: Appointment) {
  return a.Service?.name || a.services?.[0]?.service?.name || 'Service';
}

function activitySortMs(iso: string) {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function staffBranchId(s: StaffMember) {
  return s.branch_id ?? s.branch?.id ?? '';
}

/** API ids may be number; `<select>` values are always strings — strict `===` breaks label + filters. */
function sameRecordId(a: unknown, b: unknown) {
  return String(a ?? '') === String(b ?? '');
}

/** JS getDay(): 0=Sun … 6=Sat — matches `staff_schedules.day_of_week` on the API. */
function parseScheduleTimeToMinutes(t: string): number | null {
  const m = String(t).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function isScheduledToWorkToday(s: StaffMember, now: Date): boolean {
  const dow = now.getDay();
  const row = (s.schedules ?? []).find((r) => r.day_of_week === dow);
  if (!row) return false;
  if (row.is_day_off) return false;
  return true;
}

function isWithinShiftNow(s: StaffMember, now: Date): boolean {
  if (!isScheduledToWorkToday(s, now)) return false;
  const dow = now.getDay();
  const row = (s.schedules ?? []).find((r) => r.day_of_week === dow);
  if (!row) return false;
  const start = parseScheduleTimeToMinutes(String(row.start_time ?? ''));
  const end = parseScheduleTimeToMinutes(String(row.end_time ?? ''));
  if (start == null || end == null) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  if (end >= start) {
    return cur >= start && cur <= end;
  }
  return cur >= start || cur <= end;
}

function computeStaffKpi(staffForKpi: StaffMember[], now: Date) {
  const team = staffForKpi.length;
  const hasSchedules = staffForKpi.some((s) => (s.schedules?.length ?? 0) > 0);
  const scheduledToday = staffForKpi.filter((s) => isScheduledToWorkToday(s, now)).length;
  const inShiftNow = staffForKpi.filter((s) => isWithinShiftNow(s, now)).length;
  if (hasSchedules) {
    return {
      staffCardMode: 'schedule' as const,
      staffMain: inShiftNow,
      staffSub: `${scheduledToday} scheduled today · ${team} in team`,
    };
  }
  return {
    staffCardMode: 'team' as const,
    staffMain: team,
    staffSub:
      team === 1
        ? '1 active — set weekly hours under Staff for on-duty counts'
        : `${team} active — set weekly hours under Staff for on-duty counts`,
  };
}

type StaffCardMode = 'schedule' | 'team';

type DashboardStats = {
  todayRevenue: number;
  revenueDeltaPct: number;
  totalBookings: number;
  upcomingBookings: number;
  activeClients: number;
  staffCardMode: StaffCardMode;
  staffMain: number;
  staffSub: string;
};

const EMPTY_STATS: DashboardStats = {
  todayRevenue: 0,
  revenueDeltaPct: 0,
  totalBookings: 0,
  upcomingBookings: 0,
  activeClients: 0,
  staffCardMode: 'team',
  staffMain: 0,
  staffSub: '',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);
  /** `null` while resolving locations; `''` if none exist; otherwise selected branch id (dashboard is always branch-scoped). */
  const [branchFilter, setBranchFilter] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [appointments, setAppointments] = useState<ApptRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [revenueSeries, setRevenueSeries] = useState<{ day: string; revenue: number }[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ ...EMPTY_STATS });

  const money = useMemo(() => {
    return (n: number) => {
      try {
        return new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency,
          maximumFractionDigits: 2,
        }).format(Number(n || 0));
      } catch {
        return `${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
      }
    };
  }, [currency]);

  useEffect(() => {
    locationsApi.list().then((res) => {
      if ('error' in res && res.error) {
        toast.error(res.error);
        setLocations([]);
        setBranchFilter('');
        return;
      }
      const locs = res.data?.locations ?? [];
      setLocations(locs);
      setBranchFilter((prev) => {
        if (locs.length === 0) return '';
        const validPrev =
          prev && prev !== '' && locs.some((l) => sameRecordId(l.id, prev)) ? prev : null;
        return validPrev != null ? String(validPrev) : String(locs[0]!.id);
      });
    });
  }, []);

  useEffect(() => {
    if (branchFilter === null) return;

    if (branchFilter === '') {
      setLoading(false);
      setAppointments([]);
      setActivity([]);
      setRevenueSeries([]);
      setStats({ ...EMPTY_STATS });
      return;
    }

    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setAppointments([]);
      setActivity([]);
      setRevenueSeries([]);
      setStats({ ...EMPTY_STATS });

      const now = new Date();
      const today = localCalendarDay(now);
      const yesterdayDate = new Date(now);
      yesterdayDate.setDate(now.getDate() - 1);
      const yesterday = localCalendarDay(yesterdayDate);
      const sevenDaysAgoDate = new Date(now);
      sevenDaysAgoDate.setDate(now.getDate() - 6);
      const sevenDaysAgo = localCalendarDay(sevenDaysAgoDate);

      const locParam = branchFilter;

      const canReadStaff = !!user?.permissions?.some((p) => p === 'staff.view' || p === 'staff.manage');
      try {
        const [
          weekAppointmentsRes,
          todaySalesRes,
          yesterdaySalesRes,
          clientsRes,
          staffRes,
          weekSalesRes,
          salonRes,
        ] = await Promise.all([
          appointmentsApi.listAll({ from: sevenDaysAgo, to: today, location_id: locParam }),
          transactionsApi.listAll({ from: today, to: today, location_id: locParam }),
          transactionsApi.listAll({ from: yesterday, to: yesterday, location_id: locParam }),
          clientsApi.list(),
          canReadStaff
            ? staffApi.list()
            : Promise.resolve<{ data?: StaffMember[]; error?: string }>({ data: [] }),
          transactionsApi.listAll({ from: sevenDaysAgo, to: today, location_id: locParam }),
          settingsApi.get(),
        ]);

        if (cancelled) return;

        const firstError =
          weekAppointmentsRes.error ||
          todaySalesRes.error ||
          yesterdaySalesRes.error ||
          clientsRes.error ||
          staffRes.error ||
          weekSalesRes.error ||
          salonRes.error;

        if (firstError) {
          toast.error(firstError);
        }

        const weekAppointments = weekAppointmentsRes.data?.appointments ?? [];
        const todayAppointments = weekAppointments.filter((a) => appointmentCalendarDay(a) === today);
        const todaySales = todaySalesRes.data?.transactions ?? [];
        const yesterdaySales = yesterdaySalesRes.data?.transactions ?? [];
        const clients = clientsRes.data?.clients ?? [];
        const staffRaw = staffRes.data ?? [];
        const staffForKpi = staffRaw.filter((s) => sameRecordId(staffBranchId(s), branchFilter));
        const weekSales = weekSalesRes.data?.transactions ?? [];

        const salonCurrency = salonRes.data?.salon?.currency;
        const resolvedCurrency =
          salonCurrency && typeof salonCurrency === 'string'
            ? salonCurrency.toUpperCase()
            : 'USD';
        setCurrency(resolvedCurrency);

        const todayRevenue = sumSales(todaySales);
        const yesterdayRevenue = sumSales(yesterdaySales);
        const revenueDeltaPct =
          yesterdayRevenue > 0
            ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
            : todayRevenue > 0
              ? 100
              : 0;

        const apptRows: ApptRow[] = todayAppointments.map((a: Appointment) => ({
          id: a.id,
          client: clientDisplayName(a),
          service: serviceDisplayName(a),
          time: new Date((a.start_at ?? a.starts_at) || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: a.status || 'scheduled',
        }));

        const upcomingBookings = todayAppointments.filter((a: Appointment) => {
          const start = new Date((a.start_at ?? a.starts_at) || '');
          return start.getTime() > Date.now();
        }).length;

        const byDay = new Map<string, number>();
        for (let i = 0; i < 7; i++) {
          const d = new Date(sevenDaysAgoDate);
          d.setDate(sevenDaysAgoDate.getDate() + i);
          byDay.set(localCalendarDay(d), 0);
        }
        weekSales.forEach((s: Transaction) => {
          const key = localCalendarDay(new Date(s.created_at || ''));
          if (byDay.has(key)) {
            byDay.set(key, (byDay.get(key) ?? 0) + Number(s.total ?? 0));
          }
        });
        const chart = Array.from(byDay.entries()).map(([date, revenue]) => ({
          day: new Date(date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' }),
          revenue: Number(revenue.toFixed(2)),
        }));

        const activityRows: ActivityRow[] = [
          ...weekAppointments.map((a: Appointment) => {
            const at = appointmentActivityInstant(a);
            return {
              id: `a-${a.id}`,
              title: appointmentActivityTitle(a.status || 'scheduled'),
              text: `${clientDisplayName(a)} booked ${serviceDisplayName(a)}`,
              when: humanAgo(at || undefined),
              at: at || (a.start_at ?? a.starts_at ?? ''),
            };
          }),
          ...weekSales.map((s: Transaction) => {
            const at = s.created_at || '';
            return {
              id: `s-${s.id}`,
              title: 'Payment received',
              text: `${formatMoney(Number(s.total ?? 0), resolvedCurrency)} · ${s.status}`,
              when: humanAgo(at || undefined),
              at,
            };
          }),
        ]
          .filter((row) => row.at)
          .sort((a, b) => activitySortMs(b.at) - activitySortMs(a.at))
          .slice(0, 12);

        setStats({
          todayRevenue,
          revenueDeltaPct,
          totalBookings: todayAppointments.length,
          upcomingBookings,
          activeClients: clients.length,
          ...computeStaffKpi(staffForKpi, now),
        });
        setAppointments(apptRows);
        setRevenueSeries(chart);
        setActivity(activityRows);
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : 'Failed to load dashboard');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [branchFilter, user?.permissions]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return appointments;
    return appointments.filter(
      (r) =>
        r.client.toLowerCase().includes(needle) ||
        r.service.toLowerCase().includes(needle) ||
        r.status.toLowerCase().includes(needle),
    );
  }, [q, appointments]);

  const branchLoading = branchFilter === null;
  const noBranches = branchFilter === '';
  const dataPending = loading || branchLoading;

  const locationScopeLabel =
    branchFilter === null || branchFilter === ''
      ? ''
      : locations.find((l) => sameRecordId(l.id, branchFilter))?.name?.trim() || '';

  if (!branchLoading && noBranches) {
    return (
      <div className="space-y-6 elite-shell">
        <DashboardPageHeader
          title="Dashboard"
          description="Metrics and activity are shown per location. Add a branch under Locations to get started."
          icon={<LayoutDashboard className="w-5 h-5" />}
        />
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No locations found for this salon.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 elite-shell">
      <DashboardPageHeader
        title="Dashboard"
        description={`Today’s overview for this branch — bookings, clients, staff, and revenue.${branchFilter && branchFilter !== '' ? ` Location: ${locationScopeLabel || '…'}.` : ''}`}
        icon={<LayoutDashboard className="w-5 h-5" />}
        rightSlot={
          <div className="flex w-full flex-col gap-1 sm:w-auto sm:items-end">
            <label htmlFor="dashboard-branch" className="text-xs elite-subtle">
              Branch
            </label>
            <select
              id="dashboard-branch"
              value={branchFilter != null && branchFilter !== '' ? String(branchFilter) : ''}
              onChange={(e) => setBranchFilter(e.target.value)}
              disabled={branchLoading || locations.length === 0}
              className="elite-input h-9 w-full min-w-0 px-3 text-sm sm:min-w-[12rem] sm:w-auto"
            >
              {locations.map((loc) => (
                <option key={String(loc.id)} value={String(loc.id)}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="elite-panel min-h-[132px]">
          <CardHeader className="pb-2">
            <CardDescription>Today’s Revenue</CardDescription>
            <CardTitle className="text-2xl">
              {dataPending ? <Skeleton className="h-8 w-28" /> : money(stats.todayRevenue)}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            {dataPending ? (
              <Skeleton className="h-3 w-24" />
            ) : (
              <span className="text-xs text-muted-foreground">
                {stats.revenueDeltaPct >= 0 ? '+' : ''}
                {stats.revenueDeltaPct.toFixed(1)}% vs yesterday
              </span>
            )}
            <CreditCard className="text-[var(--elite-orange)]" />
          </CardContent>
        </Card>
        <Card className="elite-panel min-h-[132px]">
          <CardHeader className="pb-2">
            <CardDescription>Total Bookings</CardDescription>
            <CardTitle className="text-2xl">
              {dataPending ? <Skeleton className="h-8 w-14" /> : stats.totalBookings}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            {dataPending ? (
              <Skeleton className="h-3 w-20" />
            ) : (
              <span className="text-xs text-muted-foreground">{stats.upcomingBookings} upcoming</span>
            )}
            <CalendarDays className="text-[var(--elite-orange)]" />
          </CardContent>
        </Card>
        <Card className="elite-panel min-h-[132px]">
          <CardHeader className="pb-2">
            <CardDescription>Active Clients</CardDescription>
            <CardTitle className="text-2xl">
              {dataPending ? <Skeleton className="h-8 w-14" /> : stats.activeClients}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Live customer records</span>
            <Users className="text-[var(--elite-orange)]" />
          </CardContent>
        </Card>
        <Card className="elite-panel min-h-[132px]">
          <CardHeader className="pb-2">
            <CardDescription>
              {dataPending ? 'Staff' : stats.staffCardMode === 'schedule' ? 'On duty now' : 'Active staff'}
            </CardDescription>
            <CardTitle className="text-2xl">
              {dataPending ? <Skeleton className="h-8 w-14" /> : stats.staffMain}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-2">
            {dataPending ? (
              <Skeleton className="h-3 w-28" />
            ) : (
              <span className="text-xs text-muted-foreground leading-snug">{stats.staffSub}</span>
            )}
            <UserCheck className="shrink-0 text-[var(--elite-orange)]" />
          </CardContent>
        </Card>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Appointments table */}
        <Card className="elite-panel">
          <CardHeader className="space-y-1">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Appointments</CardTitle>
                <CardDescription>Today’s schedule with quick filters.</CardDescription>
              </div>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search…"
                  className="w-full sm:w-56"
                />
                <Button variant="outline" className="shrink-0 border-[var(--elite-border-2)]">Filters</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {dataPending ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : rows.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-medium">No bookings today</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try changing filters or clearing your search.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden min-w-0 lg:block">
                  <div className="elite-scrollbar max-h-[460px] overflow-y-auto overflow-x-hidden rounded-md">
                    <div className="sticky top-0 z-10 grid grid-cols-[1.2fr_1.2fr_0.6fr_0.6fr] border-b border-[var(--elite-border)] bg-[var(--elite-card)] pb-2 text-xs font-medium text-muted-foreground">
                      <div className="min-w-0">Client</div>
                      <div className="min-w-0">Service</div>
                      <div className="min-w-0">Time</div>
                      <div>Status</div>
                    </div>
                    <div className="divide-y divide-[var(--elite-border)]">
                      {rows.map((r) => (
                        <div
                          key={r.id}
                          className="grid grid-cols-[1.2fr_1.2fr_0.6fr_0.6fr] py-3 text-sm transition-colors hover:bg-accent/40 rounded-md px-2 -mx-2"
                        >
                          <div className="min-w-0 truncate pr-2 font-medium">{r.client}</div>
                          <div className="min-w-0 truncate pr-2 text-muted-foreground">{r.service}</div>
                          <div className="min-w-0 text-muted-foreground">{r.time}</div>
                          <div className="min-w-0">
                            <Badge variant={statusVariant(r.status) as any}>
                              {r.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mobile cards */}
                <div className="lg:hidden space-y-2">
                  {rows.map((r) => (
                    <div key={r.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{r.client}</div>
                          <div className="text-sm text-muted-foreground">{r.service}</div>
                        </div>
                        <Badge variant={statusVariant(r.status) as any}>{r.status}</Badge>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        Time: <span className="text-foreground">{r.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Activity feed */}
        <Card className="elite-panel">
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>
              This branch only — bookings and payments from the last 7 days, newest first.
            </CardDescription>
          </CardHeader>
          <CardContent className="elite-scrollbar max-h-80 space-y-3 overflow-y-auto overflow-x-hidden text-sm pr-1">
            {dataPending ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : activity.length === 0 ? (
              <p className="text-muted-foreground">No recent activity.</p>
            ) : (
              activity.map((row) => (
                <div key={row.id} className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{row.title}</div>
                    <div className="text-muted-foreground">{row.text}</div>
                  </div>
                  <span className="text-xs text-muted-foreground">{row.when}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue chart */}
      <Card className="elite-panel">
        <CardHeader>
          <CardTitle>Revenue</CardTitle>
          <CardDescription>Last 7 days.</CardDescription>
        </CardHeader>
        <CardContent className="h-56 sm:h-64">
          {dataPending ? (
            <Skeleton className="h-full w-full rounded-md" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueSeries} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--elite-card)',
                    border: '1px solid var(--elite-border)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
                    padding: '8px 12px',
                  }}
                  labelStyle={{
                    color: 'var(--elite-text)',
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                  itemStyle={{ color: 'var(--elite-orange)' }}
                  formatter={(value: string | number | (string | number)[]) =>
                    value != null ? [money(Number(value)), 'Revenue'] : ['—', 'Revenue']
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  fill="url(#revFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
