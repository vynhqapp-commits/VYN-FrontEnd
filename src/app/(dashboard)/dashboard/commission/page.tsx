"use client";

import { useEffect, useState } from "react";
import {
  commissionApi,
  CommissionRecord,
  settingsApi,
  staffApi,
  type StaffMember,
} from "@/lib/api";
import { toast } from "sonner";
import { BadgePercent, TrendingUp } from "lucide-react";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMoney(amount: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  } catch {
    return `${Number(amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currencyCode}`;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommissionPage() {
  const [currency, setCurrency] = useState("USD");
  const [from, setFrom] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    return `${y}-${String(m + 1).padStart(2, '0')}-01`;
  });
  const [to, setTo] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  });
  const [staffId, setStaffId] = useState("");
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [earnings, setEarnings] = useState<CommissionRecord[]>([]);
  const [earningsTotal, setEarningsTotal] = useState(0);
  const [loadingEarnings, setLoadingEarnings] = useState(false);

  useEffect(() => {
    settingsApi.get().then((r) => {
      if (!("error" in r) && r.data?.salon?.currency) {
        const c = String(r.data.salon.currency)
          .trim()
          .toUpperCase()
          .slice(0, 3);
        if (c) setCurrency(c);
      }
    });
  }, []);

  useEffect(() => {
    staffApi.list().then(({ data, error }) => {
      if (error) {
        toast.error(error);
        return;
      }
      setStaffList(data ?? []);
    });
  }, []);

  const loadEarnings = async () => {
    if (!staffId) {
      toast.error("Select a staff member first.");
      return;
    }
    if (!from || !to) {
      toast.error("Please select both a From Date and a To Date.");
      return;
    }
    setLoadingEarnings(true);
    const res = await commissionApi.earnings({
      staff_id: staffId,
      from: from || undefined,
      to: to || undefined,
    });
    setLoadingEarnings(false);
    if ("error" in res && res.error) toast.error(res.error);
    else if (res.data) {
      setEarnings(res.data.records ?? []);
      setEarningsTotal(res.data.total ?? 0);
    }
  };

  const selectedStaff = staffList.find((s) => String(s.id) === String(staffId));
  const baseSalary = selectedStaff ? Number(selectedStaff.salary_value ?? 0) : 0;

  return (
    <div className="space-y-5 elite-shell">
      {/* Page header */}
      <DashboardPageHeader
        title="Commission & Tips"
        description="Monitor staff commission rules and calculated stylist earnings."
        icon={<BadgePercent className="w-5 h-5" />}
      />

      <div className="max-w-4xl mx-auto">
        {/* Earnings */}
        <section className="elite-panel overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-[var(--elite-surface)]/50">
            <TrendingUp className="size-4 text-[var(--elite-orange)]" />
            <h2 className="text-sm font-semibold elite-title">
              Staff Earnings Report
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex gap-3 flex-wrap">
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground flex-1 min-w-[200px]">
                Staff Member
                <select
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  className="border border-border rounded-xl px-3 py-2 bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 font-medium"
                >
                  <option value="">Select staff member</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground flex-1 min-w-[140px]">
                From Date
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="border border-border rounded-xl px-3 py-2 bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 font-medium"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground flex-1 min-w-[140px]">
                To Date
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="border border-border rounded-xl px-3 py-2 bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 font-medium"
                />
              </label>
            </div>
            
            <button
              type="button"
              onClick={loadEarnings}
              disabled={loadingEarnings}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-colors shadow-sm"
            >
              {loadingEarnings ? "Loading…" : "Run report"}
            </button>

            {earnings.length > 0 && selectedStaff && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-[var(--elite-surface)]/30 rounded-2xl border border-[var(--elite-border)] shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Defined Base Salary */}
                <div className="flex flex-col p-4 rounded-xl bg-white dark:bg-black/10 border border-[var(--elite-border)] shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Defined Base Salary
                  </span>
                  <span className="font-display text-xl font-black text-foreground/80 mt-1">
                    {formatMoney(baseSalary, currency)}
                  </span>
                </div>

                {/* Commissions & Tips */}
                <div className="flex flex-col p-4 rounded-xl bg-white dark:bg-black/10 border border-[var(--elite-border)] shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Commissions & Tips
                  </span>
                  <span className="font-display text-xl font-black text-[var(--elite-orange)] mt-1">
                    {formatMoney(earningsTotal, currency)}
                  </span>
                </div>

                {/* Total Projected Payout */}
                <div className="flex flex-col p-4 rounded-xl bg-gradient-to-r from-[var(--elite-orange-dim)] to-transparent border border-[var(--elite-orange)]/25 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--elite-orange)]">
                    Total Projected Payout
                  </span>
                  <span className="font-display text-2xl font-black text-primary mt-0.5">
                    {formatMoney(earningsTotal + baseSalary, currency)}
                  </span>
                </div>
              </div>
            )}

            <div className="overflow-x-auto border border-border rounded-xl max-h-96">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground sticky top-0">
                  <tr>
                    <th className="py-3 px-4 text-left font-semibold">Date</th>
                    <th className="py-3 px-4 text-left font-semibold">Type</th>
                    <th className="py-3 px-4 text-left font-semibold">Invoice</th>
                    <th className="py-3 px-4 text-right font-semibold">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {earnings.map((r) => {
                    const rec = r as any;
                    return (
                      <tr key={rec.id} className="hover:bg-muted/20">
                        <td className="py-2.5 px-4 text-muted-foreground text-xs font-medium">
                          {rec.created_at
                            ? new Date(rec.created_at).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                              rec.type === "tip"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {rec.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground">
                          {rec.invoice_number ? (
                            <span className="font-semibold text-foreground/85">
                              {rec.invoice_number}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold text-foreground tabular-nums">
                          {formatMoney(Number(rec.amount), currency)}
                        </td>
                      </tr>
                    );
                  })}
                  {earnings.length === 0 && !loadingEarnings && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-12 text-center text-muted-foreground text-sm font-medium"
                      >
                        Select a staff member and date range to see their commission & tip earnings.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
