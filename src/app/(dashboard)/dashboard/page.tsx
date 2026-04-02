'use client';

import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarDays, CreditCard, Users, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  appointmentsApi,
  clientsApi,
  salonProfileApi,
  staffApi,
  transactionsApi,
  type Appointment,
  type Transaction,
} from '@/lib/api';

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

function dayStr(d: Date) {
  return d.toISOString().slice(0, 10);
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

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [appointments, setAppointments] = useState<ApptRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [revenueSeries, setRevenueSeries] = useState<{ day: string; revenue: number }[]>([]);
  const [stats, setStats] = useState({
    todayRevenue: 0,
    revenueDeltaPct: 0,
    totalBookings: 0,
    upcomingBookings: 0,
    activeClients: 0,
    staffOnDuty: 0,
    availableNow: 0,
  });

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
    const loadDashboard = async () => {
      setLoading(true);

      const now = new Date();
      const today = dayStr(now);
      const yesterdayDate = new Date(now);
      yesterdayDate.setDate(now.getDate() - 1);
      const yesterday = dayStr(yesterdayDate);
      const sevenDaysAgoDate = new Date(now);
      sevenDaysAgoDate.setDate(now.getDate() - 6);
      const sevenDaysAgo = dayStr(sevenDaysAgoDate);

      const [
        todayAppointmentsRes,
        todaySalesRes,
        yesterdaySalesRes,
        clientsRes,
        staffRes,
        weekSalesRes,
        salonRes,
      ] = await Promise.all([
        appointmentsApi.list({ from: today, to: today }),
        transactionsApi.list({ from: today, to: today }),
        transactionsApi.list({ from: yesterday, to: yesterday }),
        clientsApi.list(),
        staffApi.list(),
        transactionsApi.list({ from: sevenDaysAgo, to: today }),
        salonProfileApi.get(),
      ]);

      const firstError =
        todayAppointmentsRes.error ||
        todaySalesRes.error ||
        yesterdaySalesRes.error ||
        clientsRes.error ||
        staffRes.error ||
        weekSalesRes.error;

      if (firstError) {
        toast.error(firstError);
      }

      const todayAppointments = todayAppointmentsRes.data?.appointments ?? [];
      const todaySales = todaySalesRes.data?.transactions ?? [];
      const yesterdaySales = yesterdaySalesRes.data?.transactions ?? [];
      const clients = clientsRes.data?.clients ?? [];
      const staff = Array.isArray(staffRes.data) ? staffRes.data : [];
      const weekSales = weekSalesRes.data?.transactions ?? [];
      const salonCurrency = salonRes.data?.salon?.currency;
      if (salonCurrency && typeof salonCurrency === 'string') {
        setCurrency(salonCurrency.toUpperCase());
      }

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
        client: a.Client?.full_name || 'Walk-in',
        service: a.Service?.name || a.services?.[0]?.service?.name || 'Service',
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
        byDay.set(dayStr(d), 0);
      }
      weekSales.forEach((s: Transaction) => {
        const key = dayStr(new Date(s.created_at || ''));
        byDay.set(key, (byDay.get(key) ?? 0) + Number(s.total ?? 0));
      });
      const chart = Array.from(byDay.entries()).map(([date, revenue]) => ({
        day: new Date(date).toLocaleDateString(undefined, { weekday: 'short' }),
        revenue: Number(revenue.toFixed(2)),
      }));

      const activityRows: ActivityRow[] = [
        ...todayAppointments.slice(0, 4).map((a: Appointment) => ({
          id: `a-${a.id}`,
          title: a.status === 'cancelled' ? 'Cancellation' : 'New booking',
          text: `${a.Client?.full_name || 'Client'} booked ${a.Service?.name || a.services?.[0]?.service?.name || 'service'}`,
          when: humanAgo(a.created_at || a.start_at || a.starts_at),
          at: a.start_at ?? a.starts_at ?? '',
        })),
        ...todaySales.slice(0, 4).map((s: Transaction) => ({
          id: `s-${s.id}`,
          title: 'Payment received',
          text: `${money(Number(s.total ?? 0))} · ${s.status}`,
          when: humanAgo(s.created_at),
          at: s.created_at || '',
        })),
      ]
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, 3);

      setStats({
        todayRevenue,
        revenueDeltaPct,
        totalBookings: todayAppointments.length,
        upcomingBookings,
        activeClients: clients.length,
        staffOnDuty: staff.length,
        availableNow: staff.length,
      });
      setAppointments(apptRows);
      setRevenueSeries(chart);
      setActivity(activityRows);
      setLoading(false);
    };

    loadDashboard();
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Today’s overview of bookings, clients, staff, and revenue.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Today’s Revenue</CardDescription>
            <CardTitle className="text-2xl">{money(stats.todayRevenue)}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {stats.revenueDeltaPct >= 0 ? '+' : ''}
              {stats.revenueDeltaPct.toFixed(1)}% vs yesterday
            </span>
            <CreditCard className="text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Bookings</CardDescription>
            <CardTitle className="text-2xl">{stats.totalBookings}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{stats.upcomingBookings} upcoming</span>
            <CalendarDays className="text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Clients</CardDescription>
            <CardTitle className="text-2xl">{stats.activeClients}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Live customer records</span>
            <Users className="text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Staff On Duty</CardDescription>
            <CardTitle className="text-2xl">{stats.staffOnDuty}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{stats.availableNow} available now</span>
            <UserCheck className="text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Appointments table */}
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Appointments</CardTitle>
                <CardDescription>Today’s schedule with quick filters.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search…"
                  className="w-full sm:w-56"
                />
                <Button variant="outline">Filters</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
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
                <div className="hidden md:block">
                  <div className="grid grid-cols-[1.2fr_1.2fr_0.6fr_0.6fr] text-xs font-medium text-muted-foreground border-b pb-2">
                    <div>Client</div>
                    <div>Service</div>
                    <div>Time</div>
                    <div>Status</div>
                  </div>
                  <div className="divide-y">
                    {rows.map((r) => (
                      <div
                        key={r.id}
                        className="grid grid-cols-[1.2fr_1.2fr_0.6fr_0.6fr] py-3 text-sm hover:bg-accent/40 transition-colors rounded-md px-2 -mx-2"
                      >
                        <div className="font-medium">{r.client}</div>
                        <div className="text-muted-foreground">{r.service}</div>
                        <div className="text-muted-foreground">{r.time}</div>
                        <div>
                          <Badge variant={statusVariant(r.status) as any}>
                            {r.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-2">
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
        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>Recent events across bookings and payments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {activity.length === 0 && !loading ? (
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
      <Card>
        <CardHeader>
          <CardTitle>Revenue</CardTitle>
          <CardDescription>Last 7 days.</CardDescription>
        </CardHeader>
        <CardContent className="h-64">
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
              <Tooltip />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                fill="url(#revFill)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
