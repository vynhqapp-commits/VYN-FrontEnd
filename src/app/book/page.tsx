"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Clock, MapPin, ChevronRight, CalendarCheck, UserCircle, Search, ChevronLeft } from "lucide-react";
import {
  publicApi,
  type Tenant,
  type Location,
  type Service,
  type PublicAppointment,
  type PaginationMeta,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Spinner, ErrorBox } from "@/components/ui";
import PublicHeader from "@/components/layout/PublicHeader";

type Slot = { start: string; end: string; staff_id: string };

type SalonDetail = {
  salon: Tenant & { slug: string };
  branches: Location[];
  services: Service[];
};

type Selected = {
  branchId: string;
  serviceId: string;
  date: string;
  slot: Slot;
};

const STEPS = ["Choose salon", "Pick service", "Date & time", "Your details"];

// ── Step bar ─────────────────────────────────────────────────────────────────

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center mb-10">
      {STEPS.map((label, i) => {
        const idx = i + 1;
        const done = idx < step;
        const active = idx === step;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold
                  transition-all duration-300
                  ${done
                    ? "bg-salon-gold text-white shadow-sm shadow-salon-gold/40"
                    : active
                      ? "bg-white border-2 border-salon-gold text-salon-gold shadow-sm"
                      : "bg-white border border-gray-200 text-gray-400"
                  }`}
              >
                {done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : idx}
              </div>
              <span
                className={`text-[10px] font-medium hidden sm:block transition-colors duration-200
                  ${active ? "text-salon-espresso" : done ? "text-salon-gold" : "text-gray-400"}`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px mx-2 mb-5 transition-colors duration-500
                  ${done ? "bg-salon-gold" : "bg-gray-200"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BookPage() {
  const { user } = useAuth();

  const [step, setStep] = useState(1);

  const [salons, setSalons] = useState<Tenant[]>([]);
  const [search, setSearch] = useState("");
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [detail, setDetail] = useState<SalonDetail | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [form, setForm] = useState({
    client_name: "",
    client_phone: "",
    client_email: "",
  });
  const [confirmed, setConfirmed] = useState<PublicAppointment | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [branchId, setBranchId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");

  // Pre-fill form from auth context when user is logged in
  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        client_name: f.client_name || user.fullName || user.name || "",
        client_email: f.client_email || user.email || "",
      }));
    }
  }, [user]);

  const fetchSalons = (q: string, p: number) => {
    setLoading(true);
    publicApi
      .salons({ search: q || undefined, page: p, per_page: 12 })
      .then((res) => {
        setLoading(false);
        if ("error" in res) { setError(res.error ?? null); return; }
        setSalons(res.data?.salons ?? []);
        setMeta(res.meta ?? null);
      });
  };

  useEffect(() => { fetchSalons("", 1); }, []);

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSalons(val, 1), 400);
  };

  const goToPage = (p: number) => { setPage(p); fetchSalons(search, p); };

  const pickSalon = (slug: string) => {
    setError(null);
    setLoadingDetail(true);
    setDetail(null);
    setBranchId("");
    setServiceId("");
    setDate("");
    setSlots([]);
    setSelected(null);
    setStep(2);
    publicApi.salon(slug).then(({ data, error: err }) => {
      setLoadingDetail(false);
      if (err) { setError(err); setStep(1); }
      else if (data) setDetail(data as SalonDetail);
    });
  };

  const fetchSlots = (bId: string, sId: string, d: string) => {
    if (!bId || !sId || !d) return;
    setLoadingSlots(true);
    setSlots([]);
    publicApi.availability(bId, sId, d).then(({ data }) => {
      setLoadingSlots(false);
      if (data?.slots) {
        const buffer = new Date(Date.now() + 30 * 60 * 1000);
        const future = (data.slots as Slot[]).filter(
          (slot) => localDate(slot.start) > buffer,
        );
        setSlots(future);
      }
    });
  };

  const pickSlot = (slot: Slot) => {
    setSelected({ branchId, serviceId, date, slot });
    setStep(4);
  };

  const submitBook = async () => {
    if (!selected || !detail) return;
    setError(null);
    setSubmitting(true);
    const { data, error: err } = await publicApi.book({
      tenant_id: detail.salon.id,
      branch_id: selected.branchId,
      service_id: selected.serviceId,
      staff_id: selected.slot.staff_id,
      start_at: selected.slot.start,
      client_name: form.client_name,
      client_phone: form.client_phone || undefined,
      client_email: form.client_email || undefined,
    });
    setSubmitting(false);
    if (err) { setError(err); return; }
    if (data?.appointment) { setConfirmed(data.appointment); setStep(5); }
  };

  const selectedBranch = detail?.branches.find((b) => b.id === branchId);
  const selectedService = detail?.services.find((s) => s.id === serviceId);

  // ── Step 5: Confirmation ─────────────────────────────────────────────────
  if (step === 5 && confirmed) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F9FAFB]">
        <PublicHeader />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center animate-fade-in-up">
            <div className="w-16 h-16 rounded-full bg-salon-gold/10 flex items-center justify-center mx-auto mb-5">
              <Check className="w-7 h-7 text-salon-gold" strokeWidth={2.5} />
            </div>
            <h1 className="font-display text-2xl font-semibold text-salon-espresso mb-1">
              You&apos;re all set!
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              Your appointment is confirmed. See you soon.
            </p>

            <div className="bg-[#F9FAFB] rounded-xl p-4 text-left space-y-2.5 mb-6 text-sm">
              <SummaryRow label="Service" value={confirmed.service.name} />
              <SummaryRow label="Location" value={confirmed.branch.name} />
              {confirmed.branch.address && (
                <SummaryRow label="Address" value={confirmed.branch.address} />
              )}
              <SummaryRow label="Staff" value={confirmed.staff.name} />
              <SummaryRow
                label="Date"
                value={localDate(confirmed.starts_at).toLocaleDateString(undefined, {
                  weekday: "long", month: "long", day: "numeric", year: "numeric",
                })}
              />
              <SummaryRow
                label="Time"
                value={`${fmt(confirmed.starts_at)} – ${fmt(confirmed.ends_at)}`}
              />
              <SummaryRow label="Duration" value={`${confirmed.service.duration_minutes} min`} />
              <SummaryRow label="Price" value={`$${Number(confirmed.service.price).toFixed(2)}`} />
            </div>

            <div className="space-y-3">
              <div className="flex gap-3">
                <Link
                  href="/"
                  className="flex-1 py-3 border border-gray-200 text-salon-espresso rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors text-center"
                >
                  Home
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1); setConfirmed(null); setDetail(null);
                    setForm({ client_name: user?.fullName ?? user?.name ?? "", client_phone: "", client_email: user?.email ?? "" });
                  }}
                  className="flex-1 py-3 bg-salon-gold text-white rounded-xl font-semibold text-sm hover:bg-salon-goldLight transition-colors"
                >
                  Book again
                </button>
              </div>

              {/* Post-booking navigation */}
              {user?.role === "customer" ? (
                <Link
                  href="/my-bookings"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-salon-espresso text-white rounded-xl font-semibold text-sm hover:bg-salon-bark transition-colors"
                >
                  <CalendarCheck className="w-4 h-4" />
                  View my appointments
                </Link>
              ) : (
                <Link
                  href="/register"
                  className="flex items-center justify-center gap-2 w-full py-3 border border-salon-gold/60 text-salon-gold rounded-xl font-medium text-sm hover:bg-salon-gold/5 transition-colors"
                >
                  <UserCircle className="w-4 h-4" />
                  Create account to track bookings
                </Link>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB]">
      <PublicHeader />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <StepBar step={step} />

        {/* ── Step 1: Choose salon ── */}
        {step === 1 && (
          <section className="animate-fade-in-up">
            <h1 className="font-display text-3xl font-semibold text-salon-espresso mb-1">
              Book a salon
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              Choose a salon to see services and availability.
            </p>

            <div className="relative mb-6">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="search"
                placeholder="Search salons…"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-salon-espresso placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-salon-gold/40 focus:border-salon-gold shadow-sm transition-shadow"
              />
            </div>

            {error && <ErrorBox message={error} />}

            {loading ? (
              <div className="flex justify-center py-16"><Spinner size="lg" /></div>
            ) : salons.length === 0 ? (
              <p className="text-gray-400 text-center py-12">
                {search ? "No salons match your search." : "No salons available yet."}
              </p>
            ) : (
              <>
                <ul className="space-y-3">
                  {salons.map((s, i) => (
                    <li
                      key={s.id}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}
                    >
                      <button
                        type="button"
                        onClick={() => pickSalon((s as Tenant & { slug: string }).slug)}
                        className="w-full text-left p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-salon-gold/50 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-salon-espresso group-hover:text-salon-gold transition-colors">
                              {s.name}
                            </p>
                            {s.address && (
                              <p className="flex items-center gap-1 text-gray-400 text-xs mt-1">
                                <MapPin className="w-3 h-3" />
                                {s.address}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-salon-gold transition-colors shrink-0" />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>

                {meta && meta.last_page > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                    <p className="text-gray-400 text-sm">{meta.from}–{meta.to} of {meta.total}</p>
                    <div className="flex gap-2">
                      <PagerBtn disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                        <ChevronLeft className="w-4 h-4 inline-block" /> Prev
                      </PagerBtn>
                      <span className="px-3 py-2 text-sm text-gray-500">{page} / {meta.last_page}</span>
                      <PagerBtn disabled={page >= meta.last_page} onClick={() => goToPage(page + 1)}>
                        Next <ChevronRight className="w-4 h-4 inline-block" />
                      </PagerBtn>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* ── Step 2: Branch + Service ── */}
        {step === 2 && (
          <section className="animate-fade-in-up">
            <BackBtn onClick={() => { setStep(1); setDetail(null); setError(null); }} />

            {loadingDetail ? (
              <div className="flex justify-center py-16"><Spinner size="lg" /></div>
            ) : detail ? (
              <>
                <h1 className="font-display text-3xl font-semibold text-salon-espresso mb-1">
                  {detail.salon.name}
                </h1>
                <p className="text-gray-500 text-sm mb-6">Choose a location and service.</p>
                {error && <div className="mb-4"><ErrorBox message={error} /></div>}

                <div className="space-y-8">
                  {/* Location */}
                  <div>
                    <SectionLabel>Location</SectionLabel>
                    <div className="space-y-3">
                      {detail.branches.map((b, i) => (
                        <SelectCard
                          key={b.id}
                          active={branchId === b.id}
                          onClick={() => setBranchId(b.id)}
                          delay={i * 50}
                        >
                          <div className="flex-1">
                            <p className="font-semibold text-salon-espresso text-sm">{b.name}</p>
                            {b.address && (
                              <p className="flex items-center gap-1 text-gray-400 text-xs mt-0.5">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {b.address}
                              </p>
                            )}
                          </div>
                        </SelectCard>
                      ))}
                    </div>
                  </div>

                  {/* Service */}
                  <div>
                    <SectionLabel>Service</SectionLabel>
                    <div className="space-y-3">
                      {detail.services.map((s, i) => (
                        <SelectCard
                          key={s.id}
                          active={serviceId === s.id}
                          onClick={() => setServiceId(s.id)}
                          delay={i * 40}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-salon-espresso text-sm truncate">{s.name}</p>
                            <p className="flex items-center gap-1 text-gray-400 text-xs mt-0.5">
                              <Clock className="w-3 h-3 shrink-0" />
                              {s.duration_minutes} min
                              {s.description ? ` · ${s.description}` : ""}
                            </p>
                          </div>
                          <p className={`text-base font-bold shrink-0 transition-colors ${serviceId === s.id ? "text-salon-gold" : "text-salon-espresso"}`}>
                            ${Number(s.price).toFixed(2)}
                          </p>
                        </SelectCard>
                      ))}
                    </div>
                  </div>

                  <PrimaryBtn disabled={!branchId || !serviceId} onClick={() => setStep(3)}>
                    <span className="flex items-center justify-center gap-2">
                      Choose date &amp; time <ChevronRight className="w-4 h-4" />
                    </span>
                  </PrimaryBtn>
                </div>
              </>
            ) : null}
          </section>
        )}

        {/* ── Step 3: Date + Slots ── */}
        {step === 3 && detail && (
          <section className="animate-fade-in-up">
            <BackBtn onClick={() => setStep(2)} />
            <h1 className="font-display text-3xl font-semibold text-salon-espresso mb-1">
              Pick a time
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              {selectedService?.name} · {selectedBranch?.name}
            </p>

            <div className="mb-6">
              <SectionLabel>Date</SectionLabel>
              <input
                type="date"
                value={date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => { setDate(e.target.value); fetchSlots(branchId, serviceId, e.target.value); }}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-salon-espresso shadow-sm focus:outline-none focus:ring-2 focus:ring-salon-gold/40 focus:border-salon-gold transition-shadow"
              />
            </div>

            {date && (
              <div className="animate-fade-in-up">
                <SectionLabel>Available times</SectionLabel>
                {loadingSlots ? (
                  <div className="flex justify-center py-8"><Spinner /></div>
                ) : slots.length === 0 ? (
                  <p className="text-gray-400 text-sm py-4">
                    No slots available on this date. Try another day.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {slots.map((slot, i) => (
                      <button
                        key={slot.start}
                        type="button"
                        onClick={() => pickSlot(slot)}
                        className="py-3 rounded-xl border border-gray-200 bg-white text-salon-espresso text-sm font-medium
                          hover:border-salon-gold hover:bg-salon-gold/5 hover:shadow-sm
                          transition-all duration-150 animate-fade-in-up"
                        style={{ animationDelay: `${i * 30}ms`, animationFillMode: "both" }}
                      >
                        {fmt(slot.start)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ── Step 4: Guest details ── */}
        {step === 4 && selected && detail && (
          <section className="animate-fade-in-up">
            <BackBtn onClick={() => setStep(3)} />
            <h1 className="font-display text-3xl font-semibold text-salon-espresso mb-1">
              Your details
            </h1>
            <p className="text-gray-500 text-sm mb-6">Almost done — just tell us who you are.</p>

            {error && <div className="mb-4"><ErrorBox message={error} /></div>}

            {/* Summary card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 space-y-2 text-sm">
              <SummaryRow label="Service" value={selectedService?.name ?? "—"} />
              <SummaryRow label="Location" value={selectedBranch?.name ?? "—"} />
              <SummaryRow
                label="Date"
                value={localDate(selected.slot.start).toLocaleDateString(undefined, {
                  weekday: "long", month: "short", day: "numeric",
                })}
              />
              <SummaryRow
                label="Time"
                value={`${fmt(selected.slot.start)} – ${fmt(selected.slot.end)}`}
              />
              <SummaryRow
                label="Price"
                value={`$${Number(selectedService?.price ?? 0).toFixed(2)}`}
              />
            </div>

            {/* When logged in: show read-only identity card + editable phone */}
            {user ? (
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3 p-4 bg-salon-gold/5 border border-salon-gold/30 rounded-xl">
                  <div className="w-9 h-9 rounded-full bg-salon-gold/20 flex items-center justify-center shrink-0">
                    <UserCircle className="w-5 h-5 text-salon-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-salon-espresso truncate">
                      {form.client_name || user.fullName || user.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                  <span className="text-xs bg-salon-gold/15 text-salon-gold px-2 py-0.5 rounded-full font-medium shrink-0">
                    Logged in
                  </span>
                </div>
                <Field
                  label="Phone (optional)"
                  type="tel"
                  placeholder="Add a phone number"
                  value={form.client_phone}
                  onChange={(v) => setForm((f) => ({ ...f, client_phone: v }))}
                />
              </div>
            ) : (
              /* Guest: show full form */
              <div className="space-y-4 mb-6">
                <Field
                  label="Full name *"
                  type="text"
                  placeholder="Your name"
                  value={form.client_name}
                  onChange={(v) => setForm((f) => ({ ...f, client_name: v }))}
                  required
                />
                <Field
                  label="Phone"
                  type="tel"
                  placeholder="Optional"
                  value={form.client_phone}
                  onChange={(v) => setForm((f) => ({ ...f, client_phone: v }))}
                />
                <Field
                  label="Email"
                  type="email"
                  placeholder="Optional — for confirmation"
                  value={form.client_email}
                  onChange={(v) => setForm((f) => ({ ...f, client_email: v }))}
                />
                <p className="text-xs text-gray-400">
                  Already have an account?{" "}
                  <Link href="/login" className="text-salon-gold hover:underline font-medium">
                    Log in
                  </Link>{" "}
                  to skip this step next time.
                </p>
              </div>
            )}

            <PrimaryBtn
              disabled={(!user && !form.client_name.trim()) || submitting}
              onClick={submitBook}
            >
              {submitting
                ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" /> Confirming…</span>
                : "Confirm booking"}
            </PrimaryBtn>
          </section>
        )}
      </main>
    </div>
  );
}

// ── Reusable components ───────────────────────────────────────────────────────

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-gray-400 text-sm font-medium hover:text-salon-espresso mb-6 transition-colors"
    >
      <ChevronLeft className="w-4 h-4" />
      Back
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
      {children}
    </p>
  );
}

function SelectCard({
  children,
  active,
  onClick,
  delay = 0,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  delay?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left
        transition-all duration-200 shadow-sm animate-fade-in-up
        ${active
          ? "border-salon-gold bg-salon-gold/5 shadow-sm shadow-salon-gold/20"
          : "border-gray-100 bg-white hover:border-salon-gold/40 hover:shadow-md"
        }`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      {children}
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-200
          ${active ? "bg-salon-gold opacity-100 scale-100" : "opacity-0 scale-75"}`}
      >
        <Check className="w-3 h-3 text-white" strokeWidth={3} />
      </div>
    </button>
  );
}

function PrimaryBtn({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full py-4 bg-salon-gold text-white rounded-xl font-semibold text-sm
        hover:bg-salon-goldLight disabled:opacity-40 disabled:cursor-not-allowed
        transition-colors shadow-sm"
    >
      {children}
    </button>
  );
}

function PagerBtn({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="px-4 py-2 text-sm rounded-xl border border-gray-200 bg-white text-salon-espresso
        hover:border-salon-gold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-400">{label}</span>
      <span className="text-salon-espresso font-medium text-right">{value}</span>
    </div>
  );
}

function Field({
  label, type, placeholder, value, onChange, required,
}: {
  label: string; type: string; placeholder: string;
  value: string; onChange: (v: string) => void; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-salon-espresso
          placeholder-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-salon-gold/40
          focus:border-salon-gold transition-shadow"
      />
    </div>
  );
}

// ── Time helpers ──────────────────────────────────────────────────────────────

/**
 * Display a time string as the salon's local time.
 * Strips the UTC "Z" marker so the browser does not apply a timezone offset —
 * the DB times are naive (no TZ), meant to represent the salon's clock.
 */
function fmt(iso: string) {
  const local = iso.replace(/Z$/, "");
  return new Date(local).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Parse a potentially UTC-marked ISO string as naive local time. */
function localDate(iso: string): Date {
  return new Date(iso.replace(/Z$/, ""));
}
