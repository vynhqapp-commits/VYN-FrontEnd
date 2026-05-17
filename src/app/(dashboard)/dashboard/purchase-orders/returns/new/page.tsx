'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  RotateCcw,
  Calendar,
  Building2,
  Package,
  Plus,
  Trash2,
  FileText,
  AlertCircle,
  Loader2,
  ChevronDown,
  Search,
  Check
} from 'lucide-react';
import { 
  purchaseOrdersApi, 
  purchaseOrderReturnsApi,
  settingsApi,
  type PurchaseOrder,
  type PurchaseOrderItem,
  api
} from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { cn } from '@/lib/utils';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

import { useRef } from 'react';

function SearchableSelect({ 
  label, 
  options, 
  value, 
  onChange, 
  placeholder = "Select an option...",
  icon: Icon
}: { 
  label: string, 
  options: { id: string | number, label: string }[], 
  value: string | number, 
  onChange: (val: string | number) => void,
  placeholder?: string,
  icon?: any
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
  const selectedLabel = options.find(o => String(o.id) === String(value))?.label || placeholder;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-1.5 relative" ref={containerRef}>
      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">{label}</label>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20 text-sm transition-all hover:bg-muted/30"
      >
        <div className="flex items-center gap-2 truncate">
          {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
          <span className={cn(value ? "text-foreground font-semibold" : "text-muted-foreground")}>{selectedLabel}</span>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-[60] top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-2 border-b border-border bg-muted/10">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input 
                autoFocus
                placeholder="Search..." 
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-transparent border-none focus:ring-0 outline-none" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">No options found</div>
            ) : filtered.map(o => (
              <button 
                key={o.id}
                type="button"
                onClick={() => { onChange(o.id); setIsOpen(false); setSearch(''); }}
                className={cn(
                  "w-full flex items-center px-4 py-2.5 text-left text-sm hover:bg-orange-50 hover:text-orange-600 transition-colors border-b border-border last:border-0",
                  String(o.id) === String(value) && "bg-orange-50 text-orange-600 font-bold"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewPurchaseOrderReturnPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPoId, setSelectedPoId] = useState<string | number>('');
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [currency, setCurrency] = useState('USD');
  
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [returnItems, setReturnItems] = useState<{
    purchase_order_item_id: number;
    item_name: string;
    product_id: number;
    bought_quantity: number;
    remaining_quantity: number;
    quantity: number;
    unit_price: number;
  }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [poRes, setRes] = await Promise.all([
      purchaseOrdersApi.list({ per_page: 100 }),
      settingsApi.get()
    ]);
    setLoading(false);
    
    if (!('error' in poRes)) {
      const data = (poRes.data as any).data || poRes.data || [];
      setPurchaseOrders(data);
    }
    if (!('error' in setRes)) {
      setCurrency(setRes.data?.salon?.currency || 'USD');
    }
  };

  const handlePoChange = async (id: string | number) => {
    setSelectedPoId(id);
    if (!id) {
      setSelectedPo(null);
      setReturnItems([]);
      return;
    }

    setLoading(true);
    const res = await purchaseOrdersApi.get(id);
    setLoading(false);
    
    if (!('error' in res)) {
      const po = res.data || null;
      setSelectedPo(po);
      if (!po) return;
      
      // For each item in PO, we need to know how many already returned
      // This is a bit expensive to do one by one, usually backend should provide remaining_quantity
      // But let's do a quick hack by fetching returns for this PO
      const rtnRes = await purchaseOrderReturnsApi.list({ purchase_order_id: Number(id) });
      const returns = !('error' in rtnRes) ? ((rtnRes.data as any).data || rtnRes.data || []) : [];
      
      const items = (po.items || []).map(poItem => {
        const alreadyReturned = returns.reduce((sum: number, rtn: any) => {
          const rtnItem = (rtn.items || []).find((ri: any) => ri.purchase_order_item_id === poItem.id);
          return sum + (rtnItem ? Number(rtnItem.quantity) : 0);
        }, 0);
        
        return {
          purchase_order_item_id: poItem.id || 0,
          item_name: poItem.item_name,
          product_id: poItem.product_id || 0,
          bought_quantity: Number(poItem.quantity),
          remaining_quantity: Number(poItem.quantity) - alreadyReturned,
          quantity: 0,
          unit_price: Number(poItem.unit_price)
        };
      });
      
      setReturnItems(items);
    }
  };

  const updateItemQuantity = (idx: number, qty: number) => {
    const newItems = [...returnItems];
    const item = newItems[idx];
    
    if (qty > item.remaining_quantity) {
      toastError(`Cannot return more than remaining (${item.remaining_quantity})`);
      return;
    }
    
    item.quantity = qty;
    setReturnItems(newItems);
  };

  const totals = useMemo(() => {
    return returnItems.reduce((acc, item) => {
      const total = item.quantity * item.unit_price;
      return acc + total;
    }, 0);
  }, [returnItems]);

  const handleSubmit = async () => {
    const itemsToReturn = returnItems.filter(i => i.quantity > 0);
    if (itemsToReturn.length === 0) {
      toastError('Please select at least one item to return');
      return;
    }

    setSubmitting(true);
    const payload = {
      purchase_order_id: selectedPoId,
      return_date: returnDate,
      reason,
      items: itemsToReturn.map(i => ({
        purchase_order_item_id: i.purchase_order_item_id,
        quantity: i.quantity
      }))
    };

    const res = await purchaseOrderReturnsApi.create(payload);
    setSubmitting(false);

    if (!('error' in res)) {
      toastSuccess('Return created successfully');
      router.push('/dashboard/purchase-orders/returns');
    } else {
      toastError(res.error || 'Failed to create return');
    }
  };

  if (loading && !selectedPo) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <DashboardPageHeader
        title="Create PO Return"
        description="Select a PO and specify return quantities"
        icon={<RotateCcw className="w-5 h-5" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: PO Selection & Basic Info */}
        <div className="space-y-6">
           <div className="bg-card border border-border rounded-[32px] p-6 shadow-sm space-y-6">
              <div className="space-y-1.5">
                <SearchableSelect
                  label="Select Purchase Order *"
                  placeholder="Select an order..."
                  icon={Package}
                  options={purchaseOrders.map(po => ({ 
                    id: po.id, 
                    label: `${po.po_number} - ${po.vendor?.name}` 
                  }))}
                  value={selectedPoId}
                  onChange={handlePoChange}
                />
              </div>

              {selectedPo && (
                 <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 space-y-3 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-2 text-orange-700 font-bold text-sm">
                       <Building2 className="w-4 h-4" />
                       {selectedPo.vendor?.name}
                    </div>
                    <div className="flex justify-between text-xs font-bold text-orange-600/70">
                       <span>PO Date: {new Date(selectedPo.order_date).toLocaleDateString()}</span>
                       <span>Total: {selectedPo.grand_total.toLocaleString()} {currency}</span>
                    </div>
                 </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Return Date *</label>
                <div className="relative group">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-orange-500 transition-colors" />
                  <input
                    type="date"
                    className="w-full pl-10 pr-4 py-3 bg-muted/20 border border-border rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all font-bold text-sm"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Reason for Return</label>
                <textarea
                  placeholder="e.g. Damaged items, wrong quantity..."
                  className="w-full px-4 py-3 bg-muted/20 border border-border rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all min-h-[120px] font-medium text-sm"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
           </div>
        </div>

        {/* Right Col: Items Table */}
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-card border border-border rounded-[32px] overflow-hidden shadow-sm flex flex-col min-h-[500px]">
              <div className="px-6 py-4 bg-muted/30 border-b border-border flex justify-between items-center">
                 <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                    <Package className="w-4 h-4 text-orange-600" />
                    Items to Return
                 </h3>
                 <div className="px-3 py-1 bg-white border border-border rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {returnItems.length} Products Available
                 </div>
              </div>

              <div className="flex-1 overflow-auto p-6">
                 {!selectedPo ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                       <div className="w-20 h-20 bg-muted rounded-3xl flex items-center justify-center">
                          <Package className="w-10 h-10" />
                       </div>
                       <div className="max-w-[200px]">
                          <p className="font-bold">Select a Purchase Order</p>
                          <p className="text-xs font-medium">Items will appear here once an order is selected</p>
                       </div>
                    </div>
                 ) : (
                    <table className="w-full">
                       <thead>
                          <tr className="border-b border-border">
                             <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Product</th>
                             <th className="text-center py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Bought</th>
                             <th className="text-center py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Remaining</th>
                             <th className="text-right py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Return Qty</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-border/50">
                          {returnItems.map((item, idx) => (
                             <tr key={idx} className="group hover:bg-muted/10 transition-colors">
                                <td className="py-4">
                                   <p className="font-bold text-sm">{item.item_name}</p>
                                   <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mt-0.5">{item.unit_price} {currency} / unit</p>
                                </td>
                                <td className="py-4 text-center">
                                   <span className="px-2 py-1 bg-muted rounded-lg text-xs font-black">{item.bought_quantity}</span>
                                </td>
                                <td className="py-4 text-center">
                                   <span className={cn(
                                      "px-2 py-1 rounded-lg text-xs font-black",
                                      item.remaining_quantity > 0 ? "bg-orange-50 text-orange-600" : "bg-red-50 text-red-600"
                                   )}>
                                      {item.remaining_quantity}
                                   </span>
                                </td>
                                <td className="py-4 text-right">
                                   <input
                                     type="number"
                                     step="1"
                                     min="0"
                                     max={item.remaining_quantity}
                                     className={cn(
                                        "w-24 px-3 py-2 bg-white border border-border rounded-xl text-right font-black text-sm focus:ring-4 focus:ring-orange-500/10 outline-none transition-all",
                                        item.quantity > 0 ? "border-orange-500 text-orange-600 ring-4 ring-orange-500/5" : ""
                                     )}
                                     value={item.quantity || ''}
                                     onChange={(e) => updateItemQuantity(idx, Number(e.target.value))}
                                     placeholder="0"
                                   />
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 )}
              </div>

              <div className="p-8 bg-muted/30 border-t border-border mt-auto">
                 <div className="flex justify-between items-end">
                    <div className="space-y-1">
                       <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estimated Credit</p>
                       <p className="text-3xl font-black tracking-tighter text-foreground">{totals.toLocaleString()} <span className="text-sm font-bold text-muted-foreground ml-1">{currency}</span></p>
                    </div>
                    <button
                      disabled={submitting || totals === 0}
                      onClick={handleSubmit}
                      className={cn(
                        "px-8 py-4 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 shadow-xl shadow-orange-600/20 hover:bg-orange-700 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:pointer-events-none disabled:shadow-none",
                        submitting && "animate-pulse"
                      )}
                    >
                       {submitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                       ) : (
                          <Check className="w-4 h-4" />
                       )}
                       {submitting ? "Processing..." : "Create Return"}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
