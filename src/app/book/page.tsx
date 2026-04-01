"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { formatPublicCurrency, getPublicT, type PublicLocale } from "@/lib/i18n-public";
import { useLocale } from "@/components/LocaleProvider";
import { Spinner, ErrorBox } from "@/components/ui";
import PublicHeader from "@/components/layout/PublicHeader";

const LOCALE_BCP47: Record<PublicLocale, string> = {
  en: "en-US",
  ar: "ar-u-nu-latn",
  fr: "fr-FR",
};

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

type FilterState = {
  search: string;
  priceMin: string;
  priceMax: string;
  ratingMin: string;
  availability: string;
  genderPreference: string;
};

// ── Step bar ─────────────────────────────────────────────────────────────────
function StepBar({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div className="flex items-center mb-10">
      {labels.map((label, i) => {
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
            {i < labels.length - 1 && (
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
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { locale } = useLocale();
  const t = getPublicT(locale);

  const [step, setStep] = useState(1);

  const [salons, setSalons] = useState<Tenant[]>([]);
  const [search, setSearch] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [ratingMin, setRatingMin] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");
  const [genderPreference, setGenderPreference] = useState("");
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
  const [locating, setLocating] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [branchId, setBranchId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    search: "",
    priceMin: "",
    priceMax: "",
    ratingMin: "",
    availability: "",
    genderPreference: "",
  });
  const [prefillSalonId, setPrefillSalonId] = useState<string>("");
  const [prefillBranchId, setPrefillBranchId] = useState<string>("");
  const [prefillServiceId, setPrefillServiceId] = useState<string>("");

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

  const fetchSalons = (filters: FilterState, p: number) => {
    setLoading(true);
    publicApi
      .salons({
        search: filters.search || undefined,
        price_min: filters.priceMin !== "" ? Number(filters.priceMin) : undefined,
        price_max: filters.priceMax !== "" ? Number(filters.priceMax) : undefined,
        rating_min: filters.ratingMin !== "" ? Number(filters.ratingMin) : undefined,
        availability: filters.availability || undefined,
        gender_preference: (filters.genderPreference || undefined) as "ladies" | "gents" | "unisex" | undefined,
        page: p,
        per_page: 12,
      })
      .then((res) => {
        setLoading(false);
        if ("error" in res) { setError(res.error ?? null); return; }
        setSalons(res.data?.salons ?? []);
        setMeta(res.meta ?? null);
      });
  };

  const fetchNearbySalons = async () => {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const res = await publicApi.nearbySalons({
          lat: latitude,
          lng: longitude,
          radius_km: 15,
          page: 1,
          per_page: 12,
        });
        setLocating(false);
        if ("error" in res) { setError(res.error ?? null); return; }
        setSearch("");
        setAppliedFilters((prev) => ({ ...prev, search: "" }));
        setPage(1);
        setSalons(res.data?.salons ?? []);
        setMeta(res.meta ?? null);
      },
      (geoErr) => {
        setLocating(false);
        setError(geoErr.message || "Could not get your location.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  useEffect(() => {
    fetchSalons(appliedFilters, 1);
  }, []);

  useEffect(() => {
    const salonId = searchParams.get("salon_id") ?? "";
    const branchId = searchParams.get("branch_id") ?? "";
    const serviceId = searchParams.get("service_id") ?? "";
    setPrefillSalonId(salonId);
    setPrefillBranchId(branchId);
    setPrefillServiceId(serviceId);
  }, [searchParams]);

  const currentFilters: FilterState = {
    search,
    priceMin,
    priceMax,
    ratingMin,
    availability: availabilityFilter,
    genderPreference,
  };

  const hasPendingChanges =
    currentFilters.search !== appliedFilters.search ||
    currentFilters.priceMin !== appliedFilters.priceMin ||
    currentFilters.priceMax !== appliedFilters.priceMax ||
    currentFilters.ratingMin !== appliedFilters.ratingMin ||
    currentFilters.availability !== appliedFilters.availability ||
    currentFilters.genderPreference !== appliedFilters.genderPreference;

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const nextFilters = { ...currentFilters, search: val };
      setAppliedFilters(nextFilters);
      fetchSalons(nextFilters, 1);
    }, 400);
  };

  const goToPage = (p: number) => { setPage(p); fetchSalons(appliedFilters, p); };
  const applyFilters = () => {
    setPage(1);
    setAppliedFilters(currentFilters);
    fetchSalons(currentFilters, 1);
  };
  const resetFilters = () => {
    const reset: FilterState = {
      search: "",
      priceMin: "",
      priceMax: "",
      ratingMin: "",
      availability: "",
      genderPreference: "",
    };
    setPriceMin("");
    setPriceMax("");
    setRatingMin("");
    setAvailabilityFilter("");
    setGenderPreference("");
    setSearch("");
    setPage(1);
    setAppliedFilters(reset);
    fetchSalons(reset, 1);
  };

  const activeFilterChips = [
    priceMin || priceMax ? {
      key: "price",
      label: `Price: ${priceMin || "0"} - ${priceMax || "Any"}`,
      clear: () => { setPriceMin(""); setPriceMax(""); },
    } : null,
    ratingMin ? {
      key: "rating",
      label: `Rating >= ${ratingMin}`,
      clear: () => setRatingMin(""),
    } : null,
    availabilityFilter ? {
      key: "availability",
      label: `Availability: ${availabilityFilter}`,
      clear: () => setAvailabilityFilter(""),
    } : null,
    genderPreference ? {
      key: "gender",
      label: `Preference: ${genderPreference}`,
      clear: () => setGenderPreference(""),
    } : null,
  ].filter(Boolean) as Array<{ key: string; label: string; clear: () => void }>;

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

  useEffect(() => {
    if (step !== 1 || !prefillSalonId || salons.length === 0) return;
    const target = salons.find((s) => String(s.id) === String(prefillSalonId) && Boolean((s as Tenant & { slug?: string }).slug));
    if (!target) return;
    pickSalon((target as Tenant & { slug: string }).slug);
  }, [step, salons, prefillSalonId]);

  useEffect(() => {
    if (!detail) return;
    if (prefillBranchId && detail.branches.some((b) => String(b.id) === String(prefillBranchId))) {
      setBranchId(String(prefillBranchId));
    }
    if (prefillServiceId && detail.services.some((s) => String(s.id) === String(prefillServiceId))) {
      setServiceId(String(prefillServiceId));
    }
  }, [detail, prefillBranchId, prefillServiceId]);

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
      locale,
    });
    setSubmitting(false);
    if (err) { setError(err); return; }
    if (data?.appointment) { setConfirmed(data.appointment); setStep(5); }
  };

  const selectedBranch = detail?.branches.find((b) => String(b.id) === String(branchId));
  const selectedService = detail?.services.find((s) => String(s.id) === String(serviceId));

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
              {t("allSet")}
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              {t("appointmentConfirmed")}
            </p>

            <div className="bg-[#F9FAFB] rounded-xl p-4 text-start space-y-2.5 mb-6 text-sm">
              <SummaryRow label={t("summaryService")} value={confirmed.service.name} />
              <SummaryRow label={t("summaryLocation")} value={confirmed.branch.name} />
              {confirmed.branch.address && (
                <SummaryRow label={t("summaryAddress")} value={confirmed.branch.address} />
              )}
              <SummaryRow label={t("summaryStaff")} value={confirmed.staff.name} />
              <SummaryRow
                label={t("summaryDate")}
                value={localDate(confirmed.starts_at).toLocaleDateString(LOCALE_BCP47[locale], {
                  weekday: "long", month: "long", day: "numeric", year: "numeric",
                })}
              />
              <SummaryRow
                label={t("summaryTime")}
                value={`${fmt(confirmed.starts_at, LOCALE_BCP47[locale])} – ${fmt(confirmed.ends_at, LOCALE_BCP47[locale])}`}
              />
              <SummaryRow
                label={t("summaryDuration")}
                value={`${confirmed.service.duration_minutes} ${t("minutes")}`}
              />
              <SummaryRow
                label={t("summaryPrice")}
                value={formatPublicCurrency(
                  Number(confirmed.service.price),
                  detail?.salon.currency ?? "USD",
                  locale
                )}
              />
            </div>

            <div className="space-y-3">
              <div className="flex gap-3">
                <Link
                  href="/"
                  className="flex-1 py-3 border border-gray-200 text-salon-espresso rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors text-center"
                >
                  {t("home")}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1); setConfirmed(null); setDetail(null);
                    setForm({ client_name: user?.fullName ?? user?.name ?? "", client_phone: "", client_email: user?.email ?? "" });
                  }}
                  className="flex-1 py-3 bg-salon-gold text-white rounded-xl font-semibold text-sm hover:bg-salon-goldLight transition-colors"
                >
                  {t("bookAgain")}
                </button>
              </div>

              {/* Post-booking navigation */}
              {user?.role === "customer" ? (
                <Link
                  href="/my-bookings"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-salon-espresso text-white rounded-xl font-semibold text-sm hover:bg-salon-bark transition-colors"
                >
                  <CalendarCheck className="w-4 h-4" />
                  {t("viewAppointments")}
                </Link>
              ) : (
                <Link
                  href="/register"
                  className="flex items-center justify-center gap-2 w-full py-3 border border-salon-gold/60 text-salon-gold rounded-xl font-medium text-sm hover:bg-salon-gold/5 transition-colors"
                >
                  <UserCircle className="w-4 h-4" />
                  {t("createAccountToTrackBookings")}
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
        <StepBar
          step={step}
          labels={[t("chooseSalon"), t("pickService"), t("dateTime"), t("yourDetails")]}
        />

        {/* ── Step 1: Choose salon ── */}
        {step === 1 && (
          <section className="animate-fade-in-up">
            <h1 className="font-display text-3xl font-semibold text-salon-espresso mb-1">
              {t("step1Title")}
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              {t("step1Subtitle")}
            </p>

            <div className="mb-4 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  id="salon-search"
                  type="search"
                  placeholder={t("searchSalonsPlaceholder")}
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-salon-espresso placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-salon-gold/40 focus:border-salon-gold shadow-sm transition-shadow"
                />
              </div>
              <button
                type="button"
                onClick={fetchNearbySalons}
                disabled={locating || loading}
                className="shrink-0 px-4 py-3 bg-white border border-gray-200 rounded-xl text-salon-espresso text-sm font-medium
                  hover:border-salon-gold disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm whitespace-nowrap"
                title="Use my location"
              >
                {locating ? (
                  <span className="flex items-center gap-2"><Spinner size="sm" /> Locating...</span>
                ) : (
                  <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Use my location</span>
                )}
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-5 mb-6">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowFilters((prev) => !prev)}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-salon-espresso hover:text-salon-gold transition-colors"
                  aria-expanded={showFilters}
                  aria-controls="booking-filters-panel"
                >
                  Filters
                  <ChevronRight className={`w-4 h-4 transition-transform ${showFilters ? "rotate-90" : ""}`} />
                </button>
                <span className="text-xs text-gray-500">{activeFilterChips.length} active</span>
              </div>

              {showFilters && (
                <div id="booking-filters-panel" className="mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="price-min" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                        Min price
                      </label>
                      <input
                        id="price-min"
                        type="number"
                        min={0}
                        placeholder="0"
                        value={priceMin}
                        onChange={(e) => setPriceMin(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-salon-gold/40 focus:border-salon-gold"
                      />
                    </div>
                    <div>
                      <label htmlFor="price-max" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                        Max price
                      </label>
                      <input
                        id="price-max"
                        type="number"
                        min={0}
                        placeholder="Any"
                        value={priceMax}
                        onChange={(e) => setPriceMax(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-salon-gold/40 focus:border-salon-gold"
                      />
                    </div>
                    <div>
                      <label htmlFor="rating-min" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                        Minimum rating
                      </label>
                      <input
                        id="rating-min"
                        type="number"
                        min={0}
                        max={5}
                        step="0.1"
                        placeholder="0 - 5"
                        value={ratingMin}
                        onChange={(e) => setRatingMin(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-salon-gold/40 focus:border-salon-gold"
                      />
                    </div>
                    <div>
                      <label htmlFor="availability-date" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                        Availability date
                      </label>
                      <input
                        id="availability-date"
                        type="date"
                        value={availabilityFilter}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setAvailabilityFilter(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-salon-gold/40 focus:border-salon-gold"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="gender-preference" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                        Gender preference
                      </label>
                      <select
                        id="gender-preference"
                        value={genderPreference}
                        onChange={(e) => setGenderPreference(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-salon-gold/40 focus:border-salon-gold"
                      >
                        <option value="">All</option>
                        <option value="ladies">Ladies</option>
                        <option value="gents">Gents</option>
                        <option value="unisex">Unisex</option>
                      </select>
                    </div>
                  </div>

                  {activeFilterChips.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {activeFilterChips.map((chip) => (
                        <button
                          key={chip.key}
                          type="button"
                          onClick={() => chip.clear()}
                          className="px-3 py-1.5 text-xs rounded-full border border-salon-gold/40 bg-salon-gold/10 text-salon-espresso hover:bg-salon-gold/20 transition-colors"
                        >
                          {chip.label} ×
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="sm:col-span-2 flex gap-2 mt-4">
                    <button
                      type="button"
                      onClick={applyFilters}
                      disabled={!hasPendingChanges || loading}
                      className="px-4 py-2.5 bg-salon-gold text-white rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {loading ? "Applying..." : "Apply filters"}
                    </button>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="px-4 py-2.5 border border-gray-200 bg-white rounded-xl text-sm font-medium hover:border-salon-gold transition-colors"
                    >
                      Reset all
                    </button>
                  </div>
                </div>
              )}
            </div>

            {error && <ErrorBox message={error} />}

            {loading ? (
              <div className="flex justify-center py-16"><Spinner size="lg" /></div>
            ) : salons.length === 0 ? (
              <p className="text-gray-400 text-center py-12">
                {search ? t("noSalonsMatchSearch") : t("noSalonsAvailableYet")}
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
                        className="w-full text-start p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-salon-gold/50 hover:shadow-md transition-all group"
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
                    <p className="text-gray-400 text-sm">
                      {meta.from}–{meta.to} {t("summaryOf")} {meta.total}
                    </p>
                    <div className="flex gap-2">
                      <PagerBtn disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                        <ChevronLeft className="w-4 h-4 inline-block" /> {t("prev")}
                      </PagerBtn>
                      <span className="px-3 py-2 text-sm text-gray-500">{page} / {meta.last_page}</span>
                      <PagerBtn disabled={page >= meta.last_page} onClick={() => goToPage(page + 1)}>
                        {t("next")} <ChevronRight className="w-4 h-4 inline-block" />
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
            <BackBtn onClick={() => { setStep(1); setDetail(null); setError(null); }} label={t("back")} />

            {loadingDetail ? (
              <div className="flex justify-center py-16"><Spinner size="lg" /></div>
            ) : detail ? (
              <>
                <h1 className="font-display text-3xl font-semibold text-salon-espresso mb-1">
                  {detail.salon.name}
                </h1>
                <p className="text-gray-500 text-sm mb-6">{t("chooseLocationServiceTitle")}</p>
                {error && <div className="mb-4"><ErrorBox message={error} /></div>}

                <div className="space-y-8">
                  {/* Location */}
                  <div>
                    <SectionLabel>{t("location")}</SectionLabel>
                    <div className="space-y-3">
                      {detail.branches.map((b, i) => (
                        <SelectCard
                          key={b.id}
                          active={String(branchId) === String(b.id)}
                          onClick={() => setBranchId(String(b.id))}
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
                    <SectionLabel>{t("service")}</SectionLabel>
                    <div className="space-y-3">
                      {detail.services.map((s, i) => (
                        <SelectCard
                          key={s.id}
                          active={String(serviceId) === String(s.id)}
                          onClick={() => setServiceId(String(s.id))}
                          delay={i * 40}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-salon-espresso text-sm truncate">{s.name}</p>
                            <p className="flex items-center gap-1 text-gray-400 text-xs mt-0.5">
                              <Clock className="w-3 h-3 shrink-0" />
                              {s.duration_minutes} {t("minutes")}
                              {s.description ? ` · ${s.description}` : ""}
                            </p>
                          </div>
                          <p
                            className={`text-base font-bold shrink-0 transition-colors ${String(serviceId) === String(s.id) ? "text-salon-gold" : "text-salon-espresso"}`}
                          >
                            {formatPublicCurrency(Number(s.price), detail.salon.currency, locale)}
                          </p>
                        </SelectCard>
                      ))}
                    </div>
                  </div>

                  <PrimaryBtn disabled={!branchId || !serviceId} onClick={() => setStep(3)}>
                    <span className="flex items-center justify-center gap-2">
                      {t("chooseDateTimeCta")} <ChevronRight className="w-4 h-4" />
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
            <BackBtn onClick={() => setStep(2)} label={t("back")} />
            <h1 className="font-display text-3xl font-semibold text-salon-espresso mb-1">
              {t("step3Title")}
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              {selectedService?.name} · {selectedBranch?.name}
            </p>

            <div className="mb-6">
              <SectionLabel>{t("date")}</SectionLabel>
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
                <SectionLabel>{t("availableTimes")}</SectionLabel>
                {loadingSlots ? (
                  <div className="flex justify-center py-8"><Spinner /></div>
                ) : slots.length === 0 ? (
                  <p className="text-gray-400 text-sm py-4">
                    {t("noSlotsAvailableTryAnotherDay")}
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
                        {fmt(slot.start, LOCALE_BCP47[locale])}
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
            <BackBtn onClick={() => setStep(3)} label={t("back")} />
            <h1 className="font-display text-3xl font-semibold text-salon-espresso mb-1">
              {t("yourDetails")}
            </h1>
            <p className="text-gray-500 text-sm mb-6">{t("almostDone")}</p>

            {error && <div className="mb-4"><ErrorBox message={error} /></div>}

            {/* Summary card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 space-y-2 text-sm">
              <SummaryRow label={t("summaryService")} value={selectedService?.name ?? "—"} />
              <SummaryRow label={t("summaryLocation")} value={selectedBranch?.name ?? "—"} />
              <SummaryRow
                label={t("summaryDate")}
                value={localDate(selected.slot.start).toLocaleDateString(LOCALE_BCP47[locale], {
                  weekday: "long", month: "short", day: "numeric",
                })}
              />
              <SummaryRow
                label={t("summaryTime")}
                value={`${fmt(selected.slot.start, LOCALE_BCP47[locale])} – ${fmt(selected.slot.end, LOCALE_BCP47[locale])}`}
              />
              <SummaryRow
                label={t("summaryPrice")}
                value={formatPublicCurrency(Number(selectedService?.price ?? 0), detail.salon.currency, locale)}
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
                    {t("loggedIn")}
                  </span>
                </div>
                <Field
                  label={t("phoneOptional")}
                  type="tel"
                  placeholder={t("addPhoneNumber")}
                  value={form.client_phone}
                  onChange={(v) => setForm((f) => ({ ...f, client_phone: v }))}
                />
              </div>
            ) : (
              /* Guest: show full form */
              <div className="space-y-4 mb-6">
                <Field
                  label={t("fullNameStar")}
                  type="text"
                  placeholder={t("yourName")}
                  value={form.client_name}
                  onChange={(v) => setForm((f) => ({ ...f, client_name: v }))}
                  required
                />
                <Field
                  label={t("phone")}
                  type="tel"
                  placeholder={t("optional")}
                  value={form.client_phone}
                  onChange={(v) => setForm((f) => ({ ...f, client_phone: v }))}
                />
                <Field
                  label={t("email")}
                  type="email"
                  placeholder={t("optionalForConfirmation")}
                  value={form.client_email}
                  onChange={(v) => setForm((f) => ({ ...f, client_email: v }))}
                />
                <p className="text-xs text-gray-400">
                  {t("alreadyHaveAccount")}{" "}
                  <Link href="/login" className="text-salon-gold hover:underline font-medium">
                    {t("logIn")}
                  </Link>{" "}
                  {t("logInToSkipStep")}
                </p>
              </div>
            )}

            <PrimaryBtn
              disabled={(!user && !form.client_name.trim()) || submitting}
              onClick={submitBook}
            >
              {submitting
                ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" /> {t("confirming")}</span>
                : t("confirmBooking")}
            </PrimaryBtn>
          </section>
        )}
      </main>
    </div>
  );
}

// ── Reusable components ───────────────────────────────────────────────────────

function BackBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-gray-400 text-sm font-medium hover:text-salon-espresso mb-6 transition-colors"
    >
      <ChevronLeft className="w-4 h-4" />
      {label}
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
      className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-start
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
      <span className="text-salon-espresso font-medium text-end">{value}</span>
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
function fmt(iso: string, locale?: string) {
  const local = iso.replace(/Z$/, "");
  return new Date(local).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Parse a potentially UTC-marked ISO string as naive local time. */
function localDate(iso: string): Date {
  return new Date(iso.replace(/Z$/, ""));
}
