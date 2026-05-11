"use client";

import { useEffect, useState, useMemo } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  UserCog,
  Plus,
  Pencil,
  Trash2,
  CalendarDays,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Search,
  Users,
  Clock,
  ShieldCheck,
  Settings,
  Building,
  Briefcase,
  CalendarOff,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { APP_NAME } from "@/lib/app-name";
import {
  locationsApi,
  staffPerformanceApi,
  staffApi,
  staffTimeApi,
  servicesApi,
  timeOffApi,
  settingsApi,
  departmentsApi,
  staffShiftsApi,
  type StaffShiftRow,
  type DepartmentRow,
  type StaffPerformanceRow,
  type StaffMember,
  type StaffScheduleRow,
  type StaffTimeEntryRow,
  type TimeOffRequestRow,
  type Location,
  type Service,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Form } from "@/components/ui/form";
import { RHFTextField } from "@/components/fields/RHFTextField";
import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader";

/* ─── constants ─────────────────────────────────────────────────────── */
const LEAVE_TYPES = [
  { value: 'off', label: 'Off Day', color: 'bg-slate-500/10 border-slate-500/20 text-slate-500 hover:bg-slate-500/15' },
  { value: 'annual', label: 'Annual Leave', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/15' },
  { value: 'sick', label: 'Sick Leave', color: 'bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/15' },
  { value: 'maternity', label: 'Maternity Leave', color: 'bg-purple-500/10 border-purple-500/20 text-purple-500 hover:bg-purple-500/15' },
  { value: 'holiday', label: 'Holidays Leave', color: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500 hover:bg-indigo-500/15' },
  { value: 'marriage', label: 'Marriage Leave', color: 'bg-pink-500/10 border-pink-500/20 text-pink-500 hover:bg-pink-500/15' },
  { value: 'bereavement', label: 'Bereavement Leave', color: 'bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/15' },
];

/* ─── constants ─────────────────────────────────────────────────────── */
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const defaultSchedule = (): StaffScheduleRow[] =>
  DAY_NAMES.map((_, i) => ({
    day_of_week: i,
    start_time: i === 0 ? "09:00" : "09:00",
    end_time: i === 0 ? "18:00" : "18:00",
    is_day_off: i === 0, // Sunday off by default
  }));

/* ─── validation ─────────────────────────────────────────────────────── */
const staffSchema = z.object({
  name: z.string().min(1, "First Name is required").max(255),
  last_name: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  dob: z.string().optional().or(z.literal("")),
  bio: z.string().optional().or(z.literal("")),
  specialization: z.string().optional().or(z.literal("")),
  department_id: z.string().optional().or(z.literal("")),
  photo_url: z.string()
    .refine(
      (val) => !val || /^https?:\/\/.+/.test(val),
      "Enter a valid URL or leave empty"
    )
    .optional()
    .or(z.literal("")),
  service_ids: z.array(z.union([z.string(), z.number()])).transform(arr => arr.map(id => String(id))).default([]),
  color: z.string().optional(),
  branch_id: z.string().optional().or(z.literal("")),
  branch_ids: z.array(z.string()).default([]),
  works_at_all_locations: z.boolean().default(false),
  is_active: z.boolean().default(true),
  
  // Employment Details
  employment_type: z.string().default("Full Time"),
  role_title: z.string().optional().or(z.literal("")),
  hire_date: z.string().optional().or(z.literal("")),
  start_date: z.string().optional().or(z.literal("")),
  
  // Contact & Emergency
  address: z.string().optional().or(z.literal("")),
  emergency_contact_name: z.string().optional().or(z.literal("")),
  emergency_contact_phone: z.string().optional().or(z.literal("")),
  
  // Skills & Specialties
  skills: z.string().optional().or(z.literal("")),
  specialties: z.string().optional().or(z.literal("")),
  tags: z.string().optional().or(z.literal("")),
  
  // Compensation
  compensation_model: z.enum(['commission_only', 'salary_only', 'mixed']).default('commission_only'),
  commission_type: z.enum(['fixed', 'percentage']).optional(),
  commission_value: z.coerce.number().optional(),
  salary_value: z.coerce.number().optional(),
});
type StaffValues = z.infer<typeof staffSchema>;

/* ─── page ─────────────────────────────────────────────────────────── */
export default function StaffPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Location[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [activeTab, setActiveTab] = useState<'directory' | 'shifts' | 'departments' | 'roles'>('directory');
  const [filterBranch, setFilterBranch] = useState("");

  /* ── Shifts State ── */
  const [shifts, setShifts] = useState<StaffShiftRow[]>([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date()); // Controls the view range
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<StaffShiftRow | null>(null);
  const [shiftSaving, setShiftSaving] = useState(false);
  
  const formatYMD = (d: Date) => {
    const date = new Date(d);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [shiftDraft, setShiftDraft] = useState<Partial<StaffShiftRow>>({
    staff_id: "",
    branch_id: "",
    date: formatYMD(new Date()),
    start_time: "09:00",
    end_time: "17:00",
    break_minutes: 30,
    shift_type: "regular",
    notes: ""
  });
  const [numDaysToBook, setNumDaysToBook] = useState(1);
  const [tenantSettings, setTenantSettings] = useState<any>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsUpdating, setSettingsUpdating] = useState(false);

  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentRow | null>(null);
  const [deptDraft, setDeptDraft] = useState({ name: "", description: "" });
  const [deptSaving, setDeptSaving] = useState(false);

  // Reset state on modal open/close
  useEffect(() => {
    if (isShiftModalOpen) {
      setNumDaysToBook(1);
    }
  }, [isShiftModalOpen]);

  const startOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Local start (Sunday)
    return new Date(d.setDate(diff));
  };

  const weekDates = useMemo(() => {
    const start = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const [filterServiceId, setFilterServiceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  /* form panel */
  const [panelOpen, setPanelOpen] = useState(false);
  const [formTab, setFormTab] = useState<'basic' | 'display' | 'employment' | 'contact' | 'skills' | 'compensation'>('basic');
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [saving, setSaving] = useState(false);

  /* schedule panel */
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleStaff, setScheduleStaff] = useState<StaffMember | null>(null);
  const [schedule, setSchedule] =
    useState<StaffScheduleRow[]>(defaultSchedule());
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);

  /* delete confirm */
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [timeOffList, setTimeOffList] = useState<TimeOffRequestRow[]>([]);
  const [timeOffLoading, setTimeOffLoading] = useState(false);
  const [timeOffSaving, setTimeOffSaving] = useState(false);
  const [timeOffDraft, setTimeOffDraft] = useState({
    staff_id: "",
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [timeEntries, setTimeEntries] = useState<StaffTimeEntryRow[]>([]);
  const [timeLoading, setTimeLoading] = useState(false);
  const [performanceRows, setPerformanceRows] = useState<StaffPerformanceRow[]>(
    [],
  );
  const [performanceLoading, setPerformanceLoading] = useState(false);

  const form = useForm<StaffValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: "",
      last_name: "",
      email: "",
      phone: "",
      dob: "",
      bio: "",
      specialization: "",
      department_id: "",
      photo_url: "",
      service_ids: [],
      color: "#6366f1",
      branch_id: "",
      is_active: true,
      employment_type: "Full Time",
      role_title: "",
      hire_date: "",
      start_date: "",
      address: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      skills: "",
      specialties: "",
      tags: "",
      compensation_model: "commission_only",
      commission_type: "percentage",
      commission_value: 0,
      salary_value: 0,
    },
  });

  /* ── load data ── */
  useEffect(() => {
    loadSettings();
    loadDepartments();
    loadBranches();
    loadServices();
    loadStaff();
    loadTimeOffRequests();
    loadTimeEntries();
    loadPerformance();
  }, []);

  const loadSettings = () => {
    settingsApi.get().then((res) => {
      if (res.data?.salon) setTenantSettings(res.data.salon);
    });
  };

  const loadDepartments = async () => {
    const { data } = await departmentsApi.list();
    if (data) setDepartments(data);
  };

  const loadBranches = () => {
    locationsApi.list().then((res) => {
      if (res.data?.locations) setBranches(res.data.locations);
    });
  };

  const loadServices = () => {
    servicesApi.list({ include_inactive: false }).then(({ data, error }) => {
      if (error) {
        toast.error(error);
        return;
      }
      setServices(data?.services ?? []);
    });
  };

  const loadShifts = async () => {
    setShiftsLoading(true);
    const start = startOfWeek(currentDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    
    const { data, error } = await staffShiftsApi.list({
      from: formatYMD(start),
      to: formatYMD(end)
    });
    setShiftsLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    setShifts(Array.isArray(data) ? data : (data as any)?.data || []);
  };

  const saveShift = async () => {
    if (!shiftDraft.staff_id || !shiftDraft.date) {
      toast.error("Please select staff and date.");
      return;
    }

    setShiftSaving(true);

    if (editingShift) {
      // Standard path for single-shift updates
      const res = await staffShiftsApi.update(editingShift.id, shiftDraft);
      setShiftSaving(false);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Shift updated");
      setIsShiftModalOpen(false);
      loadShifts();
      return;
    }

    // Creation flow with multi-day iteration Support
    const isLeave = shiftDraft.shift_type && shiftDraft.shift_type !== 'regular' && shiftDraft.shift_type !== 'off';
    const daysToSchedule = isLeave ? Math.max(1, numDaysToBook) : 1;

    const baseDate = new Date(shiftDraft.date + 'T12:00:00'); // Noon avoid timezone shift
    let successCount = 0;
    let skippedCount = 0;
    let lastError = null;

    for (let i = 0; i < daysToSchedule; i++) {
      const nextDate = new Date(baseDate);
      nextDate.setDate(baseDate.getDate() + i);
      const targetDateStr = formatYMD(nextDate);

      // Perform check
      const alreadyExists = shifts.some(sh => {
        if (!sh || !sh.date) return false;
        const dbDate = String(sh.date).split('T')[0];
        return String(sh.staff_id) === String(shiftDraft.staff_id) && dbDate === targetDateStr;
      });

      if (alreadyExists) {
        skippedCount++;
        continue;
      }

      const payload = { ...shiftDraft, date: targetDateStr };
      const res = await staffShiftsApi.create(payload);
      if (res.error) {
        lastError = res.error;
      } else {
        successCount++;
      }
    }

    setShiftSaving(false);
    if (successCount > 0) {
      const message = skippedCount > 0 
        ? `Successfully scheduled ${successCount} day(s). Skipped ${skippedCount} date(s) due to conflicts.` 
        : `Successfully scheduled ${successCount} day(s).`;
      toast.success(message);
      setIsShiftModalOpen(false);
      loadShifts();
    } else if (lastError) {
      toast.error(lastError);
    } else if (skippedCount > 0) {
      toast.error("The selected dates are already occupied by existing schedules.");
    }
  };

  const deleteShift = async (id: string) => {
    if (!confirm("Are you sure you want to delete this shift?")) return;
    const { error } = await staffShiftsApi.delete(id);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Shift deleted");
    loadShifts();
  };

  useEffect(() => {
    if (activeTab === 'shifts') {
      loadShifts();
    }
  }, [activeTab, currentDate]);

  const loadStaff = () => {
    setLoading(true);
    staffApi
      .list(filterBranch ? { branch_id: filterBranch } : undefined)
      .then(({ data, error }) => {
        setLoading(false);
        if (error) {
          toast.error(error);
          return;
        }
        const rows: StaffMember[] = Array.isArray(data)
          ? data
          : ((data as any)?.data ?? []);
        setStaffList(rows);
      });
  };

  const loadTimeOffRequests = () => {
    setTimeOffLoading(true);
    timeOffApi.list().then(({ data, error }) => {
      setTimeOffLoading(false);
      if (error) {
        toast.error(error);
        return;
      }
      const rows: TimeOffRequestRow[] = Array.isArray(data)
        ? data
        : ((data as any)?.data ?? []);
      setTimeOffList(rows);
    });
  };

  const loadTimeEntries = () => {
    setTimeLoading(true);
    staffTimeApi.list().then(({ data, error }) => {
      setTimeLoading(false);
      if (error) {
        toast.error(error);
        return;
      }
      setTimeEntries(Array.isArray(data) ? data : ((data as any)?.data ?? []));
    });
  };

  const loadPerformance = () => {
    setPerformanceLoading(true);
    staffPerformanceApi.list().then(({ data, error }) => {
      setPerformanceLoading(false);
      if (error) {
        toast.error(error);
        return;
      }
      setPerformanceRows(
        Array.isArray(data) ? data : ((data as any)?.data ?? []),
      );
    });
  };

  const filteredStaff = useMemo(() => {
    let list = staffList;
    if (filterServiceId) {
      list = list.filter(s => s.services?.some(svc => String(svc.id) === filterServiceId));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || (s.user?.email ?? '').toLowerCase().includes(q) || (s.phone ?? '').includes(q));
    }
    return list;
  }, [staffList, filterServiceId, searchQuery]);

  useEffect(() => {
    if (!loading) loadStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterBranch]);

  /* ── open add/edit form ── */
  const openAdd = () => {
    setEditing(null);
    setFormTab('basic');
    form.reset({
      name: "",
      last_name: "",
      email: "",
      phone: "",
      dob: "",
      bio: "",
      specialization: "",
      photo_url: "",
      service_ids: [],
      color: "#6366f1",
      branch_id: branches[0]?.id ? String(branches[0].id) : "",
      branch_ids: [],
      works_at_all_locations: false,
      is_active: true,
      employment_type: "Full Time",
      role_title: "",
      hire_date: "",
      start_date: "",
      address: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      skills: "",
      specialties: "",
      tags: "",
      compensation_model: "commission_only",
      commission_type: "percentage",
      commission_value: 0,
      salary_value: 0,
    });
    setPanelOpen(true);
    setScheduleOpen(false);
  };

  const openEdit = (s: StaffMember | any) => {
    setEditing(s);
    setFormTab('basic');
    form.reset({
      name: s.name,
      last_name: s.last_name ?? "",
      email: s.user?.email ?? s.email ?? "",
      phone: s.phone ?? "",
      dob: s.dob ?? "",
      bio: s.bio ?? "",
      specialization: s.specialization ?? "",
      photo_url: s.photo_url ?? "",
      service_ids: (s.services ?? []).map((sv: any) => String(sv.id)),
      color: s.color ?? "#6366f1",
      branch_id: (s.branch?.id ?? s.branch_id) ? String(s.branch?.id ?? s.branch_id) : "",
      branch_ids: (s.branches ?? []).map((b: any) => String(b.id)),
      works_at_all_locations: !!s.works_at_all_locations,
      is_active: s.is_active,
      employment_type: s.employment_type ?? "Full Time",
      role_title: s.role_title ?? "",
      hire_date: s.hire_date ?? "",
      start_date: s.start_date ?? "",
      address: s.address ?? "",
      emergency_contact_name: s.emergency_contact_name ?? "",
      emergency_contact_phone: s.emergency_contact_phone ?? "",
      skills: s.skills ?? "",
      specialties: s.specialties ?? "",
      tags: s.tags ?? "",
      compensation_model: s.compensation_model ?? "commission_only",
      commission_type: s.commission_type ?? "percentage",
      commission_value: Number(s.commission_value ?? 0),
      salary_value: Number(s.salary_value ?? 0),
    });
    setPanelOpen(true);
    setScheduleOpen(false);
  };

  /* ── save staff ── */
  const onSave = form.handleSubmit(
    async (values) => {
      console.log("[Staff] Form submitted with values:", values);
      setSaving(true);
      const payload = {
        ...values,
        photo_url: values.photo_url?.trim() ? values.photo_url.trim() : undefined,
      };
      console.log("[Staff] Sending payload:", payload);
      const res = editing
        ? await staffApi.update(editing.id, payload)
        : await staffApi.create(payload);
      console.log("[Staff] API response:", res);
      setSaving(false);
      if (res.error) {
        console.error("[Staff] Error:", res.error);
        toast.error(res.error);
        return;
      }
      toast.success(editing ? "Staff updated." : "Staff member added.");
      setPanelOpen(false);
      loadStaff();
    },
    (errors) => {
      // Form validation failed — show all errors
      console.log("[Staff] Validation failed. Errors:", errors);
      Object.entries(errors).forEach(([field, error]) => {
        const message = (error as any)?.message || "Validation error";
        toast.error(`${field}: ${message}`);
      });
    }
  );

  /* ── delete staff ── */
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await staffApi.delete(id);
    setDeletingId(null);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Staff deactivated.");
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
      if (error) {
        toast.error(error);
        return;
      }
      const rows: StaffScheduleRow[] = Array.isArray(data)
        ? data
        : ((data as any)?.data ?? []);
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
          toast.error(
            `End time must be after start time for ${DAY_NAMES[row.day_of_week]}`,
          );
          return;
        }
      }
    }
    setScheduleSaving(true);
    const { error } = await staffApi.setSchedules(scheduleStaff.id, schedule);
    setScheduleSaving(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(`Schedule saved for ${scheduleStaff.name}.`);
    setScheduleOpen(false);
  };

  /* ── schedule row helpers ── */
  const toggleDayOff = (idx: number) => {
    setSchedule((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, is_day_off: !r.is_day_off } : r)),
    );
  };
  const updateTime = (
    idx: number,
    field: "start_time" | "end_time",
    value: string,
  ) => {
    setSchedule((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    );
  };

  const inputCls = "elite-input rounded-xl px-3 py-2 text-sm w-full";

  const submitTimeOff = async () => {
    if (
      !timeOffDraft.staff_id ||
      !timeOffDraft.start_date ||
      !timeOffDraft.end_date
    ) {
      toast.error("Select staff member and date range.");
      return;
    }
    setTimeOffSaving(true);
    const { error } = await timeOffApi.create({
      ...timeOffDraft,
      reason: timeOffDraft.reason.trim() || undefined,
    });
    setTimeOffSaving(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Time-off request submitted.");
    setTimeOffDraft({ staff_id: "", start_date: "", end_date: "", reason: "" });
    loadTimeOffRequests();
  };

  const reviewTimeOff = async (id: string, status: "approved" | "rejected") => {
    const { error } = await timeOffApi.updateStatus(id, status);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(`Request ${status}.`);
    loadTimeOffRequests();
  };

  const clockIn = async (staffId: string, branchId?: string | null) => {
    const { error } = await staffTimeApi.clockIn({
      staff_id: staffId,
      branch_id: branchId ?? undefined,
    });
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Clocked in.");
    loadTimeEntries();
  };

  const clockOut = async (entryId: string) => {
    const { error } = await staffTimeApi.clockOut(entryId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Clocked out.");
    loadTimeEntries();
  };


  const saveDepartment = async () => {
    if (!deptDraft.name) return toast.error("Department name is required");
    setDeptSaving(true);
    const res = editingDepartment 
      ? await departmentsApi.update(editingDepartment.id, deptDraft)
      : await departmentsApi.create(deptDraft);
    setDeptSaving(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(editingDepartment ? "Department updated" : "Department created");
      setIsDepartmentModalOpen(false);
      loadDepartments();
    }
  };

  const deleteDepartment = async (id: string) => {
    if (!confirm("Permanently remove this department? Staff assigned to it will be unassigned.")) return;
    const { error } = await departmentsApi.delete(id);
    if (error) return toast.error(error);
    toast.success("Department removed");
    loadDepartments();
  };

  const updateTenantLimits = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSettingsUpdating(true);
    const formData = new FormData(e.currentTarget);
    const a = Number(formData.get('annual_limit'));
    const s = Number(formData.get('sick_limit'));
    
    const res = await settingsApi.update({
      annual_leave_limit: a,
      sick_leave_limit: s
    });
    setSettingsUpdating(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Global leave policies updated.");
      setIsSettingsModalOpen(false);
      loadSettings();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--elite-bg)] -m-4 sm:-m-6 min-h-[calc(100vh-3.5rem)]">
      {/* ── Header ── */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold elite-title">Staff Management</h1>
          <p className="text-sm elite-subtle mt-1">Viewing staff members across all locations</p>
        </div>
        <Button onClick={openAdd} className="bg-[var(--elite-orange)] hover:bg-[var(--elite-orange-hover)] text-white border-none rounded-xl h-10 px-6 font-medium gap-2">
          <Plus className="w-4 h-4" /> Add Staff Member
        </Button>
      </header>

      {/* ── Tabs ── */}
      <div className="flex gap-8 px-8 border-b border-[var(--elite-border)] overflow-x-auto scrollbar-none">
        {[
          { id: 'directory', label: 'Directory', icon: <Users className="size-4" /> },
          { id: 'shifts', label: 'Shifts', icon: <Clock className="size-4" /> },
          { id: 'departments', label: 'Departments', icon: <Building className="size-4" /> },
          { id: 'leave_tracker', label: 'Leave Tracker', icon: <CalendarDays className="size-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 pb-4 text-sm font-medium transition-all relative",
              activeTab === tab.id
                ? "text-[var(--elite-orange)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[var(--elite-orange)]"
                : "elite-subtle hover:text-[var(--elite-text)]"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Sidebar (Filters) ── */}
        {activeTab !== 'shifts' && (
          <aside className="w-64 border-r border-[var(--elite-border)] p-6 hidden md:block overflow-y-auto elite-scrollbar">
            <div className="space-y-6">
              <div>
                <h2 className="text-[10px] font-bold uppercase tracking-[0.1em] elite-subtle mb-4">Branch Filter</h2>
                <Combobox
                  value={filterBranch}
                  onValueChange={(value) => setFilterBranch(value)}
                  options={[
                    { value: '', label: 'All branches' },
                    ...branches.map((b) => ({ value: String(b.id), label: b.name })),
                  ]}
                  placeholder="Select branch"
                  className="w-full bg-[var(--elite-card-2)] border-[var(--elite-border)]"
                />
              </div>

              <div>
                <h2 className="text-[10px] font-bold uppercase tracking-[0.1em] elite-subtle mb-4">Services</h2>
                <div className="space-y-1">
                  <button
                    onClick={() => setFilterServiceId(null)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center transition-colors",
                      filterServiceId === null ? "bg-[var(--elite-orange)]/10 text-[var(--elite-orange)]" : "elite-subtle hover:bg-[var(--elite-card-2)] hover:text-[var(--elite-text)]"
                    )}
                  >
                    <span>All Staff</span>
                    <span className={cn("text-xs", filterServiceId === null ? "text-[var(--elite-orange)]/60" : "elite-subtle")}>{staffList.length}</span>
                  </button>
                  {services.map(svc => {
                    const count = staffList.filter(s => s.services?.some(ss => String(ss.id) === String(svc.id))).length;
                    return (
                      <button
                        key={svc.id}
                        onClick={() => setFilterServiceId(String(svc.id))}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center transition-colors group",
                          filterServiceId === String(svc.id) ? "bg-[var(--elite-orange)]/10 text-[var(--elite-orange)]" : "elite-subtle hover:bg-[var(--elite-card-2)] hover:text-[var(--elite-text)]"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: svc.color || 'var(--elite-orange)' }} />
                          <span className="truncate">{svc.name}</span>
                        </div>
                        <span className={cn("text-xs", filterServiceId === String(svc.id) ? "text-[var(--elite-orange)]/60" : "elite-subtle group-hover:text-gray-500")}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* ── Main Content Area ── */}
        <main className="flex-1 flex flex-col p-8 overflow-y-auto elite-scrollbar min-w-0">
          {activeTab === 'shifts' ? (
            <div className="flex flex-col h-full">
              {/* Scheduler Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center bg-[var(--elite-card-2)] rounded-xl border border-[var(--elite-border)] p-1">
                    <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate()-7); setCurrentDate(d); }} className="p-2 hover:bg-[var(--elite-border)] rounded-lg transition-colors"><ChevronLeft className="size-4 elite-subtle" /></button>
                    <div className="px-4 text-sm font-semibold elite-title">
                      {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </div>
                    <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate()+7); setCurrentDate(d); }} className="p-2 hover:bg-[var(--elite-border)] rounded-lg transition-colors"><ChevronRight className="size-4 elite-subtle" /></button>
                  </div>
                  <button onClick={() => setCurrentDate(new Date())} className="text-xs font-medium text-[var(--elite-orange)] hover:underline">Today</button>
                </div>
                <Button onClick={() => { setEditingShift(null); setShiftDraft({ ...shiftDraft, date: formatYMD(new Date()), staff_id: "" }); setIsShiftModalOpen(true); }} className="bg-[var(--elite-orange)] hover:bg-[var(--elite-orange-hover)] text-white border-none rounded-xl h-10 px-6 font-medium gap-2">
                  <Plus className="w-4 h-4" /> Add Shift
                </Button>
              </div>

              {/* Scheduler Grid */}
              <div className="flex-1 overflow-auto rounded-2xl border border-[var(--elite-border)] bg-[var(--elite-card)] shadow-sm elite-scrollbar">
                <div className="min-w-[1400px]">
                  {/* Grid Header */}
                  <div className="grid grid-cols-[240px_repeat(7,minmax(0,1fr))] bg-[var(--elite-card-2)]/50 border-b border-[var(--elite-border)] sticky top-0 z-20">
                    <div className="p-4 text-[10px] font-bold uppercase tracking-wider elite-subtle border-r border-[var(--elite-border)] flex items-center justify-between">
                      <span>Staff Member</span>
                      <Users className="size-3" />
                    </div>
                    {weekDates.map((date, i) => (
                      <div key={i} className="p-4 text-center border-r border-[var(--elite-border)] last:border-r-0">
                        <div className="text-[10px] font-bold uppercase tracking-wider elite-subtle">{DAY_SHORT[i]}</div>
                        <div className={cn("text-sm font-semibold mt-1", date.toDateString() === new Date().toDateString() ? "text-[var(--elite-orange)]" : "elite-title")}>
                          {date.getDate()}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Grid Body */}
                  {loading || shiftsLoading ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-4">
                      <div className="size-8 border-2 border-[var(--elite-orange)] border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm elite-subtle font-medium">Fetching shifts...</p>
                    </div>
                  ) : staffList.length === 0 ? (
                    <div className="p-20 text-center flex flex-col items-center">
                      <div className="size-16 rounded-3xl bg-[var(--elite-card-2)] flex items-center justify-center mb-4">
                        <Users className="size-8 elite-subtle" />
                      </div>
                      <h3 className="elite-title font-medium">No staff members found</h3>
                      <p className="text-sm elite-subtle max-w-xs mt-1">Add staff members to your directory to begin scheduling.</p>
                    </div>
                  ) : (
                    staffList.map((s) => (
                      <div key={s.id} className="grid grid-cols-[240px_repeat(7,minmax(0,1fr))] h-[110px] border-b border-[var(--elite-border)] last:border-b-0 hover:bg-[var(--elite-card-2)]/30 transition-colors group/row">
                        <div className="p-4 border-r border-[var(--elite-border)] flex items-center gap-3">
                          <Avatar className="size-10 border border-[var(--elite-border)]">
                            <AvatarImage src={s.photo_url ?? undefined} />
                            <AvatarFallback className="bg-[var(--elite-card-2)] elite-subtle text-[10px]" style={{ color: s.color || undefined }}>{s.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold elite-title truncate">{s.name} {s.last_name}</span>
                            <span className="text-[9px] elite-subtle truncate uppercase tracking-widest">{s.role_title || s.specialization || 'Professional'}</span>
                          </div>
                        </div>
                        {weekDates.map((date, i) => {
                          const dateStr = formatYMD(date);
                          const dayShifts = shifts.filter(sh => {
                            if (!sh || !sh.date) return false;
                            const dbDate = String(sh.date).split('T')[0];
                            const sidMatch = String(sh.staff_id) === String(s.id);
                            return sidMatch && dbDate === dateStr;
                          });
                          return (
                            <div key={i} className="p-2 border-r border-[var(--elite-border)] last:border-r-0 h-full flex flex-col gap-2 relative">
                                  {dayShifts.map(shift => {
                                    const isRegular = !shift.shift_type || shift.shift_type === 'regular';
                                    const leaveConfig = !isRegular ? LEAVE_TYPES.find(t => t.value === shift.shift_type) : null;
                                    
                                    // Legacy / Fallback logic
                                    let colorClass = "bg-blue-500/10 border-blue-500/20 text-blue-500 hover:bg-blue-500/15";
                                    let displayLabel = shift.shift_type || 'Shift';

                                    if (!isRegular) {
                                      if (leaveConfig) {
                                        colorClass = leaveConfig.color;
                                        displayLabel = leaveConfig.label;
                                      } else {
                                        // Support explicit mapping for any leftover explicit string matches
                                        if (shift.shift_type === 'vacation') { colorClass = "bg-purple-500/10 border-purple-500/20 text-purple-500 hover:bg-purple-500/15"; displayLabel = 'Vacation'; }
                                        else if (shift.shift_type === 'leave') { colorClass = "bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/15"; displayLabel = 'Leave'; }
                                      }
                                    }

                                    return (
                                      <button
                                        key={shift.id}
                                        onClick={() => { setEditingShift(shift); setShiftDraft(shift); setIsShiftModalOpen(true); }}
                                        className={cn("group relative flex-1 w-full flex flex-col justify-center p-4 rounded-xl border text-left transition-all shadow-sm", colorClass)}
                                      >
                                        <div className="text-xs font-bold uppercase tracking-wide">
                                          {isRegular 
                                            ? `${(shift.start_time || '').slice(0,5)} - ${(shift.end_time || '').slice(0,5)}` 
                                            : displayLabel}
                                        </div>
                                        <div className="text-[10px] font-medium opacity-80 truncate mt-1 flex items-center gap-1.5">
                                          <Building className="size-3" /> {shift.branch?.name || 'Org-wide'}
                                        </div>
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <div 
                                            onClick={(e) => { e.stopPropagation(); deleteShift(shift.id); }} 
                                            className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 cursor-pointer transition-colors"
                                          >
                                            <Trash2 className="size-3.5" />
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })}
                              {dayShifts.length === 0 && (
                                <button 
                                  onClick={() => { 
                                    setEditingShift(null); 
                                    setShiftDraft({ ...shiftDraft, staff_id: s.id, date: dateStr }); 
                                    setIsShiftModalOpen(true); 
                                  }}
                                  className="flex-1 opacity-0 group-hover/row:opacity-100 flex items-center justify-center border-2 border-dashed border-[var(--elite-border)] rounded-xl elite-subtle transition-all hover:bg-[var(--elite-card-2)] hover:border-[var(--elite-orange)]/50"
                                >
                                  <Plus className="size-4" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'leave_tracker' ? (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold elite-title">Leave Balance Tracking</h2>
                  <p className="text-xs elite-subtle mt-1">Monitor cumulative utilization of statutory and scheduled leaves across current staff.</p>
                </div>
                <Button variant="outline" onClick={() => setIsSettingsModalOpen(true)} className="border-[var(--elite-border)] bg-transparent rounded-xl gap-2 h-9 font-medium text-xs">
                  <Settings className="size-3.5" />
                  Configure Limits
                </Button>
              </div>

              <div className="border border-[var(--elite-border)] rounded-2xl overflow-hidden bg-[var(--elite-card)]">
                <Table>
                  <TableHeader className="bg-[var(--elite-card-2)]/50">
                    <TableRow className="border-[var(--elite-border)] hover:bg-transparent">
                      <TableHead className="w-[300px]">Team Member</TableHead>
                      <TableHead>Annual Leave (Used / Limit)</TableHead>
                      <TableHead>Sick Leave (Used / Limit)</TableHead>
                      <TableHead className="text-center w-[120px]">Ancillary Leaves</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaff.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="h-32 text-center elite-subtle text-sm">No staff to display</TableCell></TableRow>
                    ) : (
                      filteredStaff.map((staffMember) => {
                        const stShifts = shifts.filter(x => String(x.staff_id) === String(staffMember.id));
                        const consumedAnnual = stShifts.filter(x => x.shift_type === 'annual').length;
                        const consumedSick = stShifts.filter(x => x.shift_type === 'sick').length;
                        const otherLeaves = stShifts.filter(x => x.shift_type && !['regular', 'off', 'annual', 'sick'].includes(x.shift_type)).length;
                        
                        const annualLim = Number((staffMember as any).annual_leave_limit || tenantSettings?.annual_leave_limit || 15);
                        const sickLim = Number((staffMember as any).sick_leave_limit || tenantSettings?.sick_leave_limit || 10);

                        const annualPct = Math.min(100, (consumedAnnual / annualLim) * 100);
                        const sickPct = Math.min(100, (consumedSick / sickLim) * 100);

                        return (
                          <TableRow key={staffMember.id} className="border-[var(--elite-border)] hover:bg-[var(--elite-card-2)]/20 transition-all">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="size-9 rounded-xl">
                                  <AvatarImage src={staffMember.photo_url} />
                                  <AvatarFallback className="rounded-xl bg-[var(--elite-orange)]/10 text-[var(--elite-orange)] font-bold">{staffMember.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium elite-title text-sm">{staffMember.name} {staffMember.last_name}</div>
                                  <div className="text-[10px] elite-subtle uppercase tracking-wider">{staffMember.role_title || 'Staff'}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-2 max-w-[240px]">
                                <div className="flex justify-between text-[11px] font-medium">
                                  <span className={consumedAnnual >= annualLim ? "text-red-500" : "elite-title"}>{consumedAnnual} <span className="elite-subtle font-normal">Used</span></span>
                                  <span className="elite-subtle">{annualLim} Total</span>
                                </div>
                                <div className="h-2 w-full bg-[var(--elite-border)] rounded-full overflow-hidden">
                                  <div 
                                    className={cn("h-full transition-all duration-1000 ease-out", consumedAnnual >= annualLim ? "bg-red-500" : "bg-emerald-500")} 
                                    style={{ width: `${annualPct}%` }} 
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-2 max-w-[240px]">
                                <div className="flex justify-between text-[11px] font-medium">
                                  <span className={consumedSick >= sickLim ? "text-red-500" : "elite-title"}>{consumedSick} <span className="elite-subtle font-normal">Used</span></span>
                                  <span className="elite-subtle">{sickLim} Total</span>
                                </div>
                                <div className="h-2 w-full bg-[var(--elite-border)] rounded-full overflow-hidden">
                                  <div 
                                    className={cn("h-full transition-all duration-1000 ease-out", consumedSick >= sickLim ? "bg-red-500" : "bg-rose-500")} 
                                    style={{ width: `${sickPct}%` }} 
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className={cn(
                                "inline-flex items-center justify-center h-7 min-w-[40px] px-2 rounded-full text-xs font-bold",
                                otherLeaves > 0 ? "bg-indigo-500/10 text-indigo-500" : "bg-zinc-500/10 text-zinc-500 opacity-50"
                              )}>
                                {otherLeaves}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : activeTab === 'departments' ? (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold elite-title">Organization Departments</h2>
                  <p className="text-xs elite-subtle mt-1">Structure and classify your service workforce groups.</p>
                </div>
                <Button 
                  onClick={() => { setEditingDepartment(null); setDeptDraft({ name: '', description: '' }); setIsDepartmentModalOpen(true); }}
                  className="bg-[var(--elite-orange)] hover:bg-[var(--elite-orange-hover)] text-white border-none rounded-xl font-medium h-10 px-4 gap-2"
                >
                  <Plus className="size-4" /> Add Department
                </Button>
              </div>

              <div className="border border-[var(--elite-border)] rounded-2xl overflow-hidden bg-[var(--elite-card)]">
                <Table>
                  <TableHeader className="bg-[var(--elite-card-2)]/50">
                    <TableRow className="border-[var(--elite-border)] hover:bg-transparent">
                      <TableHead>Department Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">Total Staff</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="h-32 text-center elite-subtle text-sm font-medium">No departments configured yet.</TableCell></TableRow>
                    ) : (
                      departments.map(dept => (
                        <TableRow key={dept.id} className="border-[var(--elite-border)] hover:bg-[var(--elite-card-2)]/20 transition-colors">
                          <TableCell className="font-medium elite-title">{dept.name}</TableCell>
                          <TableCell className="text-sm elite-subtle truncate max-w-[300px]">{dept.description || '—'}</TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center justify-center h-6 min-w-[32px] px-2 bg-[var(--elite-card-2)] border border-[var(--elite-border)] rounded-lg text-xs font-bold elite-title">
                              {dept.staff_count ?? 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost" size="icon" 
                                onClick={() => { setEditingDepartment(dept); setDeptDraft({ name: dept.name, description: dept.description || '' }); setIsDepartmentModalOpen(true); }}
                                className="size-8 rounded-lg hover:bg-[var(--elite-orange)]/10 hover:text-[var(--elite-orange)] text-zinc-400"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button 
                                variant="ghost" size="icon"
                                onClick={() => deleteDepartment(dept.id)}
                                className="size-8 rounded-lg hover:bg-red-500/10 hover:text-red-500 text-zinc-400"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : activeTab === 'directory' ? (
            <>
              {/* Search bar */}
              <div className="mb-6 relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 elite-subtle" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[var(--elite-card-2)] border-[var(--elite-border)] pl-10 focus:border-[var(--elite-orange)]/50 focus:ring-0 rounded-xl h-10 text-sm"
                  placeholder="Search staff by name, email or phone..."
                />
              </div>

              {/* Table Container */}
              <div className="flex-1 overflow-hidden rounded-2xl border border-[var(--elite-border)] bg-[var(--elite-card)] flex flex-col shadow-sm">
                <div className="flex-1 overflow-auto elite-scrollbar">
                  <Table>
                    <TableHeader className="bg-[var(--elite-orange)] sticky top-0 z-10">
                      <TableRow className="border-none hover:bg-transparent">
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-white h-11">Name</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-white h-11">Email</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-white h-11">Service</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-white h-11">Phone</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-white h-11">Status</TableHead>
                        <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-white h-11">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={6} className="h-64">
                            <div className="flex flex-col items-center justify-center gap-3 elite-subtle">
                              <div className="size-6 border-2 border-[var(--elite-orange)] border-t-transparent rounded-full animate-spin" />
                              <p className="text-sm">Fetching team directory...</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredStaff.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={6} className="h-64">
                            <div className="flex flex-col items-center justify-center text-center">
                              <div className="size-12 rounded-2xl bg-[var(--elite-card-2)] flex items-center justify-center mb-4">
                                <Users className="size-6 elite-subtle" />
                              </div>
                              <h3 className="elite-title font-medium">No staff members found</h3>
                              <p className="text-sm elite-subtle mt-1">Try adjusting your filters or search query.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredStaff.map((s) => (
                          <TableRow key={s.id} className="border-[var(--elite-border)] hover:bg-[var(--elite-card-2)]/50 transition-colors group">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="size-9 border border-[var(--elite-border)]">
                                  <AvatarImage src={s.photo_url ?? undefined} />
                                  <AvatarFallback className="bg-[var(--elite-card-2)] elite-subtle text-xs" style={{ backgroundColor: s.color ? `${s.color}33` : undefined, color: s.color || undefined }}>
                                    {s.name[0]?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="font-medium elite-title text-sm">{s.name}</span>
                                  <span className="text-[10px] elite-subtle uppercase tracking-wide">{s.specialization || 'Professional'}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="elite-subtle text-sm font-light">
                              {s.user?.email || '—'}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                                {s.services && s.services.length > 0 ? (
                                  <>
                                    {s.services.slice(0, 2).map(svc => (
                                      <Badge key={svc.id} variant="secondary" className="bg-[var(--elite-orange)]/10 text-[var(--elite-orange)] border-none px-2 py-0.5 text-[10px] font-normal flex items-center gap-1.5">
                                        <div className="size-1 rounded-full bg-[var(--elite-orange)]" />
                                        {svc.name}
                                      </Badge>
                                    ))}
                                    {s.services.length > 2 && (
                                      <span className="text-[10px] elite-subtle font-medium ml-0.5">+{s.services.length - 2}</span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-xs elite-subtle italic opacity-60">No services</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="elite-subtle text-sm font-light">
                              {s.phone || '—'}
                            </TableCell>
                            <TableCell>
                              <div className={cn(
                                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider",
                                s.is_active ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                              )}>
                                <div className={cn("size-1 rounded-full", s.is_active ? "bg-green-500" : "bg-red-500")} />
                                {s.is_active ? "Active" : "Inactive"}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  title="Edit schedule"
                                  onClick={() => openSchedule(s)}
                                  className="p-2 rounded-lg hover:bg-[var(--elite-card-2)] elite-subtle hover:text-[var(--elite-orange)] transition-all"
                                >
                                  <Clock className="w-4 h-4" />
                                </button>
                                <button
                                  title="Edit profile"
                                  onClick={() => openEdit(s)}
                                  className="p-2 rounded-lg hover:bg-[var(--elite-card-2)] elite-subtle hover:text-[var(--elite-text)] transition-all"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  title="Deactivate"
                                  onClick={() => handleDelete(s.id)}
                                  className="p-2 rounded-lg hover:bg-red-500/10 elite-subtle hover:text-red-500 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-12">
              <div className="size-16 rounded-3xl bg-[var(--elite-card-2)] border border-[var(--elite-border)] flex items-center justify-center mb-6">
                <AlertCircle className="size-8 elite-subtle" />
              </div>
              <h2 className="text-xl font-semibold elite-title">Under Construction</h2>
              <p className="elite-subtle mt-2 max-w-sm mx-auto">The {activeTab} module is currently being redesigned to meet the Elite standards. Please check back soon.</p>
            </div>
          )}
        </main>
      </div>

      {/* ── Add / Edit Staff modal ── */}
      {panelOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-[var(--elite-card)] border border-[var(--elite-border)] rounded-3xl shadow-2xl overflow-hidden flex flex-col h-full max-h-[90vh]">
            <div className="p-6 border-b border-[var(--elite-border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <UserCog className="size-6" />
                </div>
                <h2 className="text-xl font-semibold elite-title">{editing ? "Edit Staff Member" : "Add New Staff Member"}</h2>
              </div>
              <button onClick={() => setPanelOpen(false)} className="p-2 hover:bg-[var(--elite-card-2)] rounded-lg transition-colors"><X className="size-5 elite-subtle" /></button>
            </div>

            {/* Modal Tabs */}
            <div className="flex gap-6 px-8 border-b border-[var(--elite-border)] overflow-x-auto scrollbar-none pt-4">
              {[
                { id: 'basic', label: 'Basic Information' },
                { id: 'display', label: 'Display Settings' },
                { id: 'employment', label: 'Employment Details' },
                { id: 'contact', label: 'Contact & Emergency' },
                { id: 'skills', label: 'Skills & Specialties' },
                { id: 'compensation', label: 'Compensation' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFormTab(tab.id as any)}
                  className={cn(
                    "pb-4 text-xs font-medium transition-all relative whitespace-nowrap",
                    formTab === tab.id
                      ? "text-[var(--elite-orange)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[var(--elite-orange)]"
                      : "elite-subtle hover:text-[var(--elite-text)]"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-8 elite-scrollbar">
              <Form {...form}>
                <form id="staff-form" onSubmit={onSave} className="space-y-8">
                  {formTab === 'basic' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <RHFTextField control={form.control} name="name" label="First Name *" placeholder="e.g. Sara" className="bg-[var(--elite-card-2)] border-[var(--elite-border)] h-12" />
                        <RHFTextField control={form.control} name="last_name" label="Last Name *" placeholder="e.g. Ahmed" className="bg-[var(--elite-card-2)] border-[var(--elite-border)] h-12" />
                      </div>
                      <RHFTextField control={form.control} name="email" label="Email" placeholder="sara.ahmed@example.com" className="bg-[var(--elite-card-2)] border-[var(--elite-border)] h-12" />
                      <RHFTextField control={form.control} name="phone" label="Phone" placeholder="+966XXXXXXXXX" className="bg-[var(--elite-card-2)] border-[var(--elite-border)] h-12" />
                      <RHFTextField control={form.control} type="date" name="dob" label="Date of Birth" className="bg-[var(--elite-card-2)] border-[var(--elite-border)] h-12" />
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium elite-subtle">Bio</label>
                        <textarea
                          {...form.register("bio")}
                          placeholder="Brief bio or introduction"
                          className="w-full bg-[var(--elite-card-2)] border border-[var(--elite-border)] rounded-xl p-4 min-h-[120px] focus:ring-0 focus:border-[var(--elite-orange)]/50 transition-all elite-title text-sm"
                        />
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold elite-title">Work Locations</h3>
                        <div className="p-4 rounded-2xl border border-[var(--elite-border)] bg-[var(--elite-card-2)]/30 space-y-4">
                          <label className="flex items-start gap-4 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={form.watch("works_at_all_locations")}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                form.setValue("works_at_all_locations", checked);
                                if (checked) {
                                  // Optionally select all branches too
                                  form.setValue("branch_ids", branches.map(b => String(b.id)));
                                } else {
                                  form.setValue("branch_ids", []);
                                }
                              }}
                              className="mt-1 size-4 rounded border-[var(--elite-border)] bg-[var(--elite-card-2)] text-[var(--elite-orange)] focus:ring-0"
                            />
                            <div>
                              <div className="flex items-center gap-2 text-sm font-medium elite-title">
                                <Building className="size-4 text-blue-400" /> Works at All Locations
                              </div>
                              <p className="text-xs elite-subtle mt-1">Staff member can work at any location in your organization</p>
                            </div>
                          </label>

                          {!form.watch("works_at_all_locations") && (
                            <div className="pt-4 border-t border-[var(--elite-border)]">
                              <p className="text-xs font-medium elite-subtle mb-3">Select Specific Branches:</p>
                              <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-2 elite-scrollbar">
                                {branches.map(branch => {
                                  const selected = form.watch("branch_ids") ?? [];
                                  const isSelected = selected.includes(String(branch.id));
                                  return (
                                    <label key={branch.id} className={cn(
                                      "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                                      isSelected ? "bg-blue-500/10 border-blue-500/50 text-blue-400" : "bg-[var(--elite-card)] border-[var(--elite-border)] elite-subtle"
                                    )}>
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => {
                                          const current = form.getValues("branch_ids") ?? [];
                                          const bid = String(branch.id);
                                          const next = e.target.checked
                                            ? [...current, bid]
                                            : current.filter(id => id !== bid);
                                          form.setValue("branch_ids", next);
                                        }}
                                        className="size-4 rounded border-[var(--elite-border)] bg-[var(--elite-card-2)] text-blue-500 focus:ring-0"
                                      />
                                      <span className="text-xs truncate">{branch.name}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] elite-subtle flex items-center gap-2">
                          <AlertCircle className="size-3" /> Staff will only appear in views for their assigned locations.
                        </p>
                      </div>
                    </div>
                  )}

                  {formTab === 'display' && (
                    <div className="space-y-8">
                      <div>
                        <h3 className="text-sm font-semibold elite-title mb-1">Staff Color</h3>
                        <p className="text-xs elite-subtle mb-6">Choose a color to identify this staff member in the calendar and appointments view</p>
                        
                        <div className="p-6 rounded-2xl border border-[var(--elite-border)] bg-[var(--elite-card-2)]/30 flex items-center gap-6 mb-8">
                          <div className="size-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg" style={{ backgroundColor: form.watch("color") || "#6366f1" }}>
                            {form.watch("name")?.[0]?.toUpperCase()}{form.watch("last_name")?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-semibold elite-title">Color Preview</div>
                            <div className="text-xs elite-subtle font-mono mt-1">{form.watch("color")}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                          {[
                            { name: 'Indigo', hex: '#6366f1' },
                            { name: 'Purple', hex: '#a855f7' },
                            { name: 'Pink', hex: '#ec4899' },
                            { name: 'Amber', hex: '#f59e0b' },
                            { name: 'Green', hex: '#10b981' },
                            { name: 'Blue', hex: '#3b82f6' },
                            { name: 'Red', hex: '#ef4444' },
                            { name: 'Teal', hex: '#14b8a6' },
                          ].map(c => (
                            <button
                              key={c.hex}
                              type="button"
                              onClick={() => form.setValue("color", c.hex)}
                              className={cn(
                                "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all",
                                form.watch("color") === c.hex ? "border-[var(--elite-orange)] bg-[var(--elite-orange)]/5" : "border-[var(--elite-border)] hover:border-gray-700"
                              )}
                            >
                              <div className="h-8 w-full rounded-lg" style={{ backgroundColor: c.hex }} />
                              <span className="text-[10px] font-medium elite-subtle">{c.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-medium elite-subtle">Custom Color (Optional)</label>
                        <div className="flex items-center gap-4">
                          <Input
                            {...form.register("color")}
                            placeholder="#6366f1"
                            className="bg-[var(--elite-card-2)] border-[var(--elite-border)] h-12 flex-1"
                          />
                          <input
                            type="color"
                            value={form.watch("color")}
                            onChange={(e) => form.setValue("color", e.target.value)}
                            className="size-12 rounded-xl border-none bg-transparent cursor-pointer p-0 shrink-0"
                          />
                        </div>
                        <p className="text-[10px] elite-subtle">Enter a hex color code (e.g., #6366f1) or use the color picker</p>
                      </div>
                    </div>
                  )}

                  {formTab === 'employment' && (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-sm font-medium elite-subtle">Services</label>
                        <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 elite-scrollbar">
                          {services.map((svc) => {
                            const selected = form.watch("service_ids") ?? [];
                            const checked = selected.includes(String(svc.id));
                            return (
                              <label key={svc.id} className={cn(
                                "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                                checked ? "bg-[var(--elite-orange)]/10 border-[var(--elite-orange)]/50 text-[var(--elite-orange)]" : "bg-[var(--elite-card-2)] border-[var(--elite-border)] elite-subtle hover:border-[var(--elite-border)]"
                              )}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    const current = form.getValues("service_ids") ?? [];
                                    const serviceId = String(svc.id);
                                    const next = e.target.checked
                                      ? [...current, serviceId]
                                      : current.filter((id) => id !== serviceId);
                                    form.setValue("service_ids", next, { shouldDirty: true });
                                  }}
                                  className="size-4 rounded border-[var(--elite-border)] bg-[var(--elite-card-2)] text-[var(--elite-orange)] focus:ring-0"
                                />
                                <span className="text-xs truncate font-medium">{svc.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-medium elite-subtle">Employment Type</label>
                        <Combobox
                          value={form.watch("employment_type")}
                          onValueChange={(val) => form.setValue("employment_type", val)}
                          options={[
                            { value: 'Full Time', label: 'Full Time' },
                            { value: 'Part Time', label: 'Part Time' },
                            { value: 'Contract', label: 'Contract' },
                            { value: 'Temporary', label: 'Temporary' },
                          ]}
                          className="bg-[var(--elite-card-2)] border-[var(--elite-border)] h-12 w-full"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-medium elite-subtle">Department</label>
                        <Combobox
                          value={form.watch("department_id") || ""}
                          onValueChange={(val) => form.setValue("department_id", val)}
                          options={[
                            { value: "", label: "No Department (General)" },
                            ...departments.map(d => ({ value: String(d.id), label: d.name }))
                          ]}
                          placeholder="Select organizational group..."
                          className="bg-[var(--elite-card-2)] border-[var(--elite-border)] h-12 w-full"
                        />
                      </div>

                      <RHFTextField control={form.control} name="role_title" label="Role/Title" placeholder="e.g., Senior Stylist, Massage Therapist" className="bg-[var(--elite-card-2)] border-[var(--elite-border)] h-12" />

                      <div className="grid grid-cols-2 gap-6">
                        <RHFTextField control={form.control} type="date" name="hire_date" label="Hire Date" className="bg-[var(--elite-card-2)] border-[var(--elite-border)] h-12" />
                        <RHFTextField control={form.control} type="date" name="start_date" label="Start Date" className="bg-[var(--elite-card-2)] border-[var(--elite-border)] h-12" />
                      </div>
                    </div>
                  )}

                  {formTab === 'contact' && (
                    <div className="space-y-8">
                      <div className="space-y-2">
                        <label className="text-sm font-medium elite-subtle">Address</label>
                        <textarea
                          {...form.register("address")}
                          placeholder="Complete physical address"
                          className="w-full bg-[var(--elite-card-2)] border border-[var(--elite-border)] rounded-xl p-4 min-h-[100px] focus:ring-0 focus:border-[var(--elite-orange)]/50 transition-all elite-title text-sm"
                        />
                      </div>

                      <div className="p-6 rounded-2xl border border-[var(--elite-orange)]/20 bg-[var(--elite-orange)]/5 space-y-6">
                        <h3 className="text-sm font-semibold text-[var(--elite-orange)]">Emergency Contact</h3>
                        <RHFTextField control={form.control} name="emergency_contact_name" label="Contact Name" placeholder="Full name of emergency contact" className="bg-[var(--elite-card-2)] border-[var(--elite-border)] h-12" />
                        <RHFTextField control={form.control} name="emergency_contact_phone" label="Contact Phone" placeholder="Phone number of emergency contact" className="bg-[var(--elite-card-2)] border-[var(--elite-border)] h-12" />
                      </div>
                    </div>
                  )}

                  {formTab === 'skills' && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium elite-subtle">Skills</label>
                        <textarea
                          {...form.register("skills")}
                          placeholder="Comma-separated, e.g., Haircut, Coloring, Styling"
                          className="w-full bg-[var(--elite-card-2)] border border-[var(--elite-border)] rounded-xl p-4 min-h-[80px] focus:ring-0 focus:border-[var(--elite-orange)]/50 transition-all elite-title text-sm"
                        />
                        <p className="text-[10px] elite-subtle">Separate multiple skills with commas</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium elite-subtle">Specialties</label>
                        <textarea
                          {...form.register("specialties")}
                          placeholder="Comma-separated, e.g., Bridal Hair, Color Correction"
                          className="w-full bg-[var(--elite-card-2)] border border-[var(--elite-border)] rounded-xl p-4 min-h-[80px] focus:ring-0 focus:border-[var(--elite-orange)]/50 transition-all elite-title text-sm"
                        />
                        <p className="text-[10px] elite-subtle">Separate multiple specialties with commas</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium elite-subtle">Tags</label>
                        <textarea
                          {...form.register("tags")}
                          placeholder="Comma-separated, e.g., Featured, Senior, New"
                          className="w-full bg-[var(--elite-card-2)] border border-[var(--elite-border)] rounded-xl p-4 min-h-[80px] focus:ring-0 focus:border-[var(--elite-orange)]/50 transition-all elite-title text-sm"
                        />
                        <p className="text-[10px] elite-subtle">Separate multiple tags with commas</p>
                      </div>
                    </div>
                  )}

                  {formTab === 'compensation' && (
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <label className="text-sm font-medium elite-subtle">Compensation Model</label>
                        <div className="grid grid-cols-1 gap-3">
                          {[
                            { id: 'commission_only', label: 'Commission Only', sub: 'Earnings based on performance' },
                            { id: 'salary_only', label: 'Fixed Salary Only', sub: 'Guaranteed base pay' },
                            { id: 'mixed', label: 'Both Commission + Salary (Mixed)', sub: 'Base salary plus performance bonus' },
                          ].map(model => (
                            <button
                              key={model.id}
                              type="button"
                              onClick={() => form.setValue("compensation_model", model.id as any)}
                              className={cn(
                                "flex flex-col text-left p-4 rounded-2xl border transition-all",
                                form.watch("compensation_model") === model.id ? "bg-[var(--elite-orange)]/10 border-[var(--elite-orange)]/50" : "bg-[var(--elite-card-2)] border-[var(--elite-border)] hover:border-gray-700"
                              )}
                            >
                              <span className={cn("text-sm font-semibold", form.watch("compensation_model") === model.id ? "text-[var(--elite-orange)]" : "elite-title")}>{model.label}</span>
                              <span className="text-[10px] elite-subtle mt-0.5">{model.sub}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {(form.watch("compensation_model") === 'commission_only' || form.watch("compensation_model") === 'mixed') && (
                        <div className="p-6 rounded-2xl border border-[var(--elite-border)] bg-[var(--elite-card-2)]/30 space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold elite-title">Commission Settings</h3>
                            <div className="flex gap-2 p-1 bg-[var(--elite-card-2)] rounded-lg border border-[var(--elite-border)]">
                              <button
                                type="button"
                                onClick={() => form.setValue("commission_type", "percentage")}
                                className={cn("px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all", form.watch("commission_type") === 'percentage' ? "bg-[var(--elite-orange)] text-white shadow-sm" : "elite-subtle")}
                              >
                                % Percentage
                              </button>
                              <button
                                type="button"
                                onClick={() => form.setValue("commission_type", "fixed")}
                                className={cn("px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all", form.watch("commission_type") === 'fixed' ? "bg-[var(--elite-orange)] text-white shadow-sm" : "elite-subtle")}
                              >
                                $ Fixed
                              </button>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <label className="text-sm font-medium elite-subtle">
                              Commission Value ({form.watch("commission_type") === 'percentage' ? '%' : '$'})
                            </label>
                            <Input
                              type="number"
                              {...form.register("commission_value")}
                              className="bg-[var(--elite-card-2)] border-[var(--elite-border)] h-12"
                              placeholder={form.watch("commission_type") === 'percentage' ? "e.g. 15" : "e.g. 50.00"}
                            />
                          </div>
                        </div>
                      )}

                      {(form.watch("compensation_model") === 'salary_only' || form.watch("compensation_model") === 'mixed') && (
                        <div className="p-6 rounded-2xl border border-[var(--elite-border)] bg-[var(--elite-card-2)]/30 space-y-3">
                          <label className="text-sm font-medium elite-subtle">Base Salary Amount ($)</label>
                          <Input
                            type="number"
                            {...form.register("salary_value")}
                            className="bg-[var(--elite-card-2)] border-[var(--elite-border)] h-12"
                            placeholder="e.g. 3500.00"
                          />
                          <p className="text-[10px] elite-subtle italic">Guaranteed base monthly salary</p>
                        </div>
                      )}
                    </div>
                  )}
                </form>
              </Form>
            </div>

            <div className="p-8 border-t border-[var(--elite-border)] bg-[var(--elite-card-2)]/20 flex gap-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const tabs = ['basic', 'display', 'employment', 'contact', 'skills', 'compensation'];
                    const idx = tabs.indexOf(formTab);
                    if (idx > 0) setFormTab(tabs[idx - 1] as any);
                  }}
                  disabled={formTab === 'basic'}
                  className="px-6 h-12 rounded-xl border-[var(--elite-border)]"
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const tabs = ['basic', 'display', 'employment', 'contact', 'skills', 'compensation'];
                    const idx = tabs.indexOf(formTab);
                    if (idx < tabs.length - 1) setFormTab(tabs[idx + 1] as any);
                  }}
                  disabled={formTab === 'compensation'}
                  className="px-6 h-12 rounded-xl border-[var(--elite-border)]"
                >
                  Next
                </Button>
              </div>
              <div className="flex-1" />
              <Button variant="outline" onClick={() => setPanelOpen(false)} className="px-8 h-12 rounded-xl border-[var(--elite-border)]">
                Cancel
              </Button>
              <Button type="submit" form="staff-form" disabled={saving} className="px-8 h-12 bg-blue-600 hover:bg-blue-700 text-white border-none rounded-xl font-medium shadow-lg shadow-blue-500/20">
                {saving ? "Creating..." : editing ? "Update Staff" : "Create Staff"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Schedule modal ── */}
      {scheduleOpen && scheduleStaff && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[var(--elite-card)] border border-[var(--elite-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full max-h-[85vh]">
            <div className="p-6 border-b border-[var(--elite-border)] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold elite-title">Weekly Schedule</h2>
                <p className="text-xs elite-subtle mt-0.5">{scheduleStaff.name} · {scheduleStaff.specialization || 'Professional'}</p>
              </div>
              <button onClick={() => setScheduleOpen(false)} className="p-2 hover:bg-[var(--elite-card-2)] rounded-lg transition-colors"><X className="size-5 elite-subtle" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 elite-scrollbar space-y-3">
              {scheduleLoading ? (
                <div className="py-12 flex justify-center"><div className="size-6 border-2 border-[var(--elite-orange)] border-t-transparent rounded-full animate-spin" /></div>
              ) : (
                schedule.map((row, idx) => (
                  <div key={idx} className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                    row.is_day_off ? "bg-[var(--elite-card-2)]/20 border-[var(--elite-border)]/40 opacity-60" : "bg-[var(--elite-card-2)]/50 border-[var(--elite-border)]"
                  )}>
                    <div className="w-20 font-medium text-sm elite-title">{DAY_NAMES[row.day_of_week]}</div>
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        type="time"
                        value={row.start_time}
                        onChange={(e) => updateTime(idx, 'start_time', e.target.value)}
                        disabled={row.is_day_off}
                        className="bg-transparent border-[var(--elite-border)] focus:border-[var(--elite-orange)]/50 h-9 text-xs"
                      />
                      <span className="elite-subtle">—</span>
                      <Input
                        type="time"
                        value={row.end_time}
                        onChange={(e) => updateTime(idx, 'end_time', e.target.value)}
                        disabled={row.is_day_off}
                        className="bg-transparent border-[var(--elite-border)] focus:border-[var(--elite-orange)]/50 h-9 text-xs"
                      />
                    </div>
                    <button
                      onClick={() => toggleDayOff(idx)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                        row.is_day_off ? "bg-[var(--elite-card-2)] elite-subtle" : "bg-[var(--elite-orange)]/10 text-[var(--elite-orange)] hover:bg-[var(--elite-orange)]/20"
                      )}
                    >
                      {row.is_day_off ? 'Off' : 'Working'}
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="p-6 border-t border-[var(--elite-border)] bg-[var(--elite-card-2)]/20 flex gap-3">
              <Button onClick={saveSchedule} disabled={scheduleSaving} className="flex-1 bg-[var(--elite-orange)] hover:bg-[var(--elite-orange-hover)] h-11 rounded-xl text-white">
                {scheduleSaving ? "Saving..." : "Save Schedule"}
              </Button>
              <Button variant="outline" onClick={() => setScheduleOpen(false)} className="px-6 border-[var(--elite-border)] bg-transparent hover:bg-[var(--elite-card-2)] h-11 rounded-xl">
                Discard
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* ── Shift modal ── */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[var(--elite-card)] border border-[var(--elite-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[var(--elite-border)] flex items-center justify-between">
              <h2 className="text-lg font-semibold elite-title">{editingShift ? "Edit Shift" : "Schedule New Shift"}</h2>
              <button onClick={() => setIsShiftModalOpen(false)} className="p-2 hover:bg-[var(--elite-card-2)] rounded-lg transition-colors"><X className="size-5 elite-subtle" /></button>
            </div>
            <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider elite-subtle">Staff Member</label>
                <Combobox
                  value={shiftDraft.staff_id}
                  onValueChange={(val) => setShiftDraft({ ...shiftDraft, staff_id: val })}
                  options={staffList.map(s => ({ value: String(s.id), label: `${s.name} ${s.last_name || ''}` }))}
                  placeholder="Select staff..."
                  className="w-full bg-[var(--elite-card-2)] border-[var(--elite-border)]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider elite-subtle">Location</label>
                <Combobox
                  value={shiftDraft.branch_id || ""}
                  onValueChange={(val) => setShiftDraft({ ...shiftDraft, branch_id: val || null })}
                  options={[{ value: "", label: "All Locations (Org-wide)" }, ...branches.map(b => ({ value: String(b.id), label: b.name }))]}
                  placeholder="Select location..."
                  className="w-full bg-[var(--elite-card-2)] border-[var(--elite-border)]"
                />
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider elite-subtle">Shift Category</label>
                  <div className="grid grid-cols-2 gap-2 bg-[var(--elite-card-2)] p-1 rounded-xl border border-[var(--elite-border)]">
                    <button
                      type="button"
                      onClick={() => setShiftDraft({ ...shiftDraft, shift_type: 'regular' })}
                      className={cn(
                        "py-2 px-3 text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-2",
                        (!shiftDraft.shift_type || shiftDraft.shift_type === 'regular')
                          ? "bg-[var(--elite-orange)] text-white shadow-md"
                          : "elite-subtle hover:text-[var(--elite-text)] hover:bg-white/5"
                      )}
                    >
                      <Briefcase className="size-3.5" /> Work Shift
                    </button>
                    <button
                      type="button"
                      onClick={() => setShiftDraft({ 
                        ...shiftDraft, 
                        shift_type: (shiftDraft.shift_type !== 'regular' && shiftDraft.shift_type) ? shiftDraft.shift_type : 'annual' 
                      })}
                      className={cn(
                        "py-2 px-3 text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-2",
                        (shiftDraft.shift_type && shiftDraft.shift_type !== 'regular')
                          ? "bg-zinc-700 text-white shadow-md"
                          : "elite-subtle hover:text-[var(--elite-text)] hover:bg-white/5"
                      )}
                    >
                      <CalendarOff className="size-3.5" /> Time Off / Leave
                    </button>
                  </div>
                </div>

                {shiftDraft.shift_type && shiftDraft.shift_type !== 'regular' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="text-xs font-bold uppercase tracking-wider elite-subtle">Leave Reason</label>
                    <Combobox
                      value={shiftDraft.shift_type}
                      onValueChange={(val) => setShiftDraft({ ...shiftDraft, shift_type: val })}
                      options={LEAVE_TYPES.map(t => ({ value: t.value, label: t.label }))}
                      placeholder="Select reason..."
                      className="w-full bg-[var(--elite-card-2)] border-[var(--elite-border)] h-11"
                    />
                  </div>
                )}
              </div>

              {(() => {
                const showMultiDay = !editingShift && shiftDraft.shift_type && shiftDraft.shift_type !== 'regular' && shiftDraft.shift_type !== 'off';
                return (
                  <div className={cn("grid gap-4", showMultiDay ? "grid-cols-2" : "grid-cols-1")}>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider elite-subtle">{showMultiDay ? "Start Date" : "Date"}</label>
                      <Input 
                        type="date" 
                        value={shiftDraft.date} 
                        onChange={(e) => setShiftDraft({ ...shiftDraft, date: e.target.value })} 
                        className="bg-[var(--elite-card-2)] border-[var(--elite-border)] h-11" 
                      />
                    </div>
                    {showMultiDay && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-right-2">
                        <label className="text-xs font-bold uppercase tracking-wider elite-subtle">Number of Leave Days</label>
                        <Input 
                          type="number"
                          min={1}
                          max={60}
                          value={numDaysToBook} 
                          onChange={(e) => setNumDaysToBook(Math.max(1, parseInt(e.target.value) || 1))} 
                          className="bg-[var(--elite-card-2)] border-[var(--elite-border)] h-11" 
                        />
                      </div>
                    )}
                  </div>
                );
              })()}

              {(shiftDraft.shift_type === 'regular' || !shiftDraft.shift_type) && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider elite-subtle">Start</label>
                      <Input 
                        type="time" 
                        value={shiftDraft.start_time?.slice(0,5)} 
                        onChange={(e) => setShiftDraft({ ...shiftDraft, start_time: e.target.value })} 
                        className="bg-[var(--elite-card-2)] border-[var(--elite-border)] h-11 px-2" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider elite-subtle">End</label>
                      <Input 
                        type="time" 
                        value={shiftDraft.end_time?.slice(0,5)} 
                        onChange={(e) => setShiftDraft({ ...shiftDraft, end_time: e.target.value })} 
                        className="bg-[var(--elite-card-2)] border-[var(--elite-border)] h-11 px-2" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider elite-subtle">Break (m)</label>
                      <Input 
                        type="number" 
                        min={0}
                        value={shiftDraft.break_minutes ?? 0} 
                        onChange={(e) => setShiftDraft({ ...shiftDraft, break_minutes: Number(e.target.value) })} 
                        className="bg-[var(--elite-card-2)] border-[var(--elite-border)] h-11" 
                      />
                    </div>
                  </div>

                  {/* Shift Duration Display */}
                  {(() => {
                    if (!shiftDraft.start_time || !shiftDraft.end_time) return null;
                    const [h1, m1] = shiftDraft.start_time.split(':').map(Number);
                    const [h2, m2] = shiftDraft.end_time.split(':').map(Number);
                    if (isNaN(h1) || isNaN(h2)) return null;
                    
                    let totalRaw = (h2 * 60 + (m2 || 0)) - (h1 * 60 + (m1 || 0));
                    if (totalRaw < 0) totalRaw += 24 * 60;
                    
                    const brk = Number(shiftDraft.break_minutes || 0);
                    const totalNet = Math.max(0, totalRaw - brk);
                    
                    const rawH = Math.floor(totalRaw / 60);
                    const rawM = totalRaw % 60;
                    const netH = Math.floor(totalNet / 60);
                    const netM = totalNet % 60;
                    
                    return (
                      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-blue-500 flex flex-col gap-1 font-medium text-sm">
                        <div className="flex items-center gap-3">
                          <Clock className="size-4 opacity-70" />
                          <span>Total Duration: <span className="font-bold">{rawH}h {rawM}m</span></span>
                        </div>
                        {brk > 0 && (
                          <div className="text-xs opacity-70 ml-7">
                            ({netH}h {netM}m active work after {brk}m break)
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider elite-subtle">Notes (Optional)</label>
                <textarea 
                  value={shiftDraft.notes || ""} 
                  onChange={(e) => setShiftDraft({ ...shiftDraft, notes: e.target.value })} 
                  className="w-full bg-[var(--elite-card-2)] border border-[var(--elite-border)] rounded-xl p-3 text-sm focus:ring-0 focus:border-[var(--elite-orange)]/50 transition-all elite-title min-h-[80px]"
                  placeholder="Additional instructions..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-[var(--elite-border)] bg-[var(--elite-card-2)]/20 flex gap-3">
              <Button onClick={saveShift} disabled={shiftSaving} className="flex-1 bg-[var(--elite-orange)] hover:bg-[var(--elite-orange-hover)] text-white h-11 rounded-xl">
                {shiftSaving ? "Saving..." : editingShift ? "Update Shift" : "Create Shift"}
              </Button>
              <Button variant="outline" onClick={() => setIsShiftModalOpen(false)} className="px-6 border-[var(--elite-border)] h-11 rounded-xl">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* ── Global Leave Settings Modal ── */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <form onSubmit={updateTenantLimits} className="w-full max-w-md bg-[var(--elite-card)] border border-[var(--elite-border)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[var(--elite-border)] flex items-center justify-between bg-[var(--elite-card-2)]/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[var(--elite-orange)]/10 text-[var(--elite-orange)]">
                  <Settings className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold elite-title leading-none">Enterprise Policies</h2>
                  <p className="text-xs elite-subtle mt-1.5">Define standard default limits for the organization.</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsSettingsModalOpen(false)} className="p-2 hover:bg-[var(--elite-card-2)] rounded-lg transition-colors">
                <X className="size-5 elite-subtle" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider elite-subtle flex items-center gap-2">
                  <div className="size-2 rounded-full bg-emerald-500" />
                  Annual Leave Default
                </label>
                <Input 
                  type="number" 
                  name="annual_limit" 
                  min={0} 
                  required 
                  defaultValue={tenantSettings?.annual_leave_limit ?? 15} 
                  className="bg-[var(--elite-card-2)] border-[var(--elite-border)] h-11 focus:ring-[var(--elite-orange)]" 
                />
                <p className="text-[11px] elite-subtle">Standard paid leaves automatically awarded annually.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider elite-subtle flex items-center gap-2">
                  <div className="size-2 rounded-full bg-rose-500" />
                  Sick Leave Default
                </label>
                <Input 
                  type="number" 
                  name="sick_limit" 
                  min={0} 
                  required 
                  defaultValue={tenantSettings?.sick_leave_limit ?? 10} 
                  className="bg-[var(--elite-card-2)] border-[var(--elite-border)] h-11 focus:ring-[var(--elite-orange)]" 
                />
                <p className="text-[11px] elite-subtle">Medical absences permitted without escalation.</p>
              </div>
            </div>

            <div className="p-6 border-t border-[var(--elite-border)] bg-[var(--elite-card-2)]/20 flex gap-3">
              <Button type="submit" disabled={settingsUpdating} className="flex-1 bg-[var(--elite-orange)] hover:bg-[var(--elite-orange-hover)] text-white h-11 rounded-xl shadow-md transition-all">
                {settingsUpdating ? "Saving..." : "Update Global Policies"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsSettingsModalOpen(false)} className="px-6 border-[var(--elite-border)] h-11 rounded-xl hover:bg-[var(--elite-card-2)]">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
      {/* ── Department Manage Modal ── */}
      {isDepartmentModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[var(--elite-card)] border border-[var(--elite-border)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[var(--elite-border)] flex items-center justify-between bg-[var(--elite-card-2)]/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[var(--elite-orange)]/10 text-[var(--elite-orange)]">
                  <Building className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold elite-title leading-none">{editingDepartment ? "Edit Department" : "New Department"}</h2>
                  <p className="text-xs elite-subtle mt-1.5">Categorize staff assignments effortlessly.</p>
                </div>
              </div>
              <button onClick={() => setIsDepartmentModalOpen(false)} className="p-2 hover:bg-[var(--elite-card-2)] rounded-lg transition-colors">
                <X className="size-5 elite-subtle" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider elite-subtle">Department Name</label>
                <Input 
                  value={deptDraft.name} 
                  onChange={(e) => setDeptDraft({ ...deptDraft, name: e.target.value })}
                  placeholder="e.g., Stylists, Front Desk, Management" 
                  className="bg-[var(--elite-card-2)] border-[var(--elite-border)] h-11 focus:ring-[var(--elite-orange)]" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider elite-subtle">Description <span className="text-[10px] font-normal opacity-50">(Optional)</span></label>
                <textarea 
                  value={deptDraft.description} 
                  onChange={(e) => setDeptDraft({ ...deptDraft, description: e.target.value })}
                  placeholder="Define internal purpose..." 
                  className="w-full bg-[var(--elite-card-2)] border border-[var(--elite-border)] rounded-xl p-3 text-sm min-h-[80px] focus:ring-0 focus:border-[var(--elite-orange)]/50 transition-all elite-title"
                />
              </div>
            </div>

            <div className="p-6 border-t border-[var(--elite-border)] bg-[var(--elite-card-2)]/20 flex gap-3">
              <Button onClick={saveDepartment} disabled={deptSaving} className="flex-1 bg-[var(--elite-orange)] hover:bg-[var(--elite-orange-hover)] text-white h-11 rounded-xl shadow-md transition-all">
                {deptSaving ? "Saving..." : editingDepartment ? "Update Changes" : "Create Department"}
              </Button>
              <Button variant="outline" onClick={() => setIsDepartmentModalOpen(false)} className="px-6 border-[var(--elite-border)] h-11 rounded-xl hover:bg-[var(--elite-card-2)]">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
