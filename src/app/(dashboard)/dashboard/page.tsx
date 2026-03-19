'use client';

import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarDays, CreditCard, Users, UserCheck } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

type ApptStatus = 'confirmed' | 'scheduled' | 'completed' | 'cancelled';
type ApptRow = {
  id: string;
  client: string;
  service: string;
  time: string;
  status: ApptStatus;
};

const demoAppointments: ApptRow[] = [
  { id: 'a1', client: 'Ayesha Khan', service: 'Haircut', time: '10:30', status: 'confirmed' },
  { id: 'a2', client: 'Rohan Patel', service: 'Beard trim', time: '11:15', status: 'scheduled' },
  { id: 'a3', client: 'Sara Ali', service: 'Color', time: '13:00', status: 'completed' },
  { id: 'a4', client: 'John Doe', service: 'Facial', time: '15:45', status: 'cancelled' },
];

const demoRevenue = [
  { day: 'Mon', revenue: 420 },
  { day: 'Tue', revenue: 760 },
  { day: 'Wed', revenue: 610 },
  { day: 'Thu', revenue: 980 },
  { day: 'Fri', revenue: 840 },
  { day: 'Sat', revenue: 1200 },
  { day: 'Sun', revenue: 510 },
];

function statusVariant(status: ApptStatus) {
  if (status === 'confirmed') return 'success';
  if (status === 'scheduled') return 'warning';
  if (status === 'cancelled') return 'destructive';
  return 'muted';
}

export default function DashboardPage() {
  // UI-first redesign: keep data flow intact later by wiring existing API calls into these blocks.
  const [loading] = useState(false);
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return demoAppointments;
    return demoAppointments.filter(
      (r) =>
        r.client.toLowerCase().includes(needle) ||
        r.service.toLowerCase().includes(needle) ||
        r.status.toLowerCase().includes(needle),
    );
  }, [q]);

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
            <CardTitle className="text-2xl">$1,240</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">+12% vs yesterday</span>
            <CreditCard className="text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Bookings</CardDescription>
            <CardTitle className="text-2xl">18</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">3 upcoming</span>
            <CalendarDays className="text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Clients</CardDescription>
            <CardTitle className="text-2xl">246</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Last 30 days</span>
            <Users className="text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Staff On Duty</CardDescription>
            <CardTitle className="text-2xl">5</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">2 available now</span>
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
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">New booking</div>
                <div className="text-muted-foreground">Ayesha booked Haircut · 10:30</div>
              </div>
              <span className="text-xs text-muted-foreground">2m</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">Payment received</div>
                <div className="text-muted-foreground">$45 · Beard trim</div>
              </div>
              <span className="text-xs text-muted-foreground">12m</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">Cancellation</div>
                <div className="text-muted-foreground">John cancelled Facial · 15:45</div>
              </div>
              <span className="text-xs text-muted-foreground">1h</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue</CardTitle>
          <CardDescription>Last 7 days (sample chart styling).</CardDescription>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={demoRevenue} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
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
