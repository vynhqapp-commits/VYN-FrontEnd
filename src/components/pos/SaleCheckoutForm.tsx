"use client";

import { useEffect, useMemo, useState } from "react";
import {
  appointmentsApi,
  cashDrawerApi,
  clientsApi,
  productsApi,
  staffApi,
  servicesApi,
  transactionsApi,
  type Appointment,
  type Client,
  type Product,
  type Service,
  type StaffMember,
} from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/toast";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

type LineType = "service" | "product";
type TipMode = "single" | "equal_split" | "custom";

type PosLine = {
  id: string;
  type: LineType;
  service_id?: string;
  product_id?: string;
  name: string;
  quantity: number;
  unit_price: number;
  deposit_amount?: number;
};

type PaymentRow = {
  id: string;
  method: string;
  amount: number;
  reference?: string;
};

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "wallet", label: "Wallet" },
  { value: "whish", label: "Whish" },
  { value: "omt", label: "OMT" },
];

type Props = {
  locationId: string;
  initialAppointmentId?: string;
  appointments?: Appointment[];
  hideAppointmentPicker?: boolean;
  onSuccess?: () => void;
};

export default function SaleCheckoutForm({
  locationId,
  initialAppointmentId,
  appointments: appointmentsProp,
  hideAppointmentPicker = false,
  onSuccess,
}: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>(
    appointmentsProp ?? [],
  );
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [hasOpenDrawer, setHasOpenDrawer] = useState<boolean>(false);

  const [clientId, setClientId] = useState("");
  const [appointmentId, setAppointmentId] = useState(
    initialAppointmentId ?? "",
  );

  const [lines, setLines] = useState<PosLine[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([
    { id: "p-1", method: "cash", amount: 0 },
  ]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [discountValue, setDiscountValue] = useState(0);
  const [tipsAmount, setTipsAmount] = useState(0);
  const [tipMode, setTipMode] = useState<TipMode>("single");
  const [tipRows, setTipRows] = useState<
    Array<{ id: string; staff_id: string; amount: number }>
  >([{ id: "tip-1", staff_id: "", amount: 0 }]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      clientsApi.list(),
      servicesApi.list(),
      productsApi.list(),
    ]).then(([clientRes, serviceRes, productRes]) => {
      if (!mounted) return;
      if (clientRes.data?.clients) setClients(clientRes.data.clients);
      if (serviceRes.data?.services) setServices(serviceRes.data.services);
      if (productRes.data?.products) setProducts(productRes.data.products);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!locationId) return;
    staffApi
      .list({ branch_id: locationId, include_inactive: false })
      .then((res) => {
        if (!("error" in res) && res.data) {
          setStaff(Array.isArray(res.data) ? res.data : []);
        }
      });
    if (!appointmentsProp) {
      const today = new Date().toISOString().slice(0, 10);
      appointmentsApi
        .list({ location_id: locationId, from: today, to: today })
        .then((res) => {
          if (!("error" in res) && res.data?.appointments)
            setAppointments(res.data.appointments);
        });
    }
    cashDrawerApi.list(locationId, "open").then((res) => {
      if (!("error" in res) && res.data?.sessions) {
        setHasOpenDrawer(res.data.sessions.some((s) => s.status === "open"));
      } else {
        setHasOpenDrawer(false);
      }
    });
  }, [locationId, appointmentsProp]);

  useEffect(() => {
    setAppointments(appointmentsProp ?? []);
  }, [appointmentsProp]);

  useEffect(() => {
    if (!initialAppointmentId) return;
    setAppointmentId(initialAppointmentId);
  }, [initialAppointmentId]);

  const pickAppointment = (id: string) => {
    setAppointmentId(id);
    if (!id) return;
    const appt = appointments.find((a) => a.id === id);
    if (!appt) return;
    if (appt.client_id) setClientId(appt.client_id);
    if (appt.staff_id)
      setTipRows([{ id: "tip-1", staff_id: String(appt.staff_id), amount: 0 }]);
    if (appt.Service?.id) {
      setLines([
        {
          id: `l-appt-${Date.now()}`,
          type: "service",
          service_id: appt.Service.id,
          name: appt.Service.name,
          quantity: 1,
          unit_price: Number(appt.Service.price ?? 0),
          deposit_amount: Number(appt.Service.deposit_amount ?? 0),
        },
      ]);
    }
  };

  useEffect(() => {
    if (!appointmentId) return;
    pickAppointment(appointmentId);
  }, [appointmentId, appointments.length]);

  const clientOptions = useMemo(
    () =>
      clients.map((c) => ({
        value: String(c.id),
        label: `${String(c.full_name ?? "Unnamed client")}${c.phone ? ` · ${c.phone}` : ""}${c.email ? ` · ${c.email}` : ""}`,
        keywords: [c.full_name, c.phone, c.email].filter(Boolean).join(" "),
      })),
    [clients],
  );

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0),
    [lines],
  );
  const discountAmount = useMemo(() => {
    if (discountValue <= 0) return 0;
    if (discountType === "percent")
      return Math.min(subtotal, (subtotal * discountValue) / 100);
    return Math.min(subtotal, discountValue);
  }, [discountType, discountValue, subtotal]);
  const grandTotal = useMemo(
    () => Math.max(0, subtotal - discountAmount + tipsAmount),
    [subtotal, discountAmount, tipsAmount],
  );
  const paid = useMemo(
    () =>
      payments.reduce(
        (sum, p) => sum + (Number.isFinite(p.amount) ? p.amount : 0),
        0,
      ),
    [payments],
  );
  const requiredDeposit = useMemo(
    () =>
      lines.reduce((sum, l) => {
        if (l.type !== "service") return sum;
        return sum + Number(l.deposit_amount ?? 0) * Number(l.quantity ?? 1);
      }, 0),
    [lines],
  );
  const remaining = useMemo(
    () => Math.max(0, grandTotal - paid),
    [grandTotal, paid],
  );
  const nonCashPaid = useMemo(
    () =>
      payments
        .filter((p) => p.method !== "cash")
        .reduce(
          (sum, p) => sum + (Number.isFinite(p.amount) ? p.amount : 0),
          0,
        ),
    [payments],
  );
  const cashTendered = useMemo(
    () =>
      payments
        .filter((p) => p.method === "cash")
        .reduce(
          (sum, p) => sum + (Number.isFinite(p.amount) ? p.amount : 0),
          0,
        ),
    [payments],
  );
  const cashDue = useMemo(
    () => Math.max(0, grandTotal - nonCashPaid),
    [grandTotal, nonCashPaid],
  );
  const changeDue = useMemo(
    () => Math.max(0, cashTendered - cashDue),
    [cashTendered, cashDue],
  );
  const cashToDrawer = useMemo(
    () => Math.max(0, Math.min(cashTendered, cashDue)),
    [cashTendered, cashDue],
  );

  const addLine = (type: LineType, sourceId: string) => {
    if (!sourceId) return;
    if (type === "service") {
      const svc = services.find((s) => String(s.id) === String(sourceId));
      if (!svc) return;
      setLines((prev) => [
        ...prev,
        {
          id: `l-${Date.now()}-${prev.length}`,
          type: "service",
          service_id: svc.id,
          name: svc.name,
          quantity: 1,
          unit_price: Number(svc.price ?? 0),
          deposit_amount: Number(svc.deposit_amount ?? 0),
        },
      ]);
      return;
    }
    const prod = products.find((p) => String(p.id) === String(sourceId));
    if (!prod) return;
    setLines((prev) => [
      ...prev,
      {
        id: `l-${Date.now()}-${prev.length}`,
        type: "product",
        product_id: prod.id,
        name: prod.name,
        quantity: 1,
        unit_price: Number(prod.price ?? 0),
      },
    ]);
  };

  const updateLine = (id: string, patch: Partial<PosLine>) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const removeLine = (id: string) =>
    setLines((prev) => prev.filter((l) => l.id !== id));

  const updatePayment = (id: string, patch: Partial<PaymentRow>) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  };

  const addPaymentRow = () => {
    setPayments((prev) => [
      ...prev,
      { id: `p-${Date.now()}-${prev.length}`, method: "cash", amount: 0 },
    ]);
  };

  const removePaymentRow = (id: string) => {
    setPayments((prev) =>
      prev.length <= 1 ? prev : prev.filter((p) => p.id !== id),
    );
  };

  const buildApiPayments = () => {
    const normalized = [...payments];
    let cashLeftToCap = cashDue;
    return normalized
      .map((row) => {
        if (row.method !== "cash") return row;
        const allowed = Math.max(0, Math.min(row.amount, cashLeftToCap));
        cashLeftToCap = Math.max(0, cashLeftToCap - allowed);
        return { ...row, amount: allowed };
      })
      .filter((p) => p.amount > 0)
      .map((p) => ({
        method: p.method,
        amount: p.amount,
        reference: p.reference,
      }));
  };

  const handleSubmit = async () => {
    if (!locationId) return toastError("Please select a location.");
    if (!clientId) return toastError("Please select a client.");
    if (!lines.length)
      return toastError("Add at least one service or product to the sale.");
    if (requiredDeposit > 0 && paid + 0.01 < requiredDeposit) {
      return toastError(
        `Minimum required deposit is ${requiredDeposit.toFixed(2)}.`,
      );
    }

    const apiPayments = buildApiPayments();
    const normalizedPaid = apiPayments.reduce((sum, p) => sum + p.amount, 0);
    const normalizedCash = apiPayments
      .filter((p) => p.method === "cash")
      .reduce((sum, p) => sum + p.amount, 0);
    if (normalizedPaid > grandTotal + 0.01)
      return toastError("Payment total cannot exceed the order total.");
    if (normalizedCash > 0 && !hasOpenDrawer) {
      return toastError(
        "Cash drawer is not open for this location. Open a drawer session before taking cash payments.",
      );
    }

    setSubmitting(true);
    const body = {
      client_id: clientId,
      location_id: locationId,
      appointment_id: appointmentId || undefined,
      discount_code: discountCode.trim() || undefined,
      discount_type: discountValue > 0 ? discountType : undefined,
      discount_value: discountValue > 0 ? discountValue : undefined,
      tips_amount: tipsAmount > 0 ? tipsAmount : undefined,
      tip_allocation_mode: tipsAmount > 0 ? tipMode : undefined,
      tip_allocations:
        tipsAmount > 0
          ? tipRows
              .filter((r) => r.staff_id)
              .map((r) => ({
                staff_id: r.staff_id,
                amount: tipMode === "custom" ? r.amount : undefined,
              }))
          : undefined,
      items: lines.map((l) => ({
        type: l.type,
        service_id: l.service_id,
        product_id: l.product_id,
        quantity: l.quantity,
        unit_price: l.unit_price,
      })),
      payments: apiPayments,
    };
    const { data, error: err } = await transactionsApi.create(body);
    setSubmitting(false);
    if (err || !data?.transaction)
      return toastError(err || "Failed to complete sale.");

    setLines([]);
    setPayments([{ id: "p-1", method: "cash", amount: 0 }]);
    const invoiceNumber = data.transaction?.invoice_number
      ? String(data.transaction.invoice_number)
      : null;
    toastSuccess(
      normalizedPaid + 0.01 < grandTotal
        ? `Sale recorded${invoiceNumber ? ` (Invoice ${invoiceNumber})` : ""}. Remaining amount has been added to client debt.`
        : `Sale completed successfully${invoiceNumber ? ` (Invoice ${invoiceNumber})` : ""}.`,
    );
    onSuccess?.();
  };

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)] elite-shell">
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-[280px] w-full rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-[260px] w-full rounded-xl" />
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)] elite-shell">
      <div className="space-y-4">
        {!hideAppointmentPicker && (
          <div className="elite-panel p-4 space-y-2">
            <h2 className="font-display text-sm font-semibold elite-title">
              Booking link (optional)
            </h2>
            <select
              value={appointmentId}
              onChange={(e) => pickAppointment(e.target.value)}
              className="w-full elite-input rounded-lg px-3 py-2 text-sm"
            >
              <option value="">No appointment</option>
              {appointments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.Client?.full_name ?? a.client_id} ·{" "}
                  {a.Service?.name ?? a.service_id}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="elite-panel p-4 space-y-3">
          <h2 className="font-display text-sm font-semibold elite-title">
            Client
          </h2>
          <Combobox
            value={clientId}
            onValueChange={setClientId}
            options={clientOptions}
            placeholder="Select client"
            searchPlaceholder="Search clients..."
          />
        </div>

        <div className="elite-panel p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-sm font-semibold elite-title">
              Items
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
              <select
                onChange={(e) =>
                  e.target.value
                    ? (addLine("service", e.target.value),
                      (e.target.value = ""))
                    : undefined
                }
                className="elite-input w-full rounded-lg px-3 py-1.5 text-xs"
                defaultValue=""
              >
                <option value="">+ Add service</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                onChange={(e) =>
                  e.target.value
                    ? (addLine("product", e.target.value),
                      (e.target.value = ""))
                    : undefined
                }
                className="elite-input w-full rounded-lg px-3 py-1.5 text-xs"
                defaultValue=""
              >
                <option value="">+ Add product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {lines.length === 0 ? (
            <p className="elite-subtle text-xs">
              No items yet. Add a service or product to start.
            </p>
          ) : (
            <div className="space-y-2">
              {lines.map((line) => (
                <div
                  key={line.id}
                  className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto] gap-2 items-center"
                >
                  <div>
                    <p className="text-sm font-medium elite-title truncate">
                      {line.name}
                    </p>
                    <p className="text-[11px] uppercase tracking-wide elite-subtle">
                      {line.type === "service" ? "Service" : "Product"}
                    </p>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(line.id, {
                        quantity: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.unit_price}
                    onChange={(e) =>
                      updateLine(line.id, {
                        unit_price: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    className="text-xs text-salon-stone hover:text-salon-espresso"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="elite-panel p-4 space-y-3">
          <h2 className="font-display text-sm font-semibold elite-title">
            Summary
          </h2>
          <div className="space-y-2 rounded-lg border border-[var(--elite-border)] bg-[var(--elite-surface)] p-2">
            <p className="text-[11px] font-medium elite-subtle">Discount code</p>
            <Input
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              placeholder="Code (optional)"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={discountType}
                onChange={(e) =>
                  setDiscountType(e.target.value as "flat" | "percent")
                }
                className="w-full elite-input rounded-lg px-3 py-2 text-xs"
              >
                <option value="flat">Flat</option>
                <option value="percent">Percent %</option>
              </select>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={discountValue}
                onChange={(e) =>
                  setDiscountValue(Math.max(0, Number(e.target.value) || 0))
                }
              />
            </div>
            <p className="text-[11px] font-medium elite-subtle">Tip amount</p>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={tipsAmount}
              onChange={(e) =>
                setTipsAmount(Math.max(0, Number(e.target.value) || 0))
              }
              placeholder="Enter tip amount"
            />
            <p className="text-[11px] font-medium elite-subtle">Tip allocation</p>
            <select
              value={tipMode}
              onChange={(e) => setTipMode(e.target.value as TipMode)}
                className="w-full elite-input rounded-lg px-3 py-2 text-xs"
            >
              <option value="single">Single staff</option>
              <option value="equal_split">Equal split</option>
              <option value="custom">Custom split</option>
            </select>
            {tipRows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_auto] gap-2 items-center"
              >
                <select
                  value={row.staff_id}
                  onChange={(e) =>
                    setTipRows((prev) =>
                      prev.map((x) =>
                        x.id === row.id
                          ? { ...x, staff_id: e.target.value }
                          : x,
                      ),
                    )
                  }
                  className="w-full elite-input rounded-lg px-3 py-2 text-xs"
                >
                  <option value="">Select staff</option>
                  {staff.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={row.amount}
                  onChange={(e) =>
                    setTipRows((prev) =>
                      prev.map((x) =>
                        x.id === row.id
                          ? {
                              ...x,
                              amount: Math.max(0, Number(e.target.value) || 0),
                            }
                          : x,
                      ),
                    )
                  }
                  disabled={tipMode !== "custom"}
                />
                <button
                  type="button"
                  onClick={() =>
                    setTipRows((prev) =>
                      prev.length > 1
                        ? prev.filter((x) => x.id !== row.id)
                        : prev,
                    )
                  }
                  className="text-xs text-salon-stone hover:text-salon-espresso"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm elite-subtle">
            <span>Total</span>
            <span className="font-display text-xl font-semibold elite-title">
              {grandTotal.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="elite-panel p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold elite-title">
              Payments
            </h2>
            <button
              type="button"
              onClick={addPaymentRow}
              className="text-xs font-medium text-[var(--elite-orange)] hover:opacity-80"
            >
              + Add payment
            </button>
          </div>
          {payments.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] gap-2 items-center"
            >
              <select
                value={p.method}
                onChange={(e) =>
                  updatePayment(p.id, { method: e.target.value })
                }
                className="w-full elite-input rounded-lg px-3 py-2 text-xs"
              >
                {paymentMethods.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={p.amount}
                onChange={(e) =>
                  updatePayment(p.id, {
                    amount: Math.max(0, Number(e.target.value) || 0),
                  })
                }
              />
              <button
                type="button"
                onClick={() => removePaymentRow(p.id)}
                className="text-xs text-salon-stone hover:text-salon-espresso"
              >
                ✕
              </button>
            </div>
          ))}
          <div className="text-xs elite-subtle space-y-1">
            <div className="rounded-lg border border-[var(--elite-border)] bg-[var(--elite-surface)] px-2 py-1.5">
              <div className="flex justify-between">
                <span>Cash drawer session</span>
                <span className={hasOpenDrawer ? "text-emerald-700 font-medium" : "text-amber-700 font-medium"}>
                  {hasOpenDrawer ? "Open" : "Closed"}
                </span>
              </div>
              {!hasOpenDrawer && (
                <p className="mt-1">
                  Open session from{" "}
                  <Link href="/dashboard/cash-drawer" className="text-[var(--elite-orange)] font-medium hover:opacity-80">
                    Cash drawer
                  </Link>{" "}
                  to accept cash in checkout.
                </p>
              )}
            </div>
            <div className="flex justify-between">
              <span>Paid</span>
              <span>{paid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Remaining</span>
              <span>{remaining.toFixed(2)}</span>
            </div>
            {changeDue > 0 && (
              <p className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
                Change due: {changeDue.toFixed(2)} (cash sent to API is capped
                to amount due).
              </p>
            )}
            {cashToDrawer > 0 && (
              <p className="text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">
                Auto-post to cash drawer from this sale: {cashToDrawer.toFixed(2)}.
              </p>
            )}
            {remaining > 0 && (
              <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                Partial payment will be recorded as client debt.
              </p>
            )}
            {requiredDeposit > 0 && paid + 0.01 < requiredDeposit && (
              <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                Deposit rule not met. Collect at least{" "}
                {requiredDeposit.toFixed(2)}.
              </p>
            )}
          </div>
          <Button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="mt-2 w-full h-11 rounded-xl text-sm font-semibold elite-btn-primary"
          >
            {submitting ? "Processing..." : "Complete sale"}
          </Button>
        </div>
      </div>
    </div>
  );
}
