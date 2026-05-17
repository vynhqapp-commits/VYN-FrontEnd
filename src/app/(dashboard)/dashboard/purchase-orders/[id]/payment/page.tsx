'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  DollarSign, 
  Calendar as CalendarIcon, 
  CreditCard, 
  FileText, 
  Hash,
  Save,
  Loader2
} from 'lucide-react';
import { purchaseOrdersApi, type PurchaseOrder } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import Link from 'next/link';

export default function AddPOPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      const res = await purchaseOrdersApi.get(id);
      if ('error' in res) throw new Error(res.error);
      const o = res.data || null;
      setOrder(o);
      if (!o) return;

      const totalPaid = (o.payments || []).reduce((acc, p) => acc + parseFloat(p.amount.toString()), 0);
      const remaining = parseFloat(o.grand_total.toString()) - totalPaid;

      // Default amount to remaining balance
      setAmount(Math.max(0, remaining).toFixed(2));
      // Pre-fill reference with PO Number
      setReferenceNumber(o.po_number);
    } catch (err: any) {
      toastError(err.message || 'Failed to load order');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const val = parseFloat(amount);
    if (!amount || val <= 0) {
      toastError('Please enter a valid amount');
      return;
    }

    const totalPaid = (order?.payments || []).reduce((acc, p) => acc + parseFloat(p.amount.toString()), 0);
    const remaining = parseFloat(order?.grand_total?.toString() || '0') - totalPaid;

    if (val > remaining + 0.01) { // 0.01 for rounding margin
      toastError(`Amount cannot exceed the remaining balance (${order?.currency} ${remaining.toLocaleString()})`);
      return;
    }

    setSubmitting(true);
    try {
      // We need to add this to purchaseOrdersApi in lib/api.ts
      const res = await (purchaseOrdersApi as any).recordPayment(id, {
        amount: parseFloat(amount),
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference_number: referenceNumber,
        note
      });

      if ('error' in res) throw new Error(res.error);
      
      toastSuccess('Payment recorded successfully');
      router.push('/dashboard/purchase-orders');
    } catch (err: any) {
      toastError(err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-2 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Orders</span>
          </button>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            Record Payment
            <span className="text-sm font-bold px-3 py-1 bg-orange-100 text-orange-600 rounded-full">
              {order.po_number}
            </span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Register a payment transaction for this purchase order.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-3xl p-8 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Amount */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Payment Amount *</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20 text-lg font-bold"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground px-1">
                  Remaining balance: <span className="font-bold text-orange-600">{order.currency} {(parseFloat(order.grand_total.toString()) - (order.payments || []).reduce((acc, p) => acc + parseFloat(p.amount.toString()), 0)).toLocaleString()}</span>
                </p>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Payment Date *</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="date"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Method */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Payment Method *</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <select
                    required
                    className="w-full pl-10 pr-4 py-3 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20 appearance-none"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="card">Credit/Debit Card</option>
                    <option value="check">Check</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Reference */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Reference Number</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    placeholder="TXN-123456..."
                    className="w-full pl-10 pr-4 py-3 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                  />
                </div>
              </div>

              {/* Note */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Payment Note</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-4 w-4 h-4 text-muted-foreground" />
                  <textarea
                    rows={3}
                    placeholder="Add any additional details about this payment..."
                    className="w-full pl-10 pr-4 py-3 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-8 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Record Payment
              </button>
            </div>
          </form>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Order Details</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Vendor</span>
                <span className="text-sm font-bold">{order.vendor?.name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Order Date</span>
                <span className="text-sm font-bold">{new Date(order.order_date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Total Amount</span>
                <span className="text-sm font-black text-foreground">{order.currency} {parseFloat(order.grand_total.toString()).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Already Paid</span>
                <span className="text-sm font-bold text-green-600">
                  {order.currency} {(order.payments || []).reduce((acc, p) => acc + parseFloat(p.amount.toString()), 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Remaining</span>
                <span className="text-sm font-black text-orange-600">
                  {order.currency} {(parseFloat(order.grand_total.toString()) - (order.payments || []).reduce((acc, p) => acc + parseFloat(p.amount.toString()), 0)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Current Status</span>
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full">
                  {order.payment_status}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-muted/30 rounded-2xl border border-border">
            <div className="flex items-start gap-3">
              <DollarSign className="w-4 h-4 text-orange-600 mt-1" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Recording a payment will automatically update the order's payment status. If the amount paid equals or exceeds the grand total, the status will move to <strong>Paid</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
