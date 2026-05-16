'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  ArrowLeft,
  ChevronRight,
  RotateCcw,
  Calendar,
  FileText,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { 
  purchaseOrderReturnsApi, 
  settingsApi,
  type PurchaseOrderReturn,
  api
} from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export default function PurchaseOrderReturnsPage() {
  const router = useRouter();
  const [returns, setReturns] = useState<PurchaseOrderReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [collectingId, setCollectingId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [retRes, setRes] = await Promise.all([
      purchaseOrderReturnsApi.list(),
      settingsApi.get()
    ]);
    setLoading(false);
    
    if (!('error' in retRes)) {
      setReturns((retRes.data as any).data || retRes.data || []);
    } else {
      toastError(retRes.error);
    }
    
    if (!('error' in setRes)) {
      setCurrency(setRes.data?.salon?.currency || 'USD');
    }
  };

  const handleCollect = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setCollectingId(id);
    const res = await purchaseOrderReturnsApi.collect(id);
    setCollectingId(null);
    if (!('error' in res)) {
      toastSuccess('Return marked as collected');
      loadData();
    } else {
      toastError(res.error);
    }
  };

  const filteredReturns = returns.filter(r => 
    r.return_number.toLowerCase().includes(search.toLowerCase()) ||
    r.purchase_order?.po_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <DashboardPageHeader
        title="PO Returns"
        description="Manage your purchase order returns and refunds"
        icon={<RotateCcw className="w-5 h-5" />}
        rightSlot={
          <button
            onClick={() => router.push('/dashboard/purchase-orders/returns/new')}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl font-semibold text-sm hover:bg-orange-700 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Return
          </button>
        }
      />

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card border border-border p-4 rounded-3xl shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Search by return # or PO #..."
            className="w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-3xl" />)}
        </div>
      ) : filteredReturns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-[32px] border-dashed">
          <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mb-4">
            <RotateCcw className="w-8 h-8 text-muted-foreground opacity-20" />
          </div>
          <p className="text-muted-foreground font-medium text-lg">No returns found</p>
          <p className="text-muted-foreground text-sm">Create a new return to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReturns.map((rtn) => (
            <div 
              key={rtn.id}
              className="group bg-card border border-border rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-orange-500/30 transition-all cursor-pointer relative overflow-hidden"
              onClick={() => router.push(`/dashboard/purchase-orders/returns/${rtn.id}`)}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
              
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-1">
                  <h3 className="font-black text-lg tracking-tight group-hover:text-orange-600 transition-colors">{rtn.return_number}</h3>
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    <FileText className="w-3 h-3" />
                    PO: {rtn.purchase_order?.po_number}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={cn(
                    "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full",
                    rtn.refund_status === 'collected' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {rtn.refund_status || 'pending'}
                  </span>
                  {rtn.refund_status !== 'collected' && (
                    <button
                      onClick={(e) => handleCollect(e, rtn.id)}
                      disabled={collectingId === rtn.id}
                      className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-orange-600 hover:text-orange-700 transition-colors bg-orange-50 px-2 py-1 rounded-lg"
                    >
                      {collectingId === rtn.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      Mark Collected
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-muted/30 p-3 rounded-2xl">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Date</p>
                  <div className="flex items-center gap-1.5 font-bold text-sm">
                    <Calendar className="w-3.5 h-3.5 text-orange-600" />
                    {new Date(rtn.return_date).toLocaleDateString()}
                  </div>
                </div>
                <div className="bg-orange-50 p-3 rounded-2xl">
                  <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1">Total</p>
                  <div className="font-black text-orange-700 text-sm">
                    {rtn.grand_total.toLocaleString()} {currency}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <div className="text-xs text-muted-foreground italic truncate max-w-[150px]">
                  {rtn.reason || 'No reason provided'}
                </div>
                <div className="flex items-center gap-2">
                  {rtn.refund_status === 'collected' && (
                    <span className="text-[9px] font-bold text-muted-foreground uppercase italic">
                      Collected: {new Date(rtn.collected_at!).toLocaleDateString()}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
