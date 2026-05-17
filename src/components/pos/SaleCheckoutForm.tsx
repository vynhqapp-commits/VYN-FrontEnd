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
  catalogApi,
  settingsApi,
  couponsApi,
  giftCardsApi,
  type Appointment,
  type Client,
  type Product,
  type Service,
  type PackageTemplate,
  type MembershipPlanTemplate,
  type Coupon,
  type GiftCard,
  type StaffMember,
} from "@/lib/api";
import { Plus, Trash2, User, ShoppingBag, CreditCard, Tags, Info, Search, Package, Star, ChevronDown } from "lucide-react";
import { toastError, toastSuccess } from "@/lib/toast";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import Link from "next/link";

type LineType = "service" | "product" | "package" | "membership";
type TipMode = "single" | "equal_split" | "custom";

type PosLine = {
  id: string;
  type: LineType;
  service_id?: string;
  product_id?: string;
  package_template_id?: string;
  membership_plan_id?: string;
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
  { value: "gift_card", label: "Gift Card" },
];

function RichSelectMenu({
  label,
  icon,
  items,
  onSelect,
  buttonClass,
}: {
  label: string;
  icon: React.ReactNode;
  items: Array<{ id: string; name: string; info?: string }>;
  onSelect: (id: string) => void;
  buttonClass: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  
  const filtered = useMemo(() => {
    const needle = q.toLowerCase().trim();
    if (!needle) return items;
    return items.filter(x => 
      x.name.toLowerCase().includes(needle) || 
      x.info?.toLowerCase().includes(needle)
    );
  }, [items, q]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button 
          type="button"
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:brightness-110 active:scale-95 shadow-sm", 
            buttonClass
          )}
        >
          {icon}
          {label}
          <ChevronDown className="size-3 opacity-70 ml-0.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="p-0 w-64 bg-[var(--elite-card)] border border-[var(--elite-border)] shadow-2xl rounded-2xl z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200" 
        align="end"
      >
        <div className="p-2 bg-[var(--elite-surface)]/70 border-b border-[var(--elite-border)]">
          <div className="relative flex items-center">
            <Search className="absolute left-2 size-3 text-[var(--elite-muted)]" />
            <input 
              autoFocus
              placeholder="Quick search..." 
              value={q} 
              onChange={e => setQ(e.target.value)}
              className="w-full bg-[var(--elite-card)] border border-[var(--elite-border)] rounded-xl pl-7 pr-2 py-1.5 text-xs text-[var(--elite-text)] placeholder:text-[var(--elite-muted)]/60 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 transition-all"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto elite-scrollbar p-1.5 space-y-0.5">
          {filtered.length === 0 ? (
             <div className="py-6 text-center text-xs font-medium text-[var(--elite-muted)]">No matches found.</div>
          ) : (
            filtered.map(x => (
              <button 
                key={x.id} 
                type="button"
                className="w-full text-left p-2.5 rounded-xl hover:bg-[var(--elite-surface)] flex flex-col items-start transition-colors group"
                onClick={() => {
                  onSelect(x.id);
                  setOpen(false);
                  setQ("");
                }}
              >
                <span className="text-xs font-black elite-title group-hover:text-[var(--elite-text-strong)] transition-colors">{x.name}</span>
                {x.info && <span className="text-[9px] font-bold uppercase tracking-wide text-[var(--elite-muted)] mt-0.5 opacity-80 group-hover:opacity-100">{x.info}</span>}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

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
  const [packageTemplates, setPackageTemplates] = useState<PackageTemplate[]>([]);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlanTemplate[]>([]);
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

  const [eligiblePackages, setEligiblePackages] = useState<any[]>([]);
  const [redeemPackageId, setRedeemPackageId] = useState<string>("");
  const [redeemType, setRedeemType] = useState<"package" | "membership">("package");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [discountValue, setDiscountValue] = useState(0);
  const [giftCardCode, setGiftCardCode] = useState("");
  const [verifyingGC, setVerifyingGC] = useState(false);
  const [tipsAmount, setTipsAmount] = useState(0);
  const [tipMode, setTipMode] = useState<TipMode>("single");
  const [tipRows, setTipRows] = useState<
    Array<{ id: string; staff_id: string; amount: number }>
  >([{ id: "tip-1", staff_id: "", amount: 0 }]);

  const [applyVat, setApplyVat] = useState<boolean>(false);
  const [vatRate, setVatRate] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      clientsApi.list(),
      servicesApi.list(),
      productsApi.list(),
      catalogApi.listPackages(true),
      catalogApi.listMemberships(true),
      settingsApi.get(),
    ]).then(([clientRes, serviceRes, productRes, pkgRes, memRes, settingsRes]) => {
      if (!mounted) return;
      if (clientRes.data?.clients) setClients(clientRes.data.clients);
      if (serviceRes.data?.services) setServices(serviceRes.data.services);
      if (productRes.data?.products) setProducts(productRes.data.products);
      if (!("error" in pkgRes) && (pkgRes as any).data?.packages)
        setPackageTemplates((pkgRes as any).data.packages);
      if (!("error" in memRes) && (memRes as any).data?.memberships)
        setMembershipPlans((memRes as any).data.memberships);

      if (!("error" in settingsRes) && settingsRes.data?.salon) {
        setApplyVat(!!settingsRes.data.salon.apply_vat);
        setVatRate(Number(settingsRes.data.salon.vat_rate ?? 0));
      }

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
          if (!("error" in res) && res.data?.appointments) {
            // Filter out completed, cancelled, and no-show appointments
            const available = res.data.appointments.filter(
              (a) => !['completed', 'cancelled', 'no_show'].includes(a.status)
            );
            setAppointments(available);
          }
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

  useEffect(() => {
    if (!clientId) {
      setEligiblePackages([]);
      setRedeemPackageId("");
      return;
    }

    const serviceIds = lines
      .filter(l => l.type === 'service' && l.service_id)
      .map(l => l.service_id as string);

    if (serviceIds.length === 0) {
      setEligiblePackages([]);
      setRedeemPackageId("");
      return;
    }

    clientsApi.eligiblePackages(clientId, serviceIds).then((res) => {
      if (!('error' in res) && res.data?.packages) {
        setEligiblePackages(res.data.packages);
        // Automatically pre-select if exactly one is found and none is currently selected
        if (res.data.packages.length === 1 && !redeemPackageId) {
          const first = res.data.packages[0];
          setRedeemPackageId(String(first.id));
          setRedeemType(first.type === 'membership' ? 'membership' : 'package');
        } else if (res.data.packages.length === 0) {
          setRedeemPackageId("");
          setRedeemType("package");
        }
      }
    });
  }, [clientId, lines]);

  const clientOptions = useMemo(
    () =>
      clients.map((c) => ({
        value: String(c.id),
        label: `${String(c.full_name ?? "Unnamed client")}${c.phone ? ` · ${c.phone}` : ""}${c.email ? ` · ${c.email}` : ""}`,
        keywords: [c.full_name, c.phone, c.email].filter(Boolean).join(" "),
      })),
    [clients],
  );

  const appointmentOptions = useMemo(
    () =>
      [
        { value: "", label: "No appointment" },
        ...appointments.map((a) => ({
          value: String(a.id),
          label: `${a.Client?.full_name ?? a.client_id} · ${a.Service?.name ?? a.service_id}`,
          keywords: [a.Client?.full_name, a.Service?.name].filter(Boolean).join(" "),
        })),
      ],
    [appointments],
  );

  const subtotal = useMemo(() => {
    return lines.reduce((sum, l) => {
      let price = l.unit_price;
      // If a package/membership is selected for redemption, covered services are free ($0)
      if (redeemPackageId && l.type === "service") {
        const pkg = (eligiblePackages as any[]).find(p => String(p.id) === String(redeemPackageId));
        if (pkg && pkg.covered_services) {
          const isCovered = pkg.covered_services.some((cs: any) => String(cs.id) === String(l.service_id));
          if (isCovered) price = 0;
        }
      }
      return sum + l.quantity * price;
    }, 0);
  }, [lines, redeemPackageId, eligiblePackages]);
  const discountAmount = useMemo(() => {
    if (discountValue <= 0) return 0;
    if (discountType === "percent")
      return Math.min(subtotal, (subtotal * discountValue) / 100);
    return Math.min(subtotal, discountValue);
  }, [discountType, discountValue, subtotal]);
  const vatAmount = useMemo(() => {
    if (!applyVat || vatRate <= 0) return 0;
    const taxable = Math.max(0, subtotal - discountAmount);
    return (taxable * vatRate) / 100;
  }, [applyVat, vatRate, subtotal, discountAmount]);
  const grandTotal = useMemo(
    () => Math.max(0, subtotal - discountAmount + vatAmount + tipsAmount),
    [subtotal, discountAmount, vatAmount, tipsAmount],
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

  const hasPackageOrMembership = useMemo(
    () => lines.some((l) => l.type === "package" || l.type === "membership"),
    [lines],
  );

  // Auto-fetch coupon details when code is entered
  useEffect(() => {
    const code = discountCode.trim().toUpperCase();
    if (!code || code.length < 2) return;
    const timer = setTimeout(async () => {
      try {
        const res = await couponsApi.validate(code, clientId || undefined);
        
        if ("error" in res) {
          // Only show error if it's a "real" error (like already used) and not just "not found"
          if (res.error?.includes("already redeemed")) {
            toastError(res.error);
            setDiscountValue(0);
          }
          return;
        }

        const found = res.data?.coupon;
        if (found) {
          setDiscountType(found.type);
          setDiscountValue(Number(found.value));
          toastSuccess(`Coupon "${found.code}" applied!`);
        }
      } catch (err) {
        console.error("Coupon check failed", err);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [discountCode, subtotal]);

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
    if (type === "product") {
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
      return;
    }
    if (type === "package") {
      const tpl = packageTemplates.find((t) => String(t.id) === String(sourceId));
      if (!tpl) return;
      setLines((prev) => [
        ...prev,
        {
          id: `l-${Date.now()}-${prev.length}`,
          type: "package",
          package_template_id: tpl.id,
          name: `📦 ${tpl.name} (${tpl.total_sessions} sessions)`,
          quantity: 1,
          unit_price: Number(tpl.price ?? 0),
        },
      ]);
      return;
    }
    if (type === "membership") {
      const plan = membershipPlans.find((m) => String(m.id) === String(sourceId));
      if (!plan) return;
      setLines((prev) => [
        ...prev,
        {
          id: `l-${Date.now()}-${prev.length}`,
          type: "membership",
          membership_plan_id: plan.id,
          name: `🎫 ${plan.name} (${plan.credits_per_renewal} credits/renewal)`,
          quantity: 1,
          unit_price: Number(plan.price ?? 0),
        },
      ]);
    }
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

  const handleApplyGiftCard = async () => {
    const code = giftCardCode.trim().toUpperCase();
    if (!code) return;
    
    setVerifyingGC(true);
    try {
      const res = await giftCardsApi.getByCode(code, clientId || undefined);
      if ("error" in res) {
        console.error("Gift Card Verification Error:", res.error);
        toastError(res.error || "Gift card not found");
      } else if (res.data?.gift_card) {
        const gc = res.data.gift_card;
        const balance = Number(gc.remaining_balance || 0);
        if (balance <= 0) {
          toastError("This gift card has no remaining balance");
        } else {
          // Add as a payment row
          const amountToApply = Math.min(remaining, balance);
          setPayments(prev => {
            // Remove any existing gift card payment with the same code or replace empty cash row if only one
            const filtered = prev.filter(p => p.method !== 'gift_card' || p.reference !== code);
            const base = (filtered.length === 1 && filtered[0].method === 'cash' && filtered[0].amount === 0) ? [] : filtered;
            return [
              ...base,
              { id: `gc-${Date.now()}`, method: 'gift_card', amount: amountToApply, reference: code }
            ];
          });
          setGiftCardCode("");
          toastSuccess(`Applied $${amountToApply.toFixed(2)} from Gift Card`);
        }
      }
    } catch (err) {
      toastError("Failed to verify gift card");
    } finally {
      setVerifyingGC(false);
    }
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
      return toastError("Add at least one item to the sale.");
    if (hasPackageOrMembership && !clientId)
      return toastError("A client must be selected when selling a package or membership.");
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
      customer_id: clientId,
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
      redeem_package_id: redeemPackageId || undefined,
      redeem_type: redeemPackageId ? redeemType : undefined,
      package_template_id: lines.find((l) => l.type === "package")?.package_template_id || undefined,
      membership_plan_id: lines.find((l) => l.type === "membership")?.membership_plan_id || undefined,
      items: lines
        .filter((l) => l.type === "service" || l.type === "product")
        .map((l) => {
          let price = l.unit_price;
          // Apply $0 price for redeemed services in the payload too
          if (redeemPackageId && l.type === "service") {
            const pkg = (eligiblePackages as any[]).find(p => String(p.id) === String(redeemPackageId));
            if (pkg && pkg.covered_services) {
              const isCovered = pkg.covered_services.some((cs: any) => String(cs.id) === String(l.service_id));
              if (isCovered) price = 0;
            }
          }
          return {
            type: l.type as "service" | "product",
            service_id: l.service_id,
            product_id: l.product_id,
            quantity: l.quantity,
            unit_price: price,
          };
        }),
      payments: apiPayments,
    };
    if (!body.items.length && !body.package_template_id && !body.membership_plan_id) {
      return toastError("Add at least one item to the sale.");
    }
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
      <div className="elite-shell grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-[280px] w-full rounded-xl" />
        </div>
        <div className="lg:col-span-1 space-y-4">
          <Skeleton className="h-[260px] w-full rounded-xl" />
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="elite-shell grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        {/* Client Selection */}
        <div className="rounded-2xl border border-[var(--elite-border)] bg-[var(--elite-card)] shadow-sm">
          <div className="p-4 border-b border-[var(--elite-border)] bg-[var(--elite-surface)]/50 flex items-center gap-2">
            <User className="size-4 text-[var(--elite-orange)]" />
            <h2 className="text-[11px] font-bold uppercase tracking-wider elite-title">Client Information</h2>
          </div>
          <div className="p-5 space-y-4">
            {!hideAppointmentPicker && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wide elite-subtle">Link to Appointment</label>
                <Combobox
                  value={appointmentId}
                  onValueChange={pickAppointment}
                  options={appointmentOptions}
                  placeholder="Find appointment..."
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wide elite-subtle">Select Client</label>
              <Combobox
                value={clientId}
                onValueChange={setClientId}
                options={clientOptions}
                placeholder="Search clients..."
                searchPlaceholder="Name, phone, or email..."
              />
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="rounded-2xl border border-[var(--elite-border)] bg-[var(--elite-card)] shadow-sm">
          <div className="p-4 border-b border-[var(--elite-border)] bg-[var(--elite-surface)]/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="size-4 text-[var(--elite-orange)]" />
              <h2 className="text-[11px] font-bold uppercase tracking-wider elite-title">Sale Items</h2>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <RichSelectMenu 
                label="Add Service"
                icon={<Star className="size-3 opacity-90" />}
                buttonClass="bg-[var(--elite-orange)] text-white border-none"
                onSelect={(id) => addLine("service", id)}
                items={services.map(s => ({ id: String(s.id), name: s.name, info: `Service · $${Number(s.price || 0).toFixed(2)}` }))}
              />
              
              <RichSelectMenu 
                label="Add Product"
                icon={<Package className="size-3 opacity-90" />}
                buttonClass="bg-[var(--elite-teal)] text-white border-none"
                onSelect={(id) => addLine("product", id)}
                items={products.map(p => ({ id: String(p.id), name: p.name, info: `Product · $${Number(p.price || 0).toFixed(2)}` }))}
              />

              {(packageTemplates.length > 0 || membershipPlans.length > 0) && (
                <RichSelectMenu 
                  label="Bundles"
                  icon={<Plus className="size-3 opacity-90" />}
                  buttonClass="bg-[var(--elite-surface)] elite-title border border-[var(--elite-border)]"
                  onSelect={(combined) => {
                    const [type, id] = combined.split(':');
                    if (type === 'pkg') addLine("package", id);
                    if (type === 'mem') addLine("membership", id);
                  }}
                  items={[
                    ...packageTemplates.map((t) => ({ id: `pkg:${t.id}`, name: `📦 ${t.name}`, info: `Package · ${t.total_sessions} sessions` })),
                    ...membershipPlans.map((m) => ({ id: `mem:${m.id}`, name: `🎫 ${m.name}`, info: `Membership · ${m.credits_per_renewal} renewal` }))
                  ]}
                />
              )}
            </div>
          </div>

          <div className="p-0">
            {lines.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <div className="inline-flex p-3 rounded-full bg-[var(--elite-surface)] text-[var(--elite-muted)]">
                  <ShoppingBag className="size-6" />
                </div>
                <p className="text-sm font-medium elite-subtle">Your cart is empty</p>
                <p className="text-xs elite-muted max-w-[200px] mx-auto">Add services or products to begin checkout.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--elite-border)]">
                {lines.map((line) => (
                  <div key={line.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 group hover:bg-[var(--elite-surface)]/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {line.type === 'service' && <Star className="size-3 text-[var(--elite-orange)]" />}
                        {line.type === 'product' && <Package className="size-3 text-[var(--elite-teal)]" />}
                        <p className="text-sm font-bold elite-title truncate">{line.name}</p>
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest elite-subtle mt-0.5">{line.type}</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold uppercase elite-subtle">Qty</label>
                        <Input
                          type="number"
                          min={1}
                          className="h-8 w-16 text-center text-xs font-bold"
                          value={line.quantity}
                          onChange={(e) => updateLine(line.id, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold uppercase elite-subtle">Price</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 text-[10px] elite-subtle">$</span>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            className="h-8 w-24 pl-5 text-right text-xs font-bold"
                            value={line.unit_price}
                            onChange={(e) => updateLine(line.id, { unit_price: Math.max(0, Number(e.target.value) || 0) })}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold uppercase elite-subtle">Total</label>
                        <div className="h-8 flex items-center px-2 bg-[var(--elite-surface)] rounded-md border border-[var(--elite-border)] text-xs font-bold elite-title">
                          ${(line.quantity * line.unit_price).toFixed(2)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        className="mt-5 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {lines.length > 0 && (
            <div className="p-4 bg-[var(--elite-surface)]/50 border-t border-[var(--elite-border)] flex flex-col gap-3">
              {eligiblePackages.length > 0 && (
                <div className="p-3 bg-gradient-to-r from-[var(--elite-orange-dim)] to-transparent border border-[var(--elite-orange)]/30 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2">
                    <Package className="size-4 text-[var(--elite-orange)]" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[var(--elite-orange)] uppercase tracking-wide">Active Package Found</span>
                      <span className="text-[10px] text-muted-foreground font-medium">Use a package session for this service.</span>
                    </div>
                  </div>
                  <select
                    className="elite-input bg-white/50 dark:bg-black/20 h-8 rounded-lg text-xs font-medium border-[var(--elite-orange)]/30 w-48"
                    value={redeemPackageId ? `${redeemType}-${redeemPackageId}` : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setRedeemPackageId('');
                        setRedeemType('package');
                      } else {
                        const [type, id] = val.split('-');
                        setRedeemPackageId(id);
                        setRedeemType(type as 'membership' | 'package');
                      }
                    }}
                  >
                    <option value="">Do not redeem</option>
                    {eligiblePackages.map(p => {
                      let displayBalance = p.remaining_services;
                      
                      // For memberships with granular balances, find the most relevant count
                      if (p.type === 'membership' && p.covered_services?.length > 0) {
                        // Try to match with a service currently in the cart
                        const cartServiceIds = lines.filter(l => l.service_id).map(l => String(l.service_id));
                        const matchingService = p.covered_services.find((s: any) => cartServiceIds.includes(String(s.id)));
                        
                        if (matchingService) {
                          displayBalance = matchingService.remaining_sessions;
                        } else if (displayBalance === 0) {
                          // Fallback: show sum of all granular balances
                          displayBalance = p.covered_services.reduce((acc: number, s: any) => acc + (s.remaining_sessions || 0), 0);
                        }
                      }

                      return (
                        <option key={`${p.type}-${p.id}`} value={`${p.type}-${p.id}`}>
                          {p.type === 'membership' ? '[Mem] ' : '[Pkg] '}
                          {p.name} ({displayBalance} left)
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold elite-subtle uppercase tracking-wider">Subtotal Items</p>
                <p className="text-sm font-black elite-title">${subtotal.toFixed(2)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-1 space-y-4">
        {/* Summary & Adjustments */}
        <div className="rounded-2xl border border-[var(--elite-border)] bg-[var(--elite-card)] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[var(--elite-border)] bg-[var(--elite-surface)]/50 flex items-center gap-2">
            <Tags className="size-4 text-[var(--elite-orange)]" />
            <h2 className="text-[11px] font-bold uppercase tracking-wider elite-title">Adjustments</h2>
          </div>
          <div className="p-5 space-y-5">
            {/* Discount Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wide elite-subtle">Discount</label>
                {discountAmount > 0 && <span className="text-[10px] font-bold text-[var(--elite-green)]">-${discountAmount.toFixed(2)}</span>}
              </div>
              <Input
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                placeholder="Promo code..."
                className="h-9 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as "flat" | "percent")}
                  className="elite-input rounded-lg px-3 h-9 text-xs font-medium"
                >
                  <option value="flat">Fixed $</option>
                  <option value="percent">Percent %</option>
                </select>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Math.max(0, Number(e.target.value) || 0))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="h-px bg-[var(--elite-border)]" />

            {/* Tip Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wide elite-subtle">Gratuity / Tips</label>
                {tipsAmount > 0 && <span className="text-[10px] font-bold text-[var(--elite-teal)]">+${tipsAmount.toFixed(2)}</span>}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-xs elite-subtle">$</span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={tipsAmount}
                    onChange={(e) => setTipsAmount(Math.max(0, Number(e.target.value) || 0))}
                    className="pl-7 h-9 text-xs font-bold"
                  />
                </div>
                <select
                  value={tipMode}
                  onChange={(e) => setTipMode(e.target.value as TipMode)}
                  className="w-32 elite-input rounded-lg px-3 h-9 text-[10px] font-bold uppercase tracking-tight"
                >
                  <option value="single">Single</option>
                  <option value="equal_split">Split</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              
              <div className="space-y-2">
                {tipRows.map((row) => (
                  <div key={row.id} className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                    <select
                      value={row.staff_id}
                      onChange={(e) => setTipRows((prev) => prev.map((x) => x.id === row.id ? { ...x, staff_id: e.target.value } : x))}
                      className="flex-1 elite-input rounded-lg px-3 h-8 text-xs font-medium"
                    >
                      <option value="">Choose staff...</option>
                      {staff.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                    </select>
                    {tipMode === "custom" && (
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="w-16 h-8 text-xs px-2"
                        value={row.amount}
                        onChange={(e) => setTipRows((prev) => prev.map((x) => x.id === row.id ? { ...x, amount: Math.max(0, Number(e.target.value) || 0) } : x))}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setTipRows((prev) => prev.length > 1 ? prev.filter((x) => x.id !== row.id) : prev)}
                      className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-[var(--elite-border)]" />

            {/* Gift Card Section */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-wide elite-subtle">Redeem Gift Card</label>
              <div className="flex gap-2">
                <Input
                  value={giftCardCode}
                  onChange={(e) => setGiftCardCode(e.target.value)}
                  placeholder="Enter code..."
                  className="h-9 text-xs font-mono uppercase"
                />
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline" 
                  onClick={handleApplyGiftCard}
                  disabled={verifyingGC || !giftCardCode.trim()}
                  className="h-9 rounded-lg border-[var(--elite-orange)] text-[var(--elite-orange)] hover:bg-[var(--elite-orange-dim)]"
                >
                  {verifyingGC ? "..." : "Apply"}
                </Button>
              </div>
            </div>
          </div>

          {/* Grand Total Area */}
          <div className="p-5 bg-[var(--elite-surface)] border-t border-[var(--elite-border)] space-y-3">
            {applyVat && (
              <div className="flex items-center justify-between text-xs font-bold elite-subtle uppercase tracking-wider">
                <span>VAT ({vatRate}%)</span>
                <span className="elite-title">${vatAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold elite-subtle uppercase tracking-widest">Grand Total</span>
              <span className="text-3xl font-black tracking-tighter text-[var(--elite-orange)]">${grandTotal.toFixed(2)}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-[var(--elite-card)] border border-[var(--elite-border)] flex flex-col items-center justify-center gap-1 shadow-sm">
                <span className="text-[9px] font-black uppercase tracking-widest elite-subtle">Paid</span>
                <span className="text-sm font-bold elite-title">${paid.toFixed(2)}</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--elite-card)] border border-[var(--elite-border)] flex flex-col items-center justify-center gap-1 shadow-sm">
                <span className="text-[9px] font-black uppercase tracking-widest elite-subtle">Balance</span>
                <span className={`text-sm font-bold ${remaining > 0 ? 'text-[var(--elite-red)]' : 'text-[var(--elite-green)]'}`}>
                  ${remaining.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Processing Section */}
        <div className="rounded-2xl border border-[var(--elite-border)] bg-[var(--elite-card)] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[var(--elite-border)] bg-[var(--elite-surface)]/50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CreditCard className="size-4 text-[var(--elite-orange)]" />
              <h2 className="text-[11px] font-bold uppercase tracking-wider elite-title">Payment Methods</h2>
            </div>
            <button
              type="button"
              onClick={addPaymentRow}
              className="p-1.5 rounded-lg text-[var(--elite-orange)] hover:bg-[var(--elite-orange-dim)] transition-all"
            >
              <Plus className="size-4" />
            </button>
          </div>
          
          <div className="p-5 space-y-4">
            <div className="space-y-3">
              {payments.map((p) => (
                <div key={p.id} className="space-y-2 p-3 rounded-xl bg-[var(--elite-surface)]/50 border border-[var(--elite-border)] relative animate-in slide-in-from-right-2 duration-300">
                  <div className="flex items-center gap-2">
                    <select
                      value={p.method}
                      onChange={(e) => updatePayment(p.id, { method: e.target.value })}
                      className="flex-1 elite-input rounded-lg h-9 px-3 text-xs font-bold uppercase tracking-wide"
                    >
                      {paymentMethods.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <div className="relative w-32">
                      <span className="absolute left-3 top-2.5 text-xs elite-subtle">$</span>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="pl-7 h-9 text-xs font-black"
                        value={p.amount}
                        onChange={(e) => updatePayment(p.id, { amount: Number(e.target.value) || 0 })}
                      />
                    </div>
                    {payments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePaymentRow(p.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 transition-all"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                  <Input
                    placeholder={p.method === 'gift_card' ? "Gift Card Code" : "Reference / Auth code (optional)"}
                    className="h-8 text-[10px]"
                    value={p.reference ?? ""}
                    onChange={(e) => updatePayment(p.id, { reference: e.target.value })}
                  />
                </div>
              ))}
            </div>

            {changeDue > 0 && (
              <div className="p-3 rounded-xl bg-[var(--elite-green-dim)] border border-[var(--elite-green)]/30 flex items-center justify-between animate-bounce">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--elite-green)]">Change Due</span>
                <span className="text-lg font-black text-[var(--elite-green)]">${changeDue.toFixed(2)}</span>
              </div>
            )}

            <Button
              disabled={submitting || !locationId || !clientId || lines.length === 0}
              onClick={handleSubmit}
              className="w-full h-12 rounded-xl text-sm font-black uppercase tracking-widest bg-[var(--elite-orange)] hover:brightness-110 text-white shadow-xl shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-30"
            >
              {submitting ? "Processing..." : "Complete Sale"}
            </Button>
            
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--elite-surface)] text-[10px] elite-subtle">
              <Info className="size-3 shrink-0" />
              <p>Total items: {lines.reduce((s, l) => s + l.quantity, 0)}. Partial payments will automatically generate client debt.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
