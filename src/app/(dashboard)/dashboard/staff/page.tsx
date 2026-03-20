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

  const inputCls = 'border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm focus:outline-none focus:ring-2 focus:ring-salon-gold/40 w-full';

  return (
    <div className="space-y-5">
      {/* ── header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-salon-espresso flex items-center gap-2">
            <UserCog className="w-6 h-6 text-salon-gold" />
            Staff
          </h1>
          <p className="text-sm text-salon-stone mt-0.5">Manage your team and set their weekly schedules.</p>
        </div>
        <Button onClick={openAdd} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add staff member
        </Button>
      </div>

      {/* ── filter ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div>
          <label className="block text-xs text-salon-stone mb-1">Filter by branch</label>
          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm min-w-[160px]"
          >
            <option value="">All branches</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-4 items-start">
        {/* ── staff table ── */}
        <div className={`flex-1 min-w-0 transition-all ${panelOpen || scheduleOpen ? 'hidden xl:block' : ''}`}>
          <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm overflow-hidden">
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
                    <TableCell colSpan={5} className="text-center py-8 text-salon-stone">Loading…</TableCell>
                  </TableRow>
                )}
                {!loading && staffList.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-salon-stone">
                      No staff members found. Add your first team member.
                    </TableCell>
                  </TableRow>
                )}
                {staffList.map((s) => (
                  <TableRow key={s.id} className="hover:bg-salon-cream/20">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-salon-gold/20 flex items-center justify-center text-salon-gold font-semibold text-sm">
                          {s.name[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-salon-espresso">{s.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-salon-stone">{s.specialization || '—'}</TableCell>
                    <TableCell className="text-salon-stone">{s.branch?.name || '—'}</TableCell>
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
                          className="p-1.5 rounded-lg text-salon-stone hover:text-salon-espresso hover:bg-salon-cream transition-colors"
                        >
                          <CalendarDays className="w-4 h-4" />
                        </button>
                        <button
                          title="Edit staff"
                          onClick={() => openEdit(s)}
                          className="p-1.5 rounded-lg text-salon-stone hover:text-salon-espresso hover:bg-salon-cream transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          title="Deactivate"
                          onClick={() => handleDelete(s.id)}
                          disabled={deletingId === s.id}
                          className="p-1.5 rounded-lg text-salon-stone hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
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

        {/* ── Add / Edit Staff panel ── */}
        {panelOpen && (
          <div className="w-full xl:w-96 shrink-0 bg-white rounded-xl border border-salon-sand/40 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-salon-espresso">
                {editing ? 'Edit staff member' : 'Add staff member'}
              </h2>
              <button onClick={() => setPanelOpen(false)} className="p-1 rounded-lg hover:bg-salon-cream transition-colors">
                <X className="w-4 h-4 text-salon-stone" />
              </button>
            </div>

            <Form {...form}>
              <form onSubmit={onSave} className="space-y-3">
                <RHFTextField control={form.control} name="name" label="Full name" placeholder="Sara Ahmed" />
                <RHFTextField control={form.control} name="phone" label="Phone" placeholder="+966 5XX XXX XXXX" />
                <RHFTextField control={form.control} name="specialization" label="Specialization" placeholder="Hair, Nails, Skin…" />

                <div>
                  <label className="block text-xs font-medium text-salon-espresso mb-1.5">Branch</label>
                  <select
                    {...form.register('branch_id')}
                    className={inputCls}
                  >
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
                    <label className="text-xs font-medium text-salon-espresso">Active</label>
                    <button
                      type="button"
                      onClick={() => form.setValue('is_active', !form.watch('is_active'))}
                      className={`relative w-10 h-5 rounded-full transition-colors ${form.watch('is_active') ? 'bg-green-500' : 'bg-salon-stone/30'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.watch('is_active') ? 'left-5' : 'left-0.5'}`} />
                    </button>
                    <span className="text-xs text-salon-stone">{form.watch('is_active') ? 'Active' : 'Inactive'}</span>
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
              <div className="pt-2 border-t border-salon-sand/40">
                <button
                  onClick={() => openSchedule(editing)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-salon-cream/70 hover:bg-salon-cream transition-colors text-sm text-salon-espresso"
                >
                  <span className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-salon-gold" />
                    Edit weekly schedule
                  </span>
                  <ChevronRight className="w-4 h-4 text-salon-stone" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Schedule editor panel ── */}
        {scheduleOpen && scheduleStaff && (
          <div className="w-full xl:w-[480px] shrink-0 bg-white rounded-xl border border-salon-sand/40 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-semibold text-salon-espresso">
                  Weekly schedule
                </h2>
                <p className="text-xs text-salon-stone">{scheduleStaff.name}</p>
              </div>
              <button onClick={() => setScheduleOpen(false)} className="p-1 rounded-lg hover:bg-salon-cream transition-colors">
                <X className="w-4 h-4 text-salon-stone" />
              </button>
            </div>

            {scheduleLoading ? (
              <p className="text-sm text-salon-stone py-4 text-center">Loading schedule…</p>
            ) : (
              <div className="space-y-2">
                {/* Column headers */}
                <div className="grid grid-cols-[80px_1fr_1fr_auto] gap-2 px-1">
                  <span className="text-xs font-medium text-salon-stone">Day</span>
                  <span className="text-xs font-medium text-salon-stone">Start</span>
                  <span className="text-xs font-medium text-salon-stone">End</span>
                  <span className="text-xs font-medium text-salon-stone">Working</span>
                </div>

                {schedule.map((row, idx) => (
                  <div
                    key={row.day_of_week}
                    className={`grid grid-cols-[80px_1fr_1fr_auto] gap-2 items-center p-2 rounded-xl border ${row.is_day_off ? 'border-salon-sand/30 bg-salon-cream/30 opacity-60' : 'border-salon-sand/50 bg-white'}`}
                  >
                    <span className={`text-sm font-medium ${row.is_day_off ? 'text-salon-stone' : 'text-salon-espresso'}`}>
                      {DAY_SHORT[row.day_of_week]}
                    </span>
                    <input
                      type="time"
                      value={row.start_time}
                      onChange={(e) => updateTime(idx, 'start_time', e.target.value)}
                      disabled={row.is_day_off}
                      className="border border-salon-sand/60 rounded-lg px-2 py-1.5 text-sm bg-salon-cream/50 focus:outline-none focus:ring-2 focus:ring-salon-gold/40 disabled:opacity-40 disabled:cursor-not-allowed w-full"
                    />
                    <input
                      type="time"
                      value={row.end_time}
                      onChange={(e) => updateTime(idx, 'end_time', e.target.value)}
                      disabled={row.is_day_off}
                      className="border border-salon-sand/60 rounded-lg px-2 py-1.5 text-sm bg-salon-cream/50 focus:outline-none focus:ring-2 focus:ring-salon-gold/40 disabled:opacity-40 disabled:cursor-not-allowed w-full"
                    />
                    <button
                      type="button"
                      onClick={() => toggleDayOff(idx)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${row.is_day_off ? 'bg-salon-sand/30 text-salon-stone hover:bg-salon-sand/50' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                      title={row.is_day_off ? 'Click to mark as working' : 'Click to mark as day off'}
                    >
                      {row.is_day_off ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}

                <div className="pt-2 flex items-center gap-3 text-xs text-salon-stone">
                  <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-600" /> Working day</span>
                  <span className="flex items-center gap-1"><X className="w-3 h-3 text-salon-stone" /> Day off</span>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={saveSchedule} disabled={scheduleSaving || scheduleLoading} className="flex-1">
                {scheduleSaving ? 'Saving…' : 'Save schedule'}
              </Button>
              <Button variant="outline" onClick={() => setScheduleOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
