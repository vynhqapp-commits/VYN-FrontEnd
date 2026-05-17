'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  History, 
  DollarSign, 
  Calendar as CalendarIcon, 
  CreditCard, 
  FileText, 
  Loader2,
  Plus,
  Receipt,
  Building2
} from 'lucide-react';
import { purchaseOrdersApi, type PurchaseOrder } from '@/lib/api';
import { toastError } from '@/lib/toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function POPaymentHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      const res = await purchaseOrdersApi.get(id);
      if ('error' in res) throw new Error(res.error);
      setOrder(res.data || null);
    } catch (err: any) {
      toastError(err.message || 'Failed to load order');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    return method.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'card': return <CreditCard className="w-4 h-4" />;
      case 'bank_transfer': return <Building2 className="w-4 h-4" />;
      case 'cash': return <DollarSign className="w-4 h-4" />;
      default: return <Receipt className="w-4 h-4" />;
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

  const totalPaid = (order.payments || []).reduce((acc, p) => acc + parseFloat(p.amount.toString()), 0);
  const remaining = parseFloat(order.grand_total.toString()) - totalPaid;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <button 
            onClick={() => router.push('/dashboard/purchase-orders')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-2 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Orders</span>
          </button>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            Payment History
            <span className="text-sm font-bold px-3 py-1 bg-orange-100 text-orange-600 rounded-full">
              {order.po_number}
            </span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            View all recorded payments and transaction details for this order.
          </p>
        </div>

        <Link 
          href={`/dashboard/purchase-orders/${id}/payment`}
          className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/20"
        >
          <Plus className="w-4 h-4" />
          Record New Payment
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
           <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Order Total</p>
           <h3 className="text-2xl font-black text-foreground">{order.currency} {parseFloat(order.grand_total.toString()).toLocaleString()}</h3>
        </div>
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
           <p className="text-xs font-bold uppercase tracking-wider text-green-600/70 mb-1">Total Paid</p>
           <h3 className="text-2xl font-black text-green-600">{order.currency} {totalPaid.toLocaleString()}</h3>
        </div>
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
           <p className="text-xs font-bold uppercase tracking-wider text-orange-600/70 mb-1">Balance Due</p>
           <h3 className="text-2xl font-black text-orange-600">{order.currency} {remaining.toLocaleString()}</h3>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-muted/30 border-b border-border">
           <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-orange-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Transactions Log</h3>
           </div>
        </div>
        
        {(!order.payments || order.payments.length === 0) ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8 text-muted-foreground opacity-20" />
            </div>
            <p className="text-muted-foreground font-medium">No payments recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/10 border-b border-border">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reference</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Method</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Note</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{new Date(p.payment_date).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
                        {p.reference_number || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        {getPaymentMethodIcon(p.payment_method)}
                        {getPaymentMethodLabel(p.payment_method)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]" title={p.note}>
                        {p.note || '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-black text-foreground">
                        {order.currency} {parseFloat(p.amount.toString()).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex justify-between items-center px-2">
         <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            <Building2 className="w-3 h-3" />
            Vendor: {order.vendor?.name}
         </div>
         <div className={cn(
           "px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
           order.payment_status === 'paid' ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
         )}>
           Status: {order.payment_status}
         </div>
      </div>
    </div>
  );
}
