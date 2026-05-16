'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Building2, 
  Calendar, 
  User, 
  Tag, 
  Truck, 
  MessageSquare,
  Search,
  ChevronRight,
  Settings2,
  AlertCircle,
  Loader2,
  Hash,
  Clock,
  Check,
  ArrowRightLeft
} from 'lucide-react';
import { 
  vendorsApi, 
  type Vendor, 
  productsApi, 
  type Product,
  staffApi,
  type StaffMember,
  quotationsApi,
  type Quotation,
  type QuotationItem,
  settingsApi,
  api
} from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { cn } from '@/lib/utils';

// Reusable SearchableSelect component
function SearchableSelect({ 
  options, 
  value, 
  onChange, 
  placeholder, 
  icon: Icon,
  label,
  className = ""
}: { 
  options: { id: string | number, label: string }[], 
  value: string | number, 
  onChange: (val: string | number) => void,
  placeholder: string,
  icon?: any,
  label?: string,
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const filteredOptions = options.filter(o => 
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedLabel = options.find(o => String(o.id) === String(value))?.label || placeholder;

  return (
    <div className={cn("space-y-1.5 relative", className)}>
      {label && <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/20 border border-border rounded-xl text-sm text-left hover:bg-muted/30 transition-all focus:ring-2 focus:ring-orange-500/20"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {Icon && <Icon className="w-4 h-4 text-muted-foreground shrink-0" />}
            <span className={cn("truncate font-medium", !value && "text-muted-foreground")}>
              {selectedLabel}
            </span>
          </div>
          <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
        </button>

        {isOpen && (
          <div className="absolute z-[60] top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-2 border-b border-border bg-muted/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  autoFocus
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto p-1">
              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No matches found</div>
              ) : (
                filteredOptions.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={cn(
                      "w-full px-4 py-2.5 text-left text-sm rounded-xl transition-all flex items-center justify-between group",
                      String(opt.id) === String(value) ? "bg-orange-50 text-orange-600 font-bold" : "hover:bg-muted"
                    )}
                  >
                    {opt.label}
                    {String(opt.id) === String(value) && <div className="w-1.5 h-1.5 bg-orange-600 rounded-full shadow-sm shadow-orange-600/50" />}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {isOpen && <div className="fixed inset-0 z-50 bg-transparent" onClick={() => setIsOpen(false)} />}
    </div>
  );
}

export default function EditQuotationPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'shipping'>('general');

  // Master Data
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [quotationNumber, setQuotationNumber] = useState('');

  // Form State
  const [vendorId, setVendorId] = useState<string | number>('');
  const [branchId, setBranchId] = useState<string | number>('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [personInChargeId, setPersonInChargeId] = useState<string | number>('');
  const [currency, setCurrency] = useState('AED');
  const [tags, setTags] = useState('');
  const [vendorNote, setVendorNote] = useState('');
  const [status, setStatus] = useState('draft');
  const [items, setItems] = useState<Partial<QuotationItem>[]>([]);

  const [showItemSearch, setShowItemSearch] = useState<number | null>(null);

  useEffect(() => {
    loadInitialData();
  }, [id]);

  const loadInitialData = async () => {
    try {
      const [vRes, pRes, sRes, oRes, setRes, bRes] = await Promise.all([
        vendorsApi.list(),
        productsApi.list({ per_page: 100 }),
        staffApi.list(),
        quotationsApi.get(id),
        settingsApi.get(),
        api<any[]>('/api/branches')
      ]);
      
      setLoading(false);
      if (!('error' in setRes) && !currency) setCurrency(setRes.data?.salon?.currency || 'AED');
      if (!('error' in vRes)) {
        const vData = (vRes.data as any)?.data || (Array.isArray(vRes.data) ? vRes.data : []);
        setVendors(vData);
      }
      if (!('error' in pRes)) {
        const pData = (pRes.data as any)?.products || (Array.isArray(pRes.data) ? pRes.data : []);
        setProducts(pData);
      }
      if (!('error' in sRes)) setStaff(sRes.data || []);
      if (!('error' in bRes)) setBranches(bRes.data || []);
      
      if (!('error' in oRes)) {
        const q = oRes.data as any;
        if (q) {
          setQuotationNumber(q.quotation_number);
          setVendorId(q.vendor_id);
          setDescription(q.description || '');
          setDate(q.date);
          setExpiryDate(q.expiry_date || '');
          setPersonInChargeId(q.person_in_charge_id || '');
          setBranchId(q.branch_id || '');
          setCurrency(q.currency);
          setTags(q.tags || '');
          setVendorNote(q.vendor_note || '');
          setStatus(q.status === 'pending' ? 'valid' : q.status);
          setItems(q.items || []);
        }
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to load data');
      setLoading(false);
    }
  };

  const calculateItemTotal = (item: Partial<QuotationItem>) => {
    const qty = parseFloat(item.quantity?.toString() || '0');
    const price = parseFloat(item.unit_price?.toString() || '0');
    const taxRate = parseFloat(item.tax_rate?.toString() || '0');
    const discount = parseFloat(item.discount_percentage?.toString() || '0');

    const subtotal = qty * price;
    const discountVal = subtotal * (discount / 100);
    const taxable = subtotal - discountVal;
    const taxVal = taxable * (taxRate / 100);
    
    return taxable + taxVal;
  };

  const updateItem = (index: number, updates: Partial<QuotationItem>) => {
    const newItems = [...items];
    const item = { ...newItems[index], ...updates };
    item.total = calculateItemTotal(item);
    newItems[index] = item;
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([...items, { item_name: '', unit_price: 0, quantity: 1, total: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const totals = items.reduce((acc, item) => {
    const subtotal = parseFloat(item.quantity?.toString() || '0') * parseFloat(item.unit_price?.toString() || '0');
    const discount = subtotal * (parseFloat(item.discount_percentage?.toString() || '0') / 100);
    const taxable = subtotal - discount;
    const tax = taxable * (parseFloat(item.tax_rate?.toString() || '0') / 100);
    
    return {
      subtotal: acc.subtotal + subtotal,
      totalTax: acc.totalTax + tax,
      totalDiscount: acc.totalDiscount + discount,
      grandTotal: acc.grandTotal + (taxable + tax)
    };
  }, { subtotal: 0, totalTax: 0, totalDiscount: 0, grandTotal: 0 });

  const handleSubmit = async (targetStatus?: string) => {
    if (!vendorId || !date || items.some(i => !i.item_name)) {
      toastError('Please fill in all required fields and item names');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        vendor_id: vendorId,
        description,
        date,
        expiry_date: expiryDate || null,
        person_in_charge_id: personInChargeId || null,
        branch_id: branchId || null,
        currency,
        tags,
        vendor_note: vendorNote,
        status: targetStatus || status,
        subtotal: totals.subtotal,
        total_tax: totals.totalTax,
        total_discount: totals.totalDiscount,
        grand_total: totals.grandTotal,
        items: items.map(item => ({
          ...item,
          total: calculateItemTotal(item)
        }))
      };

      const res = await quotationsApi.update(id, payload);
      if ('error' in res) throw new Error(res.error);

      toastSuccess('Quotation updated successfully');
      router.push('/dashboard/quotations');
    } catch (err: any) {
      toastError(err.message || 'Failed to update quotation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertToPo = async () => {
    if (!confirm('Convert this quotation into a Purchase Order?')) return;
    
    setSubmitting(true);
    try {
      const res = await quotationsApi.convertToPo(id);
      if ('error' in res) throw new Error(res.error);
      toastSuccess('Converted to PO successfully');
      router.push('/dashboard/purchase-orders');
    } catch (err: any) {
      toastError(err.message || 'Conversion failed');
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

  const isConverted = status === 'converted';

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-2 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Quotations</span>
          </button>
          <h1 className="text-4xl font-black tracking-tight text-foreground flex items-center gap-4">
             Edit Quotation
             <span className="text-sm font-bold px-3 py-1 bg-orange-100 text-orange-600 rounded-full">{quotationNumber}</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Modify vendor pricing proposal and track status.</p>
        </div>

        <div className="flex items-center gap-3">
          {status === 'approved' && (
            <button 
              onClick={handleConvertToPo}
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Convert to PO
            </button>
          )}
          
          <button 
            onClick={() => handleSubmit()}
            disabled={submitting || isConverted}
            className="px-8 py-2 bg-orange-600 text-white rounded-xl font-semibold text-sm hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isConverted ? 'Converted' : 'Update Quote'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className={cn("bg-card border border-border rounded-3xl p-6 shadow-sm space-y-8", isConverted && "opacity-70 pointer-events-none")}>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Description *</label>
                  <input
                    placeholder="e.g. Salon Equipment Proposal"
                    className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Status</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <select
                      className="w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20 appearance-none"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="draft">Draft</option>
                      <option value="valid">Valid</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      {isConverted && <option value="converted">Converted to PO</option>}
                    </select>
                  </div>
                </div>
                
                <SearchableSelect 
                  label="Vendor *"
                  icon={Building2}
                  placeholder="Select Vendor"
                  options={vendors.map(v => ({ id: v.id, label: `${v.name} (${v.code})` }))}
                  value={vendorId}
                  onChange={setVendorId}
                />

                <SearchableSelect 
                  label="Branch / Location *"
                  icon={Settings2}
                  placeholder="Select Branch"
                  options={branches.map(b => ({ id: b.id, label: b.name }))}
                  value={branchId}
                  onChange={setBranchId}
                />

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Tags</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      placeholder="e.g. Q2, Bulk, Urgent"
                      className="w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 opacity-70">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Currency</label>
                  <div className="relative">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-orange-600">{currency}</span>
                     <input
                        readOnly
                        value={currency}
                        className="w-full pl-12 pr-4 py-2.5 bg-muted/40 border border-border rounded-xl text-muted-foreground font-bold cursor-not-allowed"
                     />
                  </div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Quote Date *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="date"
                      className="w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Expiry Date</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="date"
                      className="w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  </div>
                </div>
                
                <SearchableSelect 
                  label="Assigned To"
                  icon={User}
                  placeholder="Select Employee"
                  options={staff.map(s => ({ id: s.id, label: s.name }))}
                  value={personInChargeId}
                  onChange={setPersonInChargeId}
                />
             </div>
          </div>

          {/* Items Section */}
          <div className={cn("bg-card border border-border rounded-3xl shadow-sm", isConverted && "opacity-70 pointer-events-none")}>
            <div className="px-6 py-4 bg-muted/30 border-b border-border flex justify-between items-center rounded-t-3xl">
               <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-orange-600" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Proposal Items</h3>
               </div>
               {!isConverted && (
                 <button 
                   onClick={handleAddItem}
                   className="flex items-center gap-2 text-xs font-bold text-orange-600 hover:underline"
                 >
                   <Plus className="w-3 h-3" /> Add Product
                 </button>
               )}
            </div>
            <div className="">
               <table className="w-full text-left border-collapse">
                  <thead className="bg-muted/10 border-b border-border">
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3 min-w-[200px]">Product / Item</th>
                      <th className="px-4 py-3 w-32">Unit Price</th>
                      <th className="px-4 py-3 w-24">Qty</th>
                      <th className="px-4 py-3 w-24 text-right">Total</th>
                      <th className="px-4 py-3 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item, idx) => (
                      <tr key={idx} className="group hover:bg-muted/5 transition-colors">
                        <td className="px-4 py-3">
                           <div className="relative">
                              <input
                                placeholder="Start typing product name..."
                                className="w-full px-3 py-2 bg-muted/10 border border-border rounded-lg text-sm focus:ring-1 focus:ring-orange-500/30"
                                value={item.item_name || ''}
                                onChange={(e) => updateItem(idx, { item_name: e.target.value })}
                                onFocus={() => setShowItemSearch(idx)}
                              />
                              {showItemSearch === idx && (
                                 <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                     <div className="max-h-60 overflow-y-auto p-1">
                                        {products.filter(p => p.name.toLowerCase().includes((item.item_name || '').toLowerCase())).length === 0 ? (
                                           <div className="p-4 text-center text-[10px] text-muted-foreground italic">No products found</div>
                                        ) : (
                                          products
                                            .filter(p => p.name.toLowerCase().includes((item.item_name || '').toLowerCase()))
                                            .map(p => (
                                              <button 
                                                key={p.id}
                                                type="button"
                                                onClick={() => {
                                                  updateItem(idx, { 
                                                    product_id: p.id, 
                                                    item_name: p.name, 
                                                    unit_price: Number(p.cost || p.price || 0)
                                                  });
                                                  setShowItemSearch(null);
                                                }}
                                                className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted rounded-lg transition-colors group/item"
                                              >
                                                 <div className="flex flex-col">
                                                   <span className="text-xs font-bold text-foreground group-hover/item:text-orange-600 transition-colors">{p.name}</span>
                                                   <span className="text-[10px] text-muted-foreground">{p.sku || p.code}</span>
                                                 </div>
                                                 <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-md">{currency} {Number(p.cost || p.price || 0).toLocaleString()}</span>
                                              </button>
                                           ))
                                        )}
                                     </div>
                                 </div>
                              )}
                           </div>
                        </td>
                        <td className="px-4 py-3">
                           <input
                             type="number"
                             className="w-full px-3 py-2 bg-muted/10 border border-border rounded-lg text-sm focus:ring-1 focus:ring-orange-500/30"
                             value={item.unit_price || 0}
                             onChange={(e) => updateItem(idx, { unit_price: parseFloat(e.target.value) || 0 })}
                           />
                        </td>
                        <td className="px-4 py-3">
                           <input
                             type="number"
                             className="w-full px-3 py-2 bg-muted/10 border border-border rounded-lg text-sm focus:ring-1 focus:ring-orange-500/30"
                             value={item.quantity || 0}
                             onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                           />
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-foreground">
                           {currency} {(item.total || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                           {!isConverted && (
                             <button 
                               onClick={() => handleRemoveItem(idx)}
                               className="p-1 text-muted-foreground hover:text-red-600 transition-all"
                             >
                                <Trash2 className="w-3.5 h-3.5" />
                             </button>
                           )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
        </div>

        {/* Totals Summary */}
        <div className="space-y-6">
           <div className="bg-card border border-border rounded-3xl p-6 shadow-sm sticky top-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-6">Quotation Summary</h3>
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">{currency} {totals.subtotal.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Estimated Tax</span>
                    <span className="font-semibold">{currency} {totals.totalTax.toLocaleString()}</span>
                 </div>
                 <div className="pt-4 border-t border-border flex justify-between items-center">
                    <span className="font-bold text-foreground uppercase tracking-wider text-xs">Grand Total</span>
                    <span className="text-xl font-black text-orange-600">{currency} {totals.grandTotal.toLocaleString()}</span>
                 </div>
              </div>

              {isConverted ? (
                <div className="mt-8 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex flex-col gap-2">
                   <div className="flex items-center gap-2 text-blue-600">
                     <ArrowRightLeft className="w-4 h-4" />
                     <span className="text-xs font-bold uppercase">Converted to PO</span>
                   </div>
                   <p className="text-[10px] text-blue-700 leading-relaxed">
                      This quotation has been finalized and converted into a Purchase Order. Editing is disabled.
                   </p>
                </div>
              ) : (
                <div className="mt-8 p-4 bg-muted/30 rounded-2xl border border-border flex items-start gap-3">
                   <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                   <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Update the proposal details. If approved, use the 'Convert to PO' button above.
                   </p>
                </div>
              )}
           </div>

           <div className={cn("bg-card border border-border rounded-3xl p-6 shadow-sm", isConverted && "opacity-70 pointer-events-none")}>
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-orange-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notes</h3>
              </div>
              <textarea
                rows={4}
                placeholder="Internal notes or vendor instructions..."
                className="w-full px-4 py-2 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20 text-sm"
                value={vendorNote}
                onChange={(e) => setVendorNote(e.target.value)}
              />
           </div>
        </div>
      </div>
      {showItemSearch !== null && <div className="fixed inset-0 z-40" onClick={() => setShowItemSearch(null)} />}
    </div>
  );
}
