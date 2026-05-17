'use client';

import { useEffect, useState } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Building2, 
  ChevronRight,
  MoreVertical,
  Edit2,
  Eye,
  Trash2,
  Send,
  CheckCircle,
  Clock,
  Ban,
  DollarSign,
  History,
  Boxes,
  RotateCcw
} from 'lucide-react';
import { purchaseOrdersApi, downloadFile, type PurchaseOrder } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { Skeleton } from '@/components/ui/skeleton';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import Link from 'next/link';

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    const res = await purchaseOrdersApi.list();
    setLoading(false);
    if ('error' in res) {
      toastError(res.error || 'Failed to load purchase orders');
    } else {
      setOrders((res.data && 'data' in res.data ? (res.data as any).data : res.data) || []);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Clock className="w-3.5 h-3.5 text-slate-500" />;
      case 'sent': return <Send className="w-3.5 h-3.5 text-blue-500" />;
      case 'received': return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
      case 'cancelled': return <Ban className="w-3.5 h-3.5 text-red-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-zinc-800 text-zinc-400 border border-zinc-700';
      case 'sent': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'received': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default: return 'bg-zinc-900 text-zinc-500 border border-zinc-800';
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'unpaid': return <Clock className="w-3.5 h-3.5 text-red-400" />;
      case 'partial': return <Clock className="w-3.5 h-3.5 text-orange-400" />;
      case 'paid': return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
      default: return null;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'unpaid': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'partial': return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'paid': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      default: return 'bg-zinc-900 text-zinc-500 border border-zinc-800';
    }
  };

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Purchase Orders"
        icon={<FileText className="w-5 h-5" />}
        rightSlot={
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/purchase-orders/returns"
              className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl font-bold text-sm hover:bg-zinc-800 hover:text-zinc-100 transition-all shadow-xl group"
            >
              <RotateCcw className="w-4 h-4 text-zinc-500 group-hover:text-orange-500 transition-colors" />
              Returns History
            </Link>
            <Link
              href="/dashboard/purchase-orders/new"
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-orange-950 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-orange-400 transition-all shadow-lg shadow-orange-500/20"
            >
              <Plus className="w-4 h-4" />
              Add Purchase Order
            </Link>
          </div>
        }
      />

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', count: orders.length, color: 'orange' },
          { label: 'Drafts', count: orders.filter(o => o.status === 'draft').length, color: 'slate' },
          { label: 'Sent', count: orders.filter(o => o.status === 'sent').length, color: 'blue' },
          { label: 'Received', count: orders.filter(o => o.status === 'received').length, color: 'green' },
        ].map((stat, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-foreground">{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search PO number or vendor..."
            className="w-full pl-10 pr-4 py-2 bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-semibold hover:bg-muted transition-colors">
          <Filter className="w-4 h-4" /> Filters
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : orders.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 opacity-20">
               <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No purchase orders found</h3>
            <p className="text-sm text-muted-foreground mb-6">Create your first PO to start managing supplier inventory.</p>
            <Link href="/dashboard/purchase-orders/new" className="text-orange-600 font-bold hover:underline">
               + Create New PO
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">PO Number</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Vendor</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Order Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payment</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground">{o.po_number}</span>
                        <span className="text-[10px] text-muted-foreground italic line-clamp-1">{o.description || 'No description'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col">
                           <span className="text-sm font-semibold text-foreground">{o.vendor?.name}</span>
                           <span className="text-[10px] text-muted-foreground">{o.vendor?.code}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(o.order_date).toLocaleDateString()}
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground">{o.currency} {parseFloat(o.grand_total.toString()).toLocaleString()}</span>
                          <span className="text-[10px] text-muted-foreground">{o.items_count ?? o.items?.length ?? 0} items</span>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(o.status)}`}>
                          {getStatusIcon(o.status)}
                          {o.status}
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getPaymentStatusColor(o.payment_status)}`}>
                          {getPaymentStatusIcon(o.payment_status)}
                          {o.payment_status}
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">

                           <Link 
                             href={`/dashboard/purchase-orders/${o.id}`}
                             className="p-1.5 hover:bg-slate-50 hover:text-slate-600 rounded-lg transition-all"
                             title="View Details"
                           >
                              <Eye className="w-4 h-4" />
                           </Link>
                          <Link 
                            href={`/dashboard/purchase-orders/${o.id}/edit`}
                            className="p-1.5 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-all"
                            title="Edit Order"
                          >
                             <Edit2 className="w-4 h-4" />
                          </Link>
                          <Link 
                            href={`/dashboard/purchase-orders/${o.id}/payment`}
                            className="p-1.5 hover:bg-green-50 hover:text-green-600 rounded-lg transition-all"
                            title="Add Payment"
                          >
                             <DollarSign className="w-4 h-4" />
                          </Link>
                          <Link 
                            href={`/dashboard/purchase-orders/${o.id}/transactions`}
                            className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all"
                            title="Payment History"
                          >
                             <History className="w-4 h-4" />
                          </Link>
                          {o.status === 'received' && (
                            <Link 
                              href={`/dashboard/inventory`}
                              className="p-1.5 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-all"
                              title="View Stock Movements"
                            >
                               <Boxes className="w-4 h-4" />
                            </Link>
                          )}
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
