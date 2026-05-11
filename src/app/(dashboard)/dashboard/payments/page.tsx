'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Check, DollarSign, Eye, FileText, X } from 'lucide-react';
import { paymentsApi } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { Skeleton } from '@/components/ui/skeleton';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

interface UnpaidInvoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_id?: string;
  branch_name: string;
  total: string;
  paid_amount: string;
  outstanding: string;
  status: 'unpaid' | 'partial' | 'paid';
  created_at?: string;
  payments_count: number;
}

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  customer?: { id: string; name: string; phone?: string; email?: string };
  branch?: { id: string; name: string };
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  paid_amount: string;
  outstanding: string;
  status: string;
  items: Array<{ id: string; quantity: string; unit_price: string; total: string }>;
  payments: Array<{ id: string; method: string; amount: string; created_at?: string }>;
}

export default function PaymentsPage() {
  const [invoices, setInvoices] = useState<UnpaidInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'cash',
    reference: '',
  });

  useEffect(() => {
    loadInvoices();
    loadSummary();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    const res = await paymentsApi.unpaidInvoices();
    setLoading(false);
    if ('error' in res && res.error) {
      toastError(res.error);
    } else if (res.data?.invoices) {
      setInvoices(res.data.invoices);
    }
  };

  const loadSummary = async () => {
    const res = await paymentsApi.summary();
    if (!('error' in res)) {
      setSummary(res.data);
    }
  };

  const viewDetails = async (invoice: UnpaidInvoice) => {
    setDetailLoading(true);
    const res = await paymentsApi.invoiceDetails(invoice.id);
    setDetailLoading(false);
    if ('error' in res && res.error) {
      toastError(res.error);
    } else {
      setSelectedInvoice(res.data?.invoice);
      setPaymentForm({ amount: res.data?.invoice?.outstanding || '', method: 'cash', reference: '' });
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice || !paymentForm.amount) {
      toastError('Please enter payment amount');
      return;
    }

    const amount = parseFloat(paymentForm.amount);
    const outstanding = parseFloat(selectedInvoice.outstanding);

    if (amount <= 0) {
      toastError('Payment amount must be greater than 0');
      return;
    }

    if (amount > outstanding) {
      toastError(`Payment exceeds outstanding balance of ${outstanding}`);
      return;
    }

    setRecordingPayment(true);
    const res = await paymentsApi.recordPayment(selectedInvoice.id, {
      amount,
      method: paymentForm.method,
      reference: paymentForm.reference || undefined,
    });
    setRecordingPayment(false);

    if ('error' in res && res.error) {
      toastError(res.error);
    } else {
      toastSuccess('Payment recorded successfully');
      setSelectedInvoice(null);
      setPaymentForm({ amount: '', method: 'cash', reference: '' });
      loadInvoices();
      loadSummary();
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div>
      <DashboardPageHeader
        className="mb-4"
        title="Payments"
        icon={<DollarSign className="w-5 h-5" />}
        description="Manage unpaid and partial invoices"
      />

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Invoices</p>
            <p className="text-2xl font-bold text-foreground">{summary.total_invoices ?? 0}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Unpaid</p>
            <p className="text-2xl font-bold text-red-600">{summary.unpaid_count ?? 0}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Partial</p>
            <p className="text-2xl font-bold text-amber-600">{summary.partial_count ?? 0}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Outstanding</p>
            <p className="text-2xl font-bold text-foreground">${parseFloat(summary.total_unpaid_amount || '0').toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Invoices Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invoice #</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paid</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Outstanding</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  <Check className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  All invoices are paid!
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{inv.customer_name}</td>
                  <td className="px-4 py-3 text-sm text-foreground font-semibold">${parseFloat(inv.total).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">${parseFloat(inv.paid_amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-red-600">${parseFloat(inv.outstanding).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        inv.status === 'unpaid'
                          ? 'bg-red-100 text-red-700'
                          : inv.status === 'partial'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {inv.status === 'unpaid' ? 'Unpaid' : inv.status === 'partial' ? 'Partial' : 'Paid'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      type="button"
                      onClick={() => viewDetails(inv)}
                      aria-label="View invoice details"
                      title="View invoice details"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-[var(--elite-border-2)] text-[var(--elite-text)] hover:bg-[var(--elite-card-2)] transition-colors"
                    >
                      <Eye className="size-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[1px] p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedInvoice(null)}
        >
          <div
            className="bg-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-6 py-4 flex items-start justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">Invoice {selectedInvoice.invoice_number}</h2>
                <p className="text-muted-foreground text-sm">{selectedInvoice.customer?.name ?? 'N/A'}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="p-2 rounded-xl text-muted-foreground hover:bg-accent transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Summary */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Subtotal</p>
                    <p className="text-lg font-semibold text-foreground">${parseFloat(selectedInvoice.subtotal).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Discount</p>
                    <p className="text-lg font-semibold text-foreground">-${parseFloat(selectedInvoice.discount).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Tax</p>
                    <p className="text-lg font-semibold text-foreground">${parseFloat(selectedInvoice.tax).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total</p>
                    <p className="text-lg font-bold text-foreground">${parseFloat(selectedInvoice.total).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Paid Amount</p>
                    <p className="text-lg font-semibold text-green-600">${parseFloat(selectedInvoice.paid_amount).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Outstanding</p>
                    <p className="text-lg font-bold text-red-600">${parseFloat(selectedInvoice.outstanding).toFixed(2)}</p>
                  </div>
                </div>

                {/* Payment History */}
                {selectedInvoice.payments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Payment History</h3>
                    <div className="space-y-2">
                      {selectedInvoice.payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-foreground">{p.method}</p>
                            <p className="text-xs text-muted-foreground">{p.created_at ? new Date(p.created_at).toLocaleString() : 'N/A'}</p>
                          </div>
                          <p className="text-sm font-semibold text-green-600">${parseFloat(p.amount).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Record Payment Form */}
                {parseFloat(selectedInvoice.outstanding) > 0 && (
                  <div className="border-t border-border pt-6">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Record Payment</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Payment Amount</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                          <input
                            type="number"
                            value={paymentForm.amount}
                            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            max={selectedInvoice.outstanding}
                            className="w-full pl-7 pr-3 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Max: ${parseFloat(selectedInvoice.outstanding).toFixed(2)}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Payment Method</label>
                        <select
                          value={paymentForm.method}
                          onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
                        >
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="transfer">Bank Transfer</option>
                          <option value="gift_card">Gift Card</option>
                          <option value="check">Check</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Reference (Optional)</label>
                        <input
                          type="text"
                          value={paymentForm.reference}
                          onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                          placeholder="e.g. Cheque #, Card last 4 digits"
                          className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => setSelectedInvoice(null)}
                          className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-accent"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleRecordPayment}
                          disabled={recordingPayment || !paymentForm.amount}
                          className="flex-1 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          {recordingPayment ? 'Recording...' : 'Record Payment'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
