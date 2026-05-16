'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Wallet,
  Search, 
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Building2,
  AlertCircle,
  Loader2,
  ArrowUpRight,
  DollarSign,
  Plus,
  Calendar,
  X,
  CreditCard,
  Banknote,
  History,
  FileText,
  CheckCircle2
} from 'lucide-react';
import { api, vendorPaymentsApi, purchaseOrdersApi, type Vendor, type PurchaseOrder } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type VendorBalance = {
  vendor_id: number;
  vendor_name: string;
  vendor_code: string;
  balance: number;
  currency: string;
};

type RefundTransaction = {
  id: number;
  vendor_id: number;
  refund_date: string;
  amount: number;
  payment_method: string;
  reference_number: string;
  note: string;
  vendor?: { name: string, code: string };
  purchase_order_return?: { return_number: string };
};

export default function PendingPaymentsPage() {
  const router = useRouter();
  const [balances, setBalances] = useState<VendorBalance[]>([]);
  const [allRefunds, setAllRefunds] = useState<RefundTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'refunds'>('pending');

  // Refund Modal State
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<VendorBalance | null>(null);
  
  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<PurchaseOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  
  const [refundForm, setRefundForm] = useState({
    refund_date: new Date().toISOString().split('T')[0],
    amount: 0,
    payment_method: 'Cash',
    reference_number: '',
    note: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    purchase_order_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    amount: 0,
    payment_method: 'Cash',
    reference_number: '',
    note: ''
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    if (activeTab === 'pending') {
      const res = await api<{ data: VendorBalance[] }>('/api/vendor-balances');
      if (!('error' in res)) setBalances(res.data || []);
    } else {
      const res = await api<{ data: RefundTransaction[] }>('/api/vendor-refunds');
      if (!('error' in res)) setAllRefunds(res.data || []);
    }
    setLoading(false);
  };

  const filteredBalances = balances.filter(b => 
    b.vendor_name.toLowerCase().includes(search.toLowerCase()) ||
    b.vendor_code.toLowerCase().includes(search.toLowerCase())
  );

  const filteredRefunds = allRefunds.filter(r => 
    r.vendor?.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.reference_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.purchase_order_return?.return_number?.toLowerCase().includes(search.toLowerCase())
  );

  const totalOwed = balances
    .filter(b => b.balance > 0)
    .reduce((acc, b) => acc + b.balance, 0);

  const totalCredits = balances
    .filter(b => b.balance < 0)
    .reduce((acc, b) => acc + Math.abs(b.balance), 0);

  const handleOpenRefund = (b: VendorBalance) => {
    setSelectedBalance(b);
    setRefundForm({
      refund_date: new Date().toISOString().split('T')[0],
      amount: Math.abs(b.balance),
      payment_method: 'Cash',
      reference_number: '',
      note: `Settlement for credit balance of ${Math.abs(b.balance)} ${b.currency}`
    });
    setShowRefundModal(true);
  };

  const handleOpenPayment = async (b: VendorBalance) => {
    setSelectedBalance(b);
    setShowPaymentModal(true);
    setLoadingOrders(true);
    
    // Fetch unpaid/partial POs for this vendor
    const res = await purchaseOrdersApi.list({ 
      vendor_id: b.vendor_id, 
      payment_status: 'unpaid,partial' 
    });
    
    setLoadingOrders(false);
    if (!('error' in res)) {
      const orders = res.data || [];
      setPendingOrders(orders);
      if (orders.length > 0) {
        setPaymentForm({
          ...paymentForm,
          purchase_order_id: String(orders[0].id),
          amount: (orders[0].grand_total || 0) - (orders[0].payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0)
        });
      }
    }
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBalance) return;
    
    setSubmitting(true);
    const res = await vendorPaymentsApi.recordRefund({
      vendor_id: selectedBalance.vendor_id,
      ...refundForm
    });
    setSubmitting(false);

    if (!('error' in res)) {
      toastSuccess('Refund recorded and balance updated');
      setShowRefundModal(false);
      loadData();
    } else {
      toastError(res.error);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.purchase_order_id) {
        toastError('Please select a purchase order');
        return;
    }
    
    setSubmitting(true);
    const res = await vendorPaymentsApi.record(paymentForm.purchase_order_id, paymentForm);
    setSubmitting(false);

    if (!('error' in res)) {
      toastSuccess('Payment recorded successfully');
      setShowPaymentModal(false);
      loadData();
    } else {
      toastError(res.error);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <DashboardPageHeader
          title="Vendor Financials"
          description="Manage pending payments and track vendor refund history"
          icon={<Wallet className="w-5 h-5" />}
        />
        
        <div className="flex p-1 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl">
           <button 
             onClick={() => setActiveTab('pending')}
             className={cn(
               "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
               activeTab === 'pending' ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-zinc-500 hover:text-zinc-200"
             )}
           >
             <Wallet className="w-3.5 h-3.5" />
             Pending Balances
           </button>
           <button 
             onClick={() => setActiveTab('refunds')}
             className={cn(
               "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
               activeTab === 'refunds' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-zinc-500 hover:text-zinc-200"
             )}
           >
             <History className="w-3.5 h-3.5" />
             Refunds History
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-orange-500/5 border border-orange-500/20 p-6 rounded-[32px] flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-orange-500 mb-1">Total You Owe</p>
            <h2 className="text-3xl font-black tracking-tight text-zinc-100">{totalOwed.toLocaleString()} <span className="text-sm font-bold opacity-50">USD</span></h2>
          </div>
          <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-orange-500" />
          </div>
        </div>
        <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-[32px] flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-1">Total Vendor Credits</p>
            <h2 className="text-3xl font-black tracking-tight text-zinc-100">{totalCredits.toLocaleString()} <span className="text-sm font-bold opacity-50">USD</span></h2>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
            <TrendingDown className="w-6 h-6 text-emerald-500" />
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-900/50 border border-zinc-800 p-4 rounded-3xl shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            placeholder={activeTab === 'pending' ? "Search vendors..." : "Search refunds..."}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/50 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-500/20 transition-all text-zinc-200 placeholder:text-zinc-600"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-3xl bg-zinc-900" />)}
        </div>
      ) : activeTab === 'pending' ? (
        filteredBalances.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/50 border border-zinc-800 rounded-[32px] border-dashed">
            <div className="w-16 h-16 bg-zinc-800/50 rounded-2xl flex items-center justify-center mb-4">
              <Wallet className="w-8 h-8 text-zinc-700" />
            </div>
            <p className="text-zinc-400 font-medium text-lg">No pending balances</p>
            <p className="text-zinc-600 text-sm">All vendor accounts are fully settled</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBalances.map((b) => (
              <div 
                key={b.vendor_id}
                className="group bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 shadow-sm hover:shadow-2xl hover:border-orange-500/30 transition-all relative overflow-hidden"
              >
                <div className={cn(
                  "absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform",
                  b.balance > 0 ? "bg-orange-500/5" : "bg-emerald-500/5"
                )} />
                
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-1 cursor-pointer" onClick={() => router.push(`/dashboard/vendors?id=${b.vendor_id}`)}>
                    <h3 className="font-black text-lg tracking-tight text-zinc-100 group-hover:text-orange-500 transition-colors">{b.vendor_name}</h3>
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                      <Building2 className="w-3 h-3" />
                      {b.vendor_code}
                    </div>
                  </div>
                  <div className={cn(
                    "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full",
                    b.balance > 0 ? "bg-orange-500/10 text-orange-500 border border-orange-500/20" : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                  )}>
                    {b.balance > 0 ? 'You Owe' : 'Vendor Credit'}
                  </div>
                </div>

                <div className={cn(
                  "p-4 rounded-2xl border",
                  b.balance > 0 ? "bg-orange-500/5 border-orange-500/10" : "bg-emerald-500/5 border-emerald-500/10"
                )}>
                  <p className={cn(
                    "text-[10px] font-bold uppercase tracking-widest mb-1",
                    b.balance > 0 ? "text-orange-500/70" : "text-emerald-500/70"
                  )}>Outstanding Amount</p>
                  <div className={cn(
                    "font-black text-2xl tracking-tighter",
                    b.balance > 0 ? "text-orange-100" : "text-emerald-100"
                  )}>
                    {Math.abs(b.balance).toLocaleString()} <span className="text-sm font-bold ml-1 opacity-50">{b.currency}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-800/50">
                  <button 
                    onClick={() => router.push(`/dashboard/vendors?id=${b.vendor_id}`)}
                    className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1 hover:text-zinc-300 transition-colors"
                  >
                    Statement <ArrowUpRight className="w-3 h-3" />
                  </button>

                  {b.balance < 0 && (
                    <button
                      onClick={() => handleOpenRefund(b)}
                      className="px-3 py-1.5 bg-emerald-500 text-emerald-950 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-400 transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                    >
                      <Plus className="w-3 h-3" />
                      Record Refund
                    </button>
                  )}
                  
                  {b.balance > 0 && (
                    <button
                      onClick={() => handleOpenPayment(b)}
                      className="px-3 py-1.5 bg-orange-500 text-orange-950 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-colors flex items-center gap-1.5 shadow-lg shadow-orange-500/20"
                    >
                      <DollarSign className="w-3 h-3" />
                      Pay Now
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-950 border-b border-zinc-800">
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Date</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Vendor</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Ref / Return</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Method</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredRefunds.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-zinc-600 font-medium italic">No refund history found.</td>
                </tr>
              ) : (
                filteredRefunds.map(r => (
                  <tr key={r.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-6 py-4 text-sm font-bold text-zinc-400">{new Date(r.refund_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col">
                          <span className="text-sm font-black text-zinc-100 group-hover:text-emerald-500 transition-colors">{r.vendor?.name}</span>
                          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{r.vendor?.code}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col">
                          <span className="text-xs font-bold text-zinc-300">{r.reference_number || '—'}</span>
                          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{r.purchase_order_return?.return_number || 'General Refund'}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="px-2 py-0.5 bg-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-400 rounded-md">
                          {r.payment_method}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <span className="text-sm font-black text-emerald-400 underline decoration-emerald-500/30 decoration-2 underline-offset-4">
                          USD {r.amount.toLocaleString()}
                       </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-zinc-100">Record Vendor Refund</h2>
                <p className="text-sm text-zinc-500 font-medium">{selectedBalance?.vendor_name} is paying you back</p>
              </div>
              <button 
                onClick={() => setShowRefundModal(false)}
                className="w-10 h-10 flex items-center justify-center bg-zinc-800 rounded-2xl text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRefundSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Refund Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input
                      type="date"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 transition-all text-zinc-200"
                      value={refundForm.refund_date}
                      onChange={(e) => setRefundForm({ ...refundForm, refund_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Amount ({selectedBalance?.currency})</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input
                      type="number"
                      step="0.01"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 transition-all text-zinc-200 font-bold"
                      value={refundForm.amount}
                      onChange={(e) => setRefundForm({ ...refundForm, amount: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-3">
                  {['Cash', 'Bank Transfer', 'Cheque'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setRefundForm({ ...refundForm, payment_method: m })}
                      className={cn(
                        "py-3 rounded-2xl border text-xs font-bold transition-all",
                        refundForm.payment_method === m 
                          ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500 shadow-lg shadow-emerald-500/10" 
                          : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Reference / Note</label>
                <textarea
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 transition-all text-zinc-200 text-sm min-h-[100px]"
                  placeholder="Reference number or settlement notes..."
                  value={refundForm.note}
                  onChange={(e) => setRefundForm({ ...refundForm, note: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-emerald-500 text-emerald-950 font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Cash Refund'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-zinc-100">Record Payment</h2>
                <p className="text-sm text-zinc-500 font-medium">Paying {selectedBalance?.vendor_name}</p>
              </div>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="w-10 h-10 flex items-center justify-center bg-zinc-800 rounded-2xl text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Select Purchase Order</label>
                {loadingOrders ? (
                  <div className="flex items-center gap-2 text-zinc-500 text-sm py-4 italic">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Finding unpaid orders...
                  </div>
                ) : pendingOrders.length === 0 ? (
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-20" />
                    <p className="text-sm text-zinc-400 font-bold">All orders are fully paid!</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                    {pendingOrders.map(order => (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => {
                          setPaymentForm({ 
                            ...paymentForm, 
                            purchase_order_id: String(order.id),
                            amount: (order.grand_total || 0) - (order.payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0)
                          });
                        }}
                        className={cn(
                          "w-full p-4 rounded-2xl border text-left transition-all",
                          paymentForm.purchase_order_id === String(order.id)
                            ? "bg-orange-500/10 border-orange-500/50 text-zinc-100"
                            : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                        )}
                      >
                        <div className="flex justify-between items-center">
                           <div className="flex flex-col">
                              <span className="text-xs font-black uppercase tracking-widest">{order.po_number}</span>
                              <span className="text-[10px] font-bold text-zinc-500">{new Date(order.order_date).toLocaleDateString()}</span>
                           </div>
                           <div className="text-right">
                              <span className="text-xs font-black text-zinc-100">{(order.grand_total || 0).toLocaleString()} {order.currency}</span>
                              <p className="text-[9px] font-bold text-orange-500 uppercase tracking-widest">Pending: {((order.grand_total || 0) - (order.payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0)).toLocaleString()}</p>
                           </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Payment Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input
                      type="date"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-orange-500/20 transition-all text-zinc-200"
                      value={paymentForm.payment_date}
                      onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Amount ({selectedBalance?.currency})</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input
                      type="number"
                      step="0.01"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-orange-500/20 transition-all text-zinc-200 font-bold"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-3">
                  {['Cash', 'Bank Transfer', 'Cheque'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentForm({ ...paymentForm, payment_method: m })}
                      className={cn(
                        "py-3 rounded-2xl border text-xs font-bold transition-all",
                        paymentForm.payment_method === m 
                          ? "bg-orange-500/10 border-orange-500/50 text-orange-500 shadow-lg shadow-orange-500/10" 
                          : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Reference / Note</label>
                <textarea
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-orange-500/20 transition-all text-zinc-200 text-sm min-h-[80px]"
                  placeholder="Reference number or payment notes..."
                  value={paymentForm.note}
                  onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={submitting || pendingOrders.length === 0}
                className="w-full py-4 bg-orange-500 text-orange-950 font-black uppercase tracking-widest rounded-2xl hover:bg-orange-400 transition-all shadow-xl shadow-orange-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Payment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
