'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Printer, 
  Download, 
  Building2, 
  Calendar, 
  User, 
  Hash, 
  Tag, 
  Truck, 
  MessageSquare,
  Package,
  Clock,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { purchaseOrdersApi, downloadFile, type PurchaseOrder } from '@/lib/api';
import { toastError } from '@/lib/toast';
import { cn } from '@/lib/utils';

export default function ViewPurchaseOrderPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const printRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<PurchaseOrder | null>(null);

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

  const handleExportPdf = () => {
    if (!order) return;
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/purchase-orders/${order.id}/pdf`;
    downloadFile(url, `PO-${order.po_number}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (!order) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-100 text-slate-700';
      case 'sent': return 'bg-blue-100 text-blue-700';
      case 'received': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="p-6 max-w-[1000px] mx-auto space-y-8 pb-20">
      {/* Header - Hidden on Print */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div>
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-2 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Orders</span>
          </button>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            Purchase Order Details
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportPdf}
            className="px-6 py-2 bg-orange-600 text-white rounded-xl font-semibold text-sm hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Main PO Card */}
      <div 
        ref={printRef}
        className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden print:border-0 print:shadow-none print:m-0"
      >
        {/* PO Branding/Header */}
        <div className="p-8 border-b border-border bg-muted/20 flex flex-col md:flex-row justify-between gap-8">
           <div className="space-y-4">
              <div className="flex items-center gap-3">
                 <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-600/20">
                    <Package className="w-6 h-6" />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black tracking-tighter uppercase italic">Purchase Order</h2>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{order.po_number}</p>
                 </div>
              </div>
              <div className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                getStatusColor(order.status)
              )}>
                {order.status}
              </div>
           </div>

           <div className="text-right space-y-1">
              <p className="text-sm font-bold text-foreground">Order Date</p>
              <p className="text-lg font-black text-orange-600 uppercase">
                {new Date(order.order_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              {order.vendor_po_number && (
                <p className="text-xs text-muted-foreground">Vendor PO: {order.vendor_po_number}</p>
              )}
           </div>
        </div>

        {/* Addresses */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12 border-b border-border">
           <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-2">From (Buyer)</h3>
              <div className="space-y-2">
                 <p className="text-lg font-black text-foreground uppercase tracking-tight">VYN Salon Management</p>
                 <div className="space-y-1 text-sm text-muted-foreground font-medium">
                    <div className="flex items-center gap-2">
                       <User className="w-3.5 h-3.5 text-orange-600" />
                       <span>PIC: {order.person_in_charge?.name || 'Manager'}</span>
                    </div>
                 </div>
              </div>
           </div>

           <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-2">Vendor (Supplier)</h3>
              <div className="space-y-2">
                 <p className="text-lg font-black text-foreground uppercase tracking-tight">{order.vendor?.name}</p>
                 <div className="space-y-1 text-sm text-muted-foreground font-medium">
                    <div className="flex items-center gap-2">
                       <Building2 className="w-3.5 h-3.5 text-orange-600" />
                       <span>{order.vendor?.code}</span>
                    </div>
                    {order.vendor?.email && <p>{order.vendor.email}</p>}
                    {order.vendor?.phone && <p>{order.vendor.phone}</p>}
                 </div>
              </div>
           </div>
        </div>

        {/* Description */}
        {order.description && (
          <div className="px-8 py-4 bg-muted/5 border-b border-border">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Description / Memo</p>
            <p className="text-sm font-medium text-foreground">{order.description}</p>
          </div>
        )}

        {/* Items Table */}
        <div className="p-0">
           <table className="w-full text-left border-collapse">
              <thead>
                 <tr className="bg-muted/30 border-b border-border">
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Item Description</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center w-24">Qty</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right w-32">Price</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right w-24">Tax</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right w-40">Total</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-border">
                 {order.items?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/5 transition-colors">
                       <td className="px-8 py-5">
                          <p className="font-bold text-foreground">{item.item_name}</p>
                          {item.item_description && <p className="text-[10px] text-muted-foreground mt-1">{item.item_description}</p>}
                       </td>
                       <td className="px-6 py-5 text-center font-bold text-foreground">{item.quantity}</td>
                       <td className="px-6 py-5 text-right font-medium text-muted-foreground">{order.currency} {parseFloat(item.unit_price.toString()).toLocaleString()}</td>
                       <td className="px-6 py-5 text-right font-medium text-muted-foreground">{item.tax_rate}%</td>
                       <td className="px-8 py-5 text-right font-black text-foreground">
                         {order.currency} {parseFloat(item.total.toString()).toLocaleString()}
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>

        {/* Totals Section */}
        <div className="p-8 flex flex-col md:flex-row justify-between gap-12 bg-muted/10">
           <div className="max-w-md flex-1 space-y-6">
              {order.vendor_note && (
                <div className="space-y-2">
                   <div className="flex items-center gap-2 text-orange-600">
                      <MessageSquare className="w-4 h-4" />
                      <h4 className="text-xs font-black uppercase tracking-widest">Vendor Notes</h4>
                   </div>
                   <p className="text-sm text-muted-foreground leading-relaxed italic">{order.vendor_note}</p>
                </div>
              )}
              {order.tags && (
                <div className="flex flex-wrap gap-2">
                  {order.tags.split(',').map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 bg-muted border border-border rounded-md text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
           </div>

           <div className="w-full md:w-80 space-y-3">
              <div className="flex justify-between items-center text-sm">
                 <span className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Subtotal</span>
                 <span className="font-bold text-foreground">{order.currency} {parseFloat(order.subtotal.toString()).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                 <span className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Total Tax</span>
                 <span className="font-bold text-foreground">{order.currency} {parseFloat(order.total_tax.toString()).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                 <span className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Discount</span>
                 <span className="font-bold text-red-600">-{order.currency} {parseFloat(order.total_discount.toString()).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                 <span className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Shipping</span>
                 <span className="font-bold text-foreground">{order.currency} {parseFloat(order.shipping_fee.toString()).toLocaleString()}</span>
              </div>
              <div className="pt-4 border-t-2 border-orange-600/30 flex justify-between items-center">
                 <span className="font-black text-foreground uppercase tracking-tighter">Grand Total</span>
                 <span className="text-3xl font-black text-orange-600 tracking-tighter">{order.currency} {parseFloat(order.grand_total.toString()).toLocaleString()}</span>
              </div>
           </div>
        </div>

        {/* Footer Branding */}
        <div className="p-8 bg-foreground text-background flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-black tracking-widest uppercase">VYN Platform</span>
           </div>
           <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Authorized Purchase Order &copy; {new Date().getFullYear()}</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            margin: 20mm;
          }
        }
      `}</style>
    </div>
  );
}
