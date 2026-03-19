"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  publicApi,
  type Tenant,
  type Location,
  type Service,
  type PublicAppointment,
  type PaginationMeta,
} from "@/lib/api";
import { APP_NAME } from "@/lib/app-name";
import { Spinner, ErrorBox } from "@/components/ui";

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

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const idx = i + 1;
        const done = idx < step;
        const active = idx === step;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors
                  ${done ? "bg-salon-gold border-salon-gold text-white" : active ? "bg-white border-salon-gold text-salon-gold" : "bg-white border-salon-sand/60 text-salon-stone"}`}
              >
                {done ? "✓" : idx}
              </div>
              <span
                className={`mt-1 text-[10px] font-medium hidden sm:block ${active ? "text-salon-espresso" : "text-salon-stone"}`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px mx-1 mb-4 ${done ? "bg-salon-gold" : "bg-salon-sand/60"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function BookPage() {
  const [step, setStep] = useState(1);

  // Step 1 — salon list with backend search + pagination
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

  // Step 2 local state
  const [branchId, setBranchId] = useState("");
  const [serviceId, setServiceId] = useState("");
  // Step 3 local state
  const [date, setDate] = useState("");

  const fetchSalons = (q: string, p: number) => {
    setLoading(true);
    publicApi
      .salons({ search: q || undefined, page: p, per_page: 12 })
      .then((res) => {
        setLoading(false);
        if ("error" in res) {
          setError(res.error ?? null);
          return;
        }
        setSalons(res.data?.salons ?? []);
        setMeta(res.meta ?? null);
      });
  };

  // Initial load
  useEffect(() => {
    fetchSalons("", 1);
  }, []);

  // Debounced search — resets to page 1
  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSalons(val, 1), 400);
  };

  const goToPage = (p: number) => {
    setPage(p);
    fetchSalons(search, p);
  };

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
      if (err) {
        setError(err);
        setStep(1);
      } else if (data) setDetail(data as SalonDetail);
    });
  };

  const fetchSlots = (bId: string, sId: string, d: string) => {
    if (!bId || !sId || !d) return;
    setLoadingSlots(true);
    setSlots([]);
    publicApi.availability(bId, sId, d).then(({ data }) => {
      setLoadingSlots(false);
      if (data?.slots) {
        const buffer = new Date(Date.now() + 30 * 60 * 1000); // 30 min buffer
        const future = (data.slots as Slot[]).filter(
          (slot) => new Date(slot.start) > buffer,
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
    if (err) {
      setError(err);
      return;
    }
    if (data?.appointment) {
      setConfirmed(data.appointment);
      setStep(5);
    }
  };

  const selectedBranch = detail?.branches.find((b) => b.id === branchId);
  const selectedService = detail?.services.find((s) => s.id === serviceId);

  // ── Step 5: Confirmation ──────────────────────────────────────────────────
  if (step === 5 && confirmed) {
    return (
      <div className="min-h-screen flex flex-col bg-salon-cream">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-salon-sand/40 p-8 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-salon-sage/20 flex items-center justify-center mx-auto mb-5">
              <span className="text-3xl">✓</span>
            </div>
            <h1 className="font-display text-2xl font-semibold text-salon-espresso mb-1">
              You're all set!
            </h1>
            <p className="text-salon-stone text-sm mb-6">
              Your appointment is confirmed. See you soon.
            </p>

            <div className="bg-salon-cream rounded-xl p-4 text-left space-y-2 mb-6 text-sm">
              <Row label="Service" value={confirmed.service.name} />
              <Row label="Location" value={confirmed.branch.name} />
              {confirmed.branch.address && (
                <Row label="Address" value={confirmed.branch.address} />
              )}
              <Row label="Staff" value={confirmed.staff.name} />
              <Row
                label="Date"
                value={new Date(confirmed.starts_at).toLocaleDateString(
                  undefined,
                  {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  },
                )}
              />
              <Row
                label="Time"
                value={`${fmt(confirmed.starts_at)} – ${fmt(confirmed.ends_at)}`}
              />
              <Row
                label="Duration"
                value={`${confirmed.service.duration_minutes} min`}
              />
              <Row
                label="Price"
                value={`$${Number(confirmed.service.price).toFixed(2)}`}
              />
            </div>

            <div className="flex gap-3">
              <Link
                href="/"
                className="flex-1 py-3 border border-salon-sand/60 text-salon-espresso rounded-xl font-medium text-sm hover:bg-salon-sand/30 transition-colors text-center"
              >
                Home
              </Link>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setConfirmed(null);
                  setDetail(null);
                  setForm({
                    client_name: "",
                    client_phone: "",
                    client_email: "",
                  });
                }}
                className="flex-1 py-3 bg-salon-gold text-white rounded-xl font-semibold text-sm hover:bg-salon-goldLight transition-colors"
              >
                Book again
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-salon-cream">
      <Header />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <StepBar step={step} />

        {step === 1 && (
          <section className="animate-fade-in">
            <h1 className="font-display text-3xl font-semibold text-salon-espresso mb-1">
              Book a salon
            </h1>
            <p className="text-salon-stone text-sm mb-6">
              Choose a salon to see services and availability.
            </p>

            <div className="relative mb-6">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-salon-stone text-sm">
                🔍
              </span>
              <input
                type="search"
                placeholder="Search salons…"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-salon-sand/60 rounded-xl text-salon-espresso placeholder-salon-stone/60 focus:outline-none focus:ring-2 focus:ring-salon-gold/40 focus:border-salon-gold"
              />
            </div>

            {error && <ErrorBox message={error} />}

            {loading ? (
              <div className="flex justify-center py-16">
                <Spinner size="lg" />
              </div>
            ) : salons.length === 0 ? (
              <p className="text-salon-stone text-center py-12">
                {search
                  ? "No salons match your search."
                  : "No salons available yet."}
              </p>
            ) : (
              <>
                <ul className="space-y-3">
                  {salons.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() =>
                          pickSalon((s as Tenant & { slug: string }).slug)
                        }
                        className="w-full text-left p-5 bg-white rounded-xl border border-salon-sand/40 hover:border-salon-gold/50 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-display text-lg font-semibold text-salon-espresso group-hover:text-salon-gold transition-colors">
                              {s.name}
                            </p>
                            {s.address && (
                              <p className="text-salon-stone text-sm mt-0.5">
                                {s.address}
                              </p>
                            )}
                            <div className="flex gap-3 mt-1.5">
                              {(s as Tenant & { branch_count?: number })
                                .branch_count != null && (
                                <span className="text-xs text-salon-stone">
                                  {
                                    (s as Tenant & { branch_count?: number })
                                      .branch_count
                                  }{" "}
                                  location
                                  {(s as Tenant & { branch_count?: number })
                                    .branch_count !== 1
                                    ? "s"
                                    : ""}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-salon-stone text-lg mt-0.5">
                            →
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>

                {/* Pagination */}
                {meta && meta.last_page > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-salon-sand/60">
                    <p className="text-salon-stone text-sm">
                      {meta.from}–{meta.to} of {meta.total} salons
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => goToPage(page - 1)}
                        className="px-4 py-2 text-sm rounded-xl border border-salon-sand/60 bg-white text-salon-espresso hover:border-salon-gold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        ← Prev
                      </button>
                      <span className="px-4 py-2 text-sm text-salon-stone">
                        {page} / {meta.last_page}
                      </span>
                      <button
                        type="button"
                        disabled={page >= meta.last_page}
                        onClick={() => goToPage(page + 1)}
                        className="px-4 py-2 text-sm rounded-xl border border-salon-sand/60 bg-white text-salon-espresso hover:border-salon-gold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* ── Step 2: Branch + Service ── */}
        {step === 2 && (
          <section className="animate-fade-in">
            <BackBtn
              onClick={() => {
                setStep(1);
                setDetail(null);
                setError(null);
              }}
            />
            {loadingDetail ? (
              <div className="flex justify-center py-16">
                <Spinner size="lg" />
              </div>
            ) : detail ? (
              <>
                <h1 className="font-display text-3xl font-semibold text-salon-espresso mb-1">
                  {detail.salon.name}
                </h1>
                <p className="text-salon-stone text-sm mb-6">
                  Choose a location and service.
                </p>
                {error && (
                  <div className="mb-4">
                    <ErrorBox message={error} />
                  </div>
                )}

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-salon-espresso mb-2">
                      Location
                    </label>
                    <div className="grid gap-2">
                      {detail.branches.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setBranchId(b.id)}
                          className={`w-full text-left p-4 rounded-xl border transition-all ${branchId === b.id ? "border-salon-gold bg-salon-gold/5" : "border-salon-sand/60 bg-white hover:border-salon-gold/40"}`}
                        >
                          <p className="font-medium text-salon-espresso text-sm">
                            {b.name}
                          </p>
                          {b.address && (
                            <p className="text-salon-stone text-xs mt-0.5">
                              {b.address}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-salon-espresso mb-2">
                      Service
                    </label>
                    <div className="grid gap-2">
                      {detail.services.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setServiceId(s.id)}
                          className={`w-full text-left p-4 rounded-xl border transition-all ${serviceId === s.id ? "border-salon-gold bg-salon-gold/5" : "border-salon-sand/60 bg-white hover:border-salon-gold/40"}`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-salon-espresso text-sm">
                              {s.name}
                            </p>
                            <p className="text-salon-gold font-semibold text-sm">
                              ${Number(s.price).toFixed(2)}
                            </p>
                          </div>
                          <p className="text-salon-stone text-xs mt-0.5">
                            {s.duration_minutes} min
                            {s.description ? ` · ${s.description}` : ""}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!branchId || !serviceId}
                    onClick={() => setStep(3)}
                    className="w-full py-4 bg-salon-gold text-white rounded-xl font-semibold hover:bg-salon-goldLight disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Choose date & time →
                  </button>
                </div>
              </>
            ) : null}
          </section>
        )}

        {/* ── Step 3: Date + Slots ── */}
        {step === 3 && detail && (
          <section className="animate-fade-in">
            <BackBtn onClick={() => setStep(2)} />
            <h1 className="font-display text-3xl font-semibold text-salon-espresso mb-1">
              Pick a time
            </h1>
            <p className="text-salon-stone text-sm mb-6">
              {selectedService?.name} · {selectedBranch?.name}
            </p>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-salon-espresso mb-2">
                Date
              </label>
              <input
                type="date"
                value={date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => {
                  setDate(e.target.value);
                  fetchSlots(branchId, serviceId, e.target.value);
                }}
                className="w-full bg-white border border-salon-sand/60 rounded-xl px-4 py-3 text-salon-espresso focus:outline-none focus:ring-2 focus:ring-salon-gold/40 focus:border-salon-gold"
              />
            </div>

            {date && (
              <div>
                <label className="block text-sm font-semibold text-salon-espresso mb-3">
                  Available times
                </label>
                {loadingSlots ? (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-salon-stone text-sm py-4">
                    No slots available on this date. Try another day.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot.start}
                        type="button"
                        onClick={() => pickSlot(slot)}
                        className="py-3 rounded-xl border border-salon-sand/60 bg-white text-salon-espresso text-sm font-medium hover:border-salon-gold hover:bg-salon-gold/5 transition-colors"
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
          <section className="animate-fade-in">
            <BackBtn onClick={() => setStep(3)} />
            <h1 className="font-display text-3xl font-semibold text-salon-espresso mb-1">
              Your details
            </h1>
            <p className="text-salon-stone text-sm mb-6">
              Almost done — just tell us who you are.
            </p>

            {error && (
              <div className="mb-4">
                <ErrorBox message={error} />
              </div>
            )}

            {/* Summary card */}
            <div className="bg-white rounded-xl border border-salon-sand/40 p-4 mb-6 space-y-1 text-sm">
              <Row label="Service" value={selectedService?.name ?? "—"} />
              <Row label="Location" value={selectedBranch?.name ?? "—"} />
              <Row
                label="Date"
                value={new Date(selected.slot.start).toLocaleDateString(
                  undefined,
                  { weekday: "long", month: "short", day: "numeric" },
                )}
              />
              <Row
                label="Time"
                value={`${fmt(selected.slot.start)} – ${fmt(selected.slot.end)}`}
              />
              <Row
                label="Price"
                value={`$${Number(selectedService?.price ?? 0).toFixed(2)}`}
              />
            </div>

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
            </div>

            <button
              type="button"
              onClick={submitBook}
              disabled={!form.client_name.trim() || submitting}
              className="w-full py-4 bg-salon-gold text-white rounded-xl font-semibold hover:bg-salon-goldLight disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner size="sm" /> Confirming…
                </span>
              ) : (
                "Confirm booking"
              )}
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Header() {
  return (
    <header className="border-b border-salon-sand/60 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="font-display text-lg font-semibold text-salon-espresso hover:text-salon-bark transition-colors"
        >
          {APP_NAME}
        </Link>
        <Link
          href="/login"
          className="text-sm text-salon-stone hover:text-salon-espresso transition-colors"
        >
          Log in
        </Link>
      </div>
    </header>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-salon-stone text-sm font-medium hover:text-salon-espresso mb-6 transition-colors flex items-center gap-1"
    >
      ← Back
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-salon-stone">{label}</span>
      <span className="text-salon-espresso font-medium text-right">
        {value}
      </span>
    </div>
  );
}

function Field({
  label,
  type,
  placeholder,
  value,
  onChange,
  required,
}: {
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-salon-espresso mb-1.5">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full bg-white border border-salon-sand/60 rounded-xl px-4 py-3 text-salon-espresso placeholder-salon-stone/60 focus:outline-none focus:ring-2 focus:ring-salon-gold/40 focus:border-salon-gold"
      />
    </div>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
