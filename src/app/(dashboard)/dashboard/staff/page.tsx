'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  UserCog, Plus, Pencil, Trash2, CalendarDays, X, Check,
  ChevronRight, AlertCircle,
} from 'lucide-react';
import {
  locationsApi,
  staffApi,
  type StaffMember,
  type StaffScheduleRow,
  type Location,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form } from '@/components/ui/form';
import { RHFTextField } from '@/components/fields/RHFTextField';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

/* ─── constants ─────────────────────────────────────────────────────── */
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const defaultSchedule = (): StaffScheduleRow[] =>
  DAY_NAMES.map((_, i) => ({
    day_of_week: i,
    start_time: i === 0 ? '09:00' : '09:00',
    end_time: i === 0 ? '18:00' : '18:00',
    is_day_off: i === 0, // Sunday off by default
  }));

/* ─── validation ─────────────────────────────────────────────────────── */
const staffSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  phone: z.string().optional(),
  specialization: z.string().optional(),
  branch_id: z.string().min(1, 'Branch is required'),
  is_active: z.boolean().default(true),
});
type StaffValues = z.infer<typeof staffSchema>;

/* ─── page ─────────────────────────────────────────────────────────── */
export default function StaffPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Location[]>([]);
  const [filterBranch, setFilterBranch] = useState('');

  /* form panel */
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [saving, setSaving] = useState(false);

  /* schedule panel */
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleStaff, setScheduleStaff] = useState<StaffMember | null>(null);
  const [schedule, setSchedule] = useState<StaffScheduleRow[]>(defaultSchedule());
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);

  /* delete confirm */
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const form = useForm<StaffValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: { name: '', phone: '', specialization: '', branch_id: '', is_active: true },
  });

  /* ── load data ── */
  useEffect(() => {
    loadBranches();
    loadStaff();
  }, []);

  const loadBranches = () => {
    locationsApi.list().then((res) => {
      if (res.data?.locations) setBranches(res.data.locations);
    });
  };

  const loadStaff = () => {
    setLoading(true);
    staffApi.list(filterBranch ? { branch_id: filterBranch } : undefined).then(({ data, error }) => {
      setLoading(false);
      if (error) { toast.error(error); return; }
      const rows: StaffMember[] = Array.isArray(data)
        ? data
        : (data as any)?.data ?? [];
      setStaffList(rows);
    });
  };

  useEffect(() => {
    if (!loading) loadStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterBranch]);

  /* ── open add/edit form ── */
  const openAdd = () => {
    setEditing(null);
    form.reset({ name: '', phone: '', specialization: '', branch_id: branches[0]?.id ?? '', is_active: true });
    setPanelOpen(true);
    setScheduleOpen(false);
  };

  const openEdit = (s: StaffMember) => {
    setEditing(s);
    form.reset({
      name: s.name,
      phone: s.phone ?? '',
      specialization: s.specialization ?? '',
      branch_id: s.branch?.id ?? s.branch_id ?? '',
      is_active: s.is_active,
    });
    setPanelOpen(true);
    setScheduleOpen(false);
  };

  /* ── save staff ── */
  const onSave = form.handleSubmit(async (values) => {
    setSaving(true);
    const res = editing
      ? await staffApi.update(editing.id, values)
      : await staffApi.create(values);
    setSaving(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success(editing ? 'Staff updated.' : 'Staff member added.');
    setPanelOpen(false);
    loadStaff();
  });

  /* ── delete staff ── */
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await staffApi.delete(id);
    setDeletingId(null);
    if (error) { toast.error(error); return; }
    toast.success('Staff deactivated.');
    loadStaff();
  };

  /* ── open schedule panel ── */
  const openSchedule = (s: StaffMember) => {
    setScheduleStaff(s);
    setScheduleOpen(true);
    setPanelOpen(false);
    setScheduleLoading(true);
    staffApi.getSchedules(s.id).then(({ data, error }) => {
      setScheduleLoading(false);
      if (error) { toast.error(error); return; }
      const rows: StaffScheduleRow[] = Array.isArray(data)
        ? data
        : (data as any)?.data ?? [];
      if (rows.length === 7) {
        setSchedule(rows.map((r) => ({ ...r })));
      } else {
        // Merge loaded rows into default 7-day template
        const merged = defaultSchedule();
        rows.forEach((r) => {
          const idx = merged.findIndex((d) => d.day_of_week === r.day_of_week);
          if (idx !== -1) merged[idx] = { ...r };
        });
        setSchedule(merged);
      }
    });
  };

  /* ── save schedule ── */
  const saveSchedule = async () => {
    if (!scheduleStaff) return;
    // Validate times for working days
    for (const row of schedule) {
      if (!row.is_day_off) {
        if (!row.start_time || !row.end_time) {
          toast.error(`Set start/end time for ${DAY_NAMES[row.day_of_week]}`);
          return;
        }
        if (row.start_time >= row.end_time) {
          toast.error(`End time must be after start time for ${DAY_NAMES[row.day_of_week]}`);
          return;
        }
      }
    }
    setScheduleSaving(true);
    const { error } = await staffApi.setSchedules(scheduleStaff.id, schedule);
    setScheduleSaving(false);
    if (error) { toast.error(error); return; }
    toast.success(`Schedule saved for ${scheduleStaff.name}.`);
    setScheduleOpen(false);
  };

  /* ── schedule row helpers ── */
  const toggleDayOff = (idx: number) => {
    setSchedule((prev) =>
      prev.map((r, i) => i === idx ? { ...r, is_day_off: !r.is_day_off } : r),
    );
  };
  const updateTime = (idx: number, field: 'start_time' | 'end_time', value: string) => {
    setSchedule((prev) =>
      prev.map((r, i) => i === idx ? { ...r, [field]: value } : r),
    );
  };

  const inputCls = 'elite-input rounded-xl px-3 py-2 text-sm w-full';

  return (
    <div className="space-y-5 elite-shell">
      {/* ── header ── */}
      <DashboardPageHeader
        title="Staff"
        description="Manage your team and set their weekly schedules."
        icon={<UserCog className="w-5 h-5" />}
        rightSlot={
          <Button onClick={openAdd} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add staff member
          </Button>
        }
      />

      {/* ── filter ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div>
          <label className="block text-xs elite-subtle mb-1">Filter by branch</label>
          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="elite-input rounded-xl px-3 py-2 text-sm min-w-[160px]"
          >
            <option value="">All branches</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {/* ── Staff table + form panel (side-by-side on wide screens) ── */}
      <div className="flex gap-4 items-start">
        {/* Staff table — hidden on small screens when form is open */}
        <div className={`flex-1 min-w-0 transition-all ${panelOpen ? 'hidden xl:block' : ''}`}>
          <div className="elite-panel overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell>
                  </TableRow>
                )}
                {!loading && staffList.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No staff members found. Add your first team member.
                    </TableCell>
                  </TableRow>
                )}
                {staffList.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[var(--elite-orange-dim)] flex items-center justify-center text-[var(--elite-orange)] font-semibold text-sm shrink-0">
                          {s.name[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-[var(--elite-text-strong)]">{s.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{s.specialization || '—'}</TableCell>
                    <TableCell>{s.branch?.name || '—'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="Edit schedule"
                          onClick={() => openSchedule(s)}
                          className="p-1.5 rounded-lg elite-subtle hover:text-[var(--elite-text)] hover:bg-[var(--elite-card-2)] transition-colors"
                        >
                          <CalendarDays className="w-4 h-4" />
                        </button>
                        <button
                          title="Edit staff"
                          onClick={() => openEdit(s)}
                          className="p-1.5 rounded-lg elite-subtle hover:text-[var(--elite-text)] hover:bg-[var(--elite-card-2)] transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          title="Deactivate"
                          onClick={() => handleDelete(s.id)}
                          disabled={deletingId === s.id}
                          className="p-1.5 rounded-lg elite-subtle hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* ── Add / Edit Staff panel (inline on xl+, full-width on smaller) ── */}
        {panelOpen && (
          <div className="w-full xl:w-96 shrink-0 bg-[var(--elite-card)] rounded-xl border border-[var(--elite-border)] shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold elite-title">
                {editing ? 'Edit staff member' : 'Add staff member'}
              </h2>
              <button onClick={() => setPanelOpen(false)} className="p-1 rounded-lg hover:bg-[var(--elite-card-2)] transition-colors">
                <X className="w-4 h-4 elite-subtle" />
              </button>
            </div>

            <Form {...form}>
              <form onSubmit={onSave} className="space-y-3">
                <RHFTextField control={form.control} name="name" label="Full name" placeholder="Sara Ahmed" />
                <RHFTextField control={form.control} name="phone" label="Phone" placeholder="+966 5XX XXX XXXX" />
                <RHFTextField control={form.control} name="specialization" label="Specialization" placeholder="Hair, Nails, Skin…" />

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Branch</label>
                  <select {...form.register('branch_id')} className={inputCls}>
                    <option value="">Select branch</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  {form.formState.errors.branch_id && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {form.formState.errors.branch_id.message}
                    </p>
                  )}
                </div>

                {editing && (
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-foreground">Active</label>
                    <button
                      type="button"
                      onClick={() => form.setValue('is_active', !form.watch('is_active'))}
                      className={`relative w-10 h-5 rounded-full transition-colors ${form.watch('is_active') ? 'bg-green-500' : 'bg-muted'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-all ${form.watch('is_active') ? 'left-5' : 'left-0.5'}`} />
                    </button>
                    <span className="text-xs text-muted-foreground">{form.watch('is_active') ? 'Active' : 'Inactive'}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={saving} className="flex-1">
                    {saving ? 'Saving…' : editing ? 'Update' : 'Add'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setPanelOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>

            {editing && (
              <div className="pt-2 border-t border-border">
                <button
                  onClick={() => openSchedule(editing)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-sm text-foreground"
                >
                  <span className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    Edit weekly schedule
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Schedule editor — FIXED MODAL OVERLAY (never clipped by parent) ── */}
      {scheduleOpen && scheduleStaff && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm"
            onClick={() => setScheduleOpen(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
            <div
              className="pointer-events-auto w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border shrink-0">
                <div>
                  <h2 className="font-display text-base font-semibold text-foreground">Weekly schedule</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{scheduleStaff.name}</p>
                </div>
                <button
                  onClick={() => setScheduleOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {scheduleLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Loading schedule…</p>
                ) : (
                  <div className="space-y-2">
                    {/* Column headers — match grid exactly */}
                    <div className="grid items-center gap-2 px-1" style={{ gridTemplateColumns: '52px 1fr 1fr 36px' }}>
                      <span className="text-xs font-medium text-muted-foreground">Day</span>
                      <span className="text-xs font-medium text-muted-foreground">Start</span>
                      <span className="text-xs font-medium text-muted-foreground">End</span>
                      <span className="text-xs font-medium text-muted-foreground text-center">On</span>
                    </div>

                    {schedule.map((row, idx) => (
                      <div
                        key={row.day_of_week}
                        className={`grid items-center gap-2 px-2 py-2 rounded-xl border transition-colors ${
                          row.is_day_off
                            ? 'border-border bg-muted/20'
                            : 'border-border bg-card'
                        }`}
                        style={{ gridTemplateColumns: '52px 1fr 1fr 36px' }}
                      >
                        {/* Day label */}
                        <span className={`text-sm font-medium truncate ${row.is_day_off ? 'text-muted-foreground/60' : 'text-foreground'}`}>
                          {DAY_SHORT[row.day_of_week]}
                        </span>

                        {/* Start time */}
                        <input
                          type="time"
                          value={row.start_time}
                          onChange={(e) => updateTime(idx, 'start_time', e.target.value)}
                          disabled={row.is_day_off}
                          className={`w-full min-w-0 border rounded-lg px-2 py-1.5 text-sm bg-muted/40
                            focus:outline-none focus:ring-2 focus:ring-ring/40
                            disabled:opacity-35 disabled:cursor-not-allowed
                            ${row.is_day_off ? 'border-border' : 'border-border'}`}
                        />

                        {/* End time */}
                        <input
                          type="time"
                          value={row.end_time}
                          onChange={(e) => updateTime(idx, 'end_time', e.target.value)}
                          disabled={row.is_day_off}
                          className={`w-full min-w-0 border rounded-lg px-2 py-1.5 text-sm bg-muted/40
                            focus:outline-none focus:ring-2 focus:ring-ring/40
                            disabled:opacity-35 disabled:cursor-not-allowed
                            ${row.is_day_off ? 'border-border' : 'border-border'}`}
                        />

                        {/* Working toggle */}
                        <button
                          type="button"
                          onClick={() => toggleDayOff(idx)}
                          title={row.is_day_off ? 'Mark as working' : 'Mark as day off'}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors
                            ${row.is_day_off
                              ? 'bg-muted/40 text-muted-foreground hover:bg-muted/50'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                        >
                          {row.is_day_off
                            ? <X className="w-3.5 h-3.5" />
                            : <Check className="w-3.5 h-3.5" />
                          }
                        </button>
                      </div>
                    ))}

                    {/* Legend */}
                    <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="w-4 h-4 rounded bg-green-100 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-green-700" />
                        </span>
                        Working
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-4 h-4 rounded bg-muted/40 flex items-center justify-center">
                          <X className="w-2.5 h-2.5 text-muted-foreground" />
                        </span>
                        Day off
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-2 px-5 pb-5 pt-3 border-t border-border shrink-0">
                <Button onClick={saveSchedule} disabled={scheduleSaving || scheduleLoading} className="flex-1">
                  {scheduleSaving ? 'Saving…' : 'Save schedule'}
                </Button>
                <Button variant="outline" onClick={() => setScheduleOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
