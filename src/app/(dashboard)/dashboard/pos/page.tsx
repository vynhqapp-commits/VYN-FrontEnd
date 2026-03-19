'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  appointmentsApi,
  clientsApi,
  locationsApi,
  productsApi,
  servicesApi,
  transactionsApi,
  type Appointment,
  type Client,
  type Location,
  type Product,
  type Service,
} from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type LineType = 'service' | 'product';

type PosLine = {
  id: string;
  type: LineType;
  service_id?: string;
  product_id?: string;
  name: string;
  quantity: number;
  unit_price: number;
};

type PaymentRow = {
  id: string;
  method: string;
  amount: number;
  reference?: string;
};

const paymentMethods = ['Cash', 'Card', 'Whish', 'OMT', 'Transfer'];

export default function PosPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [locationId, setLocationId] = useState('');
  const [clientId, setClientId] = useState('');
  const [appointmentId, setAppointmentId] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [lines, setLines] = useState<PosLine[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([
    { id: 'p-1', method: 'Cash', amount: 0 },
  ]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      locationsApi.list(),
      clientsApi.list(),
      servicesApi.list(),
      productsApi.list(),
    ]).then(([locRes, clientRes, serviceRes, productRes]) => {
      if (locRes.data?.locations) {
        setLocations(locRes.data.locations);
        if (locRes.data.locations[0]) setLocationId(locRes.data.locations[0].id);
      }
      if (clientRes.data?.clients) setClients(clientRes.data.clients);
      if (serviceRes.data?.services) setServices(serviceRes.data.services);
      if (productRes.data?.products) setProducts(productRes.data.products);
      setLoading(false);
    });
  }, []);

  // Load today's appointments for selected location (to link checkout to booking)
  useEffect(() => {
    if (!locationId) return;
    const today = new Date().toISOString().slice(0, 10);
    appointmentsApi.list({ location_id: locationId, from: today, to: today }).then((res) => {
      if (!('error' in res) && res.data?.appointments) setAppointments(res.data.appointments);
    });
  }, [locationId]);

  const pickAppointment = (id: string) => {
    setAppointmentId(id);
    if (!id) return;
    const appt = appointments.find((a) => a.id === id);
    if (!appt) return;
    if (appt.client_id) setClientId(appt.client_id);
    // Autofill a service line from the appointment
    if (appt.Service?.id) {
      setLines([
        {
          id: `l-appt-${Date.now()}`,
          type: 'service',
          service_id: appt.Service.id,
          name: appt.Service.name,
          quantity: 1,
          unit_price: Number(appt.Service.price ?? 0),
        },
      ]);
    }
  };

  const clientOptions = useMemo(
    () =>
      clients.map((c) => ({
        value: String(c.id),
        label: `${String(c.full_name ?? 'Unnamed client')}${
          c.phone ? ` · ${c.phone}` : ''
        }${c.email ? ` · ${c.email}` : ''}`,
        keywords: [c.full_name, c.phone, c.email].filter(Boolean).join(' '),
      })),
    [clients],
  );

  const locationOptions = useMemo(
    () =>
      locations.map((l) => ({
        value: String(l.id),
        label: String(l.name ?? 'Unnamed location'),
      })),
    [locations],
  );

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0),
    [lines]
  );
  const paid = useMemo(
    () => payments.reduce((sum, p) => sum + (Number.isFinite(p.amount) ? p.amount : 0), 0),
    [payments]
  );
  const remaining = useMemo(() => Math.max(0, subtotal - paid), [subtotal, paid]);

  const addLine = (type: LineType, sourceId: string) => {
    if (!sourceId) return;
    if (type === 'service') {
      const svc = services.find((s) => String(s.id) === String(sourceId));
      if (!svc) return;
      setLines((prev) => [
        ...prev,
        {
          id: `l-${Date.now()}-${prev.length}`,
          type: 'service',
          service_id: svc.id,
          name: svc.name,
          quantity: 1,
          unit_price: Number(svc.price ?? 0),
        },
      ]);
    } else {
      const prod = products.find((p) => String(p.id) === String(sourceId));
      if (!prod) return;
      setLines((prev) => [
        ...prev,
        {
          id: `l-${Date.now()}-${prev.length}`,
          type: 'product',
          product_id: prod.id,
          name: prod.name,
          quantity: 1,
          unit_price: Number(prod.price ?? 0),
        },
      ]);
    }
  };

  const updateLine = (id: string, patch: Partial<PosLine>) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
    );
  };

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const updatePayment = (id: string, patch: Partial<PaymentRow>) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  };

  const addPaymentRow = () => {
    setPayments((prev) => [
      ...prev,
      { id: `p-${Date.now()}-${prev.length}`, method: 'Cash', amount: 0 },
    ]);
  };

  const removePaymentRow = (id: string) => {
    setPayments((prev) => (prev.length <= 1 ? prev : prev.filter((p) => p.id !== id)));
  };

  const handleSubmit = async () => {
    if (!locationId) {
      toastError('Please select a location.');
      return;
    }
    if (!clientId) {
      toastError('Please select a client.');
      return;
    }
    if (!lines.length) {
      toastError('Add at least one service or product to the sale.');
      return;
    }
    if (paid > subtotal + 0.01) {
      toastError('Payment total cannot exceed the order total.');
      return;
    }

    setSubmitting(true);
    const body = {
      client_id: clientId,
      location_id: locationId,
      appointment_id: appointmentId || undefined,
      items: lines.map((l) => ({
        type: l.type,
        service_id: l.service_id,
        product_id: l.product_id,
        quantity: l.quantity,
        unit_price: l.unit_price,
      })),
      payments: payments
        .filter((p) => p.amount > 0)
        .map((p) => ({ method: p.method, amount: p.amount, reference: p.reference })),
    };
    const { data, error: err } = await transactionsApi.create(body);
    setSubmitting(false);
    if (err || !data?.transaction) {
      toastError(err || 'Failed to complete sale.');
      return;
    }
    setLines([]);
    setPayments([{ id: 'p-1', method: 'Cash', amount: 0 }]);
    toastSuccess(
      remaining > 0
        ? 'Sale recorded. Remaining amount has been added to client debt.'
        : 'Sale completed successfully.',
    );
  };

  if (loading) {
    return <p className="text-salon-stone">Loading POS...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-salon-espresso">POS checkout</h1>
          <p className="text-salon-stone text-sm mt-1">
            Create a sale with multiple payments. Any remaining amount will be recorded as client debt.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="w-full sm:w-56">
            <p className="text-xs font-semibold text-salon-stone mb-1">Location</p>
            <Combobox
              value={locationId}
              onValueChange={setLocationId}
              options={locationOptions}
              placeholder="Select location"
              searchPlaceholder="Search locations..."
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)]">
        {/* Left side: client + lines */}
        <div className="space-y-4">
          {/* Appointment link */}
          <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-4 space-y-2">
            <h2 className="font-display text-sm font-semibold text-salon-espresso">Booking link (optional)</h2>
            <p className="text-xs text-salon-stone">
              Select an appointment to auto-fill the client and service, and mark it completed when paid.
            </p>
            <select
              value={appointmentId}
              onChange={(e) => pickAppointment(e.target.value)}
              className="w-full bg-salon-cream/40 border border-salon-sand/60 rounded-lg px-3 py-2 text-sm text-salon-espresso focus:outline-none focus:ring-2 focus:ring-salon-gold/40 focus:border-salon-gold"
            >
              <option value="">No appointment</option>
              {appointments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.Client?.full_name ?? a.client_id} · {a.Service?.name ?? a.service_id} ·{' '}
                  {a.start_at ? new Date(a.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                </option>
              ))}
            </select>
          </div>

          {/* Client selection */}
          <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-4 space-y-3">
            <h2 className="font-display text-sm font-semibold text-salon-espresso">Client</h2>
            <div>
              <p className="text-xs font-semibold text-salon-stone mb-1">Select client</p>
              <Combobox
                value={clientId}
                onValueChange={setClientId}
                options={clientOptions}
                placeholder="Select client"
                searchPlaceholder="Search clients..."
              />
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-sm font-semibold text-salon-espresso">Items</h2>
              <div className="flex gap-2">
                <select
                  onChange={(e) => {
                    if (!e.target.value) return;
                    addLine('service', e.target.value);
                    e.target.value = '';
                  }}
                  className="bg-salon-cream/40 border border-salon-sand/60 rounded-lg px-3 py-1.5 text-xs text-salon-espresso focus:outline-none focus:ring-1 focus:ring-salon-gold/40 focus:border-salon-gold"
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
                  onChange={(e) => {
                    if (!e.target.value) return;
                    addLine('product', e.target.value);
                    e.target.value = '';
                  }}
                  className="bg-salon-cream/40 border border-salon-sand/60 rounded-lg px-3 py-1.5 text-xs text-salon-espresso focus:outline-none focus:ring-1 focus:ring-salon-gold/40 focus:border-salon-gold"
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
              <p className="text-salon-stone text-xs">No items yet. Add a service or product to start.</p>
            ) : (
              <div className="space-y-2">
                {lines.map((line) => (
                  <div
                    key={line.id}
                    className="grid grid-cols-[minmax(0,2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto] gap-2 items-center"
                  >
                    <div>
                      <p className="text-sm font-medium text-salon-espresso truncate">{line.name}</p>
                      <p className="text-[11px] uppercase tracking-wide text-salon-stone">
                        {line.type === 'service' ? 'Service' : 'Product'}
                      </p>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(line.id, { quantity: Math.max(1, Number(e.target.value) || 1) })
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.unit_price}
                      onChange={(e) =>
                        updateLine(line.id, { unit_price: Math.max(0, Number(e.target.value) || 0) })
                      }
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-sm text-salon-espresso font-medium">
                        {(line.quantity * line.unit_price).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        className="text-xs text-salon-stone hover:text-salon-espresso"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right side: summary & payments */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-4 space-y-3">
            <h2 className="font-display text-sm font-semibold text-salon-espresso">Summary</h2>
            <div className="flex justify-between text-sm text-salon-stone">
              <span>Subtotal</span>
              <span className="text-salon-espresso font-medium">{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-salon-stone">
              <span>Tax</span>
              <span className="text-salon-espresso font-medium">0.00</span>
            </div>
            <div className="flex justify-between text-sm text-salon-stone border-t border-salon-sand/60 pt-2">
              <span className="font-semibold text-salon-espresso">Total</span>
              <span className="font-display text-xl font-semibold text-salon-espresso">
                {subtotal.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-salon-espresso">Payments</h2>
              <button
                type="button"
                onClick={addPaymentRow}
                className="text-xs font-medium text-salon-gold hover:text-salon-goldLight"
              >
                + Add payment
              </button>
            </div>
            <div className="space-y-2">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] gap-2 items-center"
                >
                  <select
                    value={p.method}
                    onChange={(e) => updatePayment(p.id, { method: e.target.value })}
                    className="w-full bg-salon-cream/40 border border-salon-sand/60 rounded-lg px-3 py-2 text-xs text-salon-espresso focus:outline-none focus:ring-1 focus:ring-salon-gold/40 focus:border-salon-gold"
                  >
                    {paymentMethods.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={p.amount}
                    onChange={(e) =>
                      updatePayment(p.id, { amount: Math.max(0, Number(e.target.value) || 0) })
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
            </div>

            <div className="pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-salon-stone">
                <span>Paid</span>
                <span className="text-salon-espresso font-medium">{paid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-salon-stone">
                <span>Remaining</span>
                <span className="text-salon-espresso font-medium">{remaining.toFixed(2)}</span>
              </div>
              {remaining > 0 && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 mt-1">
                  Partial payment: remaining amount will be added to the client&apos;s debt ledger after
                  checkout.
                </p>
              )}
            </div>

            <Button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="mt-4 w-full h-11 rounded-xl text-sm font-semibold"
            >
              {submitting ? 'Processing...' : 'Complete sale'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

