'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Building2, 
  ChevronRight,
  Edit2,
  Trash2,
  Send,
  CheckCircle,
  Clock,
  Ban,
  FileDown,
  ArrowRightLeft,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { quotationsApi, type Quotation } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { Skeleton } from '@/components/ui/skeleton';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import Link from 'next/link';

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadQuotations = async () => {
    setLoading(true);
    const res = await quotationsApi.list();
    setLoading(false);
    if ('error' in res) {
      toastError(res.error || 'Failed to load quotations');
    } else {
      setQuotations((res.data && 'data' in res.data ? (res.data as any).data : res.data) || []);
    }
  };

  useEffect(() => {
    loadQuotations();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Clock className="w-3.5 h-3.5 text-slate-500" />;
      case 'valid': return <Send className="w-3.5 h-3.5 text-blue-500" />;
      case 'approved': return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
      case 'rejected': return <Ban className="w-3.5 h-3.5 text-red-500" />;
      case 'converted': return <ArrowRightLeft className="w-3.5 h-3.5 text-orange-600" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-100 text-slate-700';
      case 'valid': return 'bg-blue-100 text-blue-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'converted': return 'bg-orange-100 text-orange-700';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleConvertToPo = async (id: number) => {
    if (!confirm('Are you sure you want to convert this quotation to a Purchase Order?')) return;
    
    try {
      const res = await quotationsApi.convertToPo(id);
      if ('error' in res) throw new Error(res.error);
      toastSuccess('Quotation converted to PO successfully');
      loadQuotations();
    } catch (err: any) {
      toastError(err.message || 'Failed to convert quotation');
    }
  };

  const filteredQuotations = quotations.filter(q => 
    q.quotation_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-8 pb-20">
      <DashboardPageHeader
        title="Quotations"
        description="Manage vendor pricing proposals and convert them to purchase orders."
        icon={<FileText className="w-6 h-6" />}
        rightSlot={
          <Link 
            href="/dashboard/quotations/new"
            className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/20"
          >
            <Plus className="w-4 h-4" />
            New Quotation
          </Link>
        }
      />

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-muted/30 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              placeholder="Search by quote number or vendor..."
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-xl text-xs font-bold hover:bg-muted transition-all">
              <Filter className="w-3.5 h-3.5" />
              Filter
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-xl text-xs font-bold hover:bg-muted transition-all text-muted-foreground">
              <FileDown className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredQuotations.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <FileText className="w-10 h-10 text-muted-foreground opacity-20" />
            </div>
            <h3 className="text-lg font-bold text-foreground">No Quotations Found</h3>
            <p className="text-muted-foreground mt-1 max-w-xs mx-auto text-sm">
              Start by creating your first vendor quotation to track pricing proposals.
            </p>
            <Link 
              href="/dashboard/quotations/new"
              className="mt-6 text-orange-600 font-bold hover:underline text-sm"
            >
              Create New Quotation
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quote Number</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Vendor</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredQuotations.map((q) => (
                  <tr key={q.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground">{q.quotation_number}</span>
                        <span className="text-[10px] text-muted-foreground italic line-clamp-1">{q.description || 'No description'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col">
                           <span className="text-sm font-semibold text-foreground">{q.vendor?.name}</span>
                           <span className="text-[10px] text-muted-foreground">{q.vendor?.code}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                             <Calendar className="w-3.5 h-3.5" />
                             {new Date(q.date).toLocaleDateString()}
                          </div>
                          {q.expiry_date && (
                            <span className="text-[10px] text-red-500 mt-0.5">Expires: {new Date(q.expiry_date).toLocaleDateString()}</span>
                          )}
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground">{q.currency} {parseFloat(q.grand_total.toString()).toLocaleString()}</span>
                          <span className="text-[10px] text-muted-foreground">{q.items_count ?? q.items?.length ?? 0} items</span>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusColor(q.status)}`}>
                          {getStatusIcon(q.status)}
                          {q.status}
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {q.status === 'approved' && (
                            <button 
                              onClick={() => handleConvertToPo(q.id)}
                              className="p-1.5 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-all"
                              title="Convert to Purchase Order"
                            >
                               <ArrowRightLeft className="w-4 h-4" />
                            </button>
                          )}
                          {q.status === 'converted' && q.converted_to_po_id && (
                            <Link 
                              href={`/dashboard/purchase-orders`}
                              className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all"
                              title="View PO"
                            >
                               <FileText className="w-4 h-4" />
                            </Link>
                          )}
                          {q.status !== 'converted' && (
                            <Link 
                              href={`/dashboard/quotations/${q.id}/edit`}
                              className="p-1.5 hover:bg-muted rounded-lg transition-all"
                              title="Edit Quotation"
                            >
                               <Edit2 className="w-4 h-4" />
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
