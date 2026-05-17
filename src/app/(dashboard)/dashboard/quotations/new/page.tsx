'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Check
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
import { useAuth } from '@/lib/auth-context';

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

export default function NewQuotationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialVendorId = searchParams.get('vendor_id') || '';
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'shipping'>('general');

  // Master Data
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [quotationNumberPreview, setQuotationNumberPreview] = useState('QT-XXXXX-MONTH-YEAR');

  // Form State
  const [vendorId, setVendorId] = useState<string | number>(initialVendorId);
  const [branchId, setBranchId] = useState<string | number>('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [personInChargeId, setPersonInChargeId] = useState<string | number>('');
  const [currency, setCurrency] = useState('AED');
  const [tags, setTags] = useState('');
  const [vendorNote, setVendorNote] = useState('');
  const [status, setStatus] = useState('draft');
  const [items, setItems] = useState<Partial<QuotationItem>[]>([
    { item_name: '', unit_price: 0, quantity: 1, total: 0 }
  ]);

  const [showItemSearch, setShowItemSearch] = useState<number | null>(null);

  useEffect(() => {
    loadInitialData();
  }, [user]);

  const loadInitialData = async () => {
    try {
      const [vRes, pRes, sRes, qRes, setRes, bRes] = await Promise.all([
        vendorsApi.list(),
        productsApi.list({ per_page: 100 }),
        staffApi.list(),
        quotationsApi.list({ per_page: 1 }),
        settingsApi.get(),
        api<any[]>('/api/branches')
      ]);
      
      setLoading(false);
      if (!('error' in setRes)) setCurrency(setRes.data?.salon?.currency || 'AED');
      if (!('error' in bRes)) setBranches(bRes.data || []);
      if (!('error' in vRes)) {
        const vData = (vRes.data as any)?.data || (Array.isArray(vRes.data) ? vRes.data : []);
        setVendors(vData);
      }
      if (!('error' in pRes)) {
        const pData = (pRes.data as any)?.products || (Array.isArray(pRes.data) ? pRes.data : []);
        setProducts(pData);
      }
      if (!('error' in sRes)) {
        const staffList = sRes.data || [];
        setStaff(staffList);
        if (user) {
          const currentStaff = staffList.find(s => String(s.user_id) === String(user.id));
          if (currentStaff) setPersonInChargeId(currentStaff.id);
        }
      }
      
      // Predict next quote number
      const month = new Date().toLocaleString('default', { month: 'short' });
      const year = new Date().getFullYear();
      
      if (!('error' in qRes) && Array.isArray(qRes.data) && qRes.data.length > 0) {
        const lastNum = qRes.data[0].quotation_number;
        const parts = lastNum.split('-');
        if (parts.length >= 2) {
          const sequencePart = parts[1].replace('#', '');
          const count = parseInt(sequencePart) + 1;
          setQuotationNumberPreview(`#QT-${String(count).padStart(5, '0')}-${month}-${year}`);
        } else {
          setQuotationNumberPreview(`#QT-00001-${month}-${year}`);
        }
      } else {
        setQuotationNumberPreview(`#QT-00001-${month}-${year}`);
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to load master data');
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

  const handleSubmit = async (targetStatus: string = 'draft') => {
    if (!vendorId || !date || items.some(i => !i.item_name)) {
      toastError('Please fill in all required fields and item names');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        vendor_id: Number(vendorId),
        description,
        date,
        expiry_date: expiryDate || null,
        person_in_charge_id: personInChargeId ? Number(personInChargeId) : null,
        currency,
        branch_id: branchId ? Number(branchId) : null,
        tags,
        vendor_note: vendorNote,
        status: targetStatus,
        subtotal: totals.subtotal,
        total_tax: totals.totalTax,
        total_discount: totals.totalDiscount,
        grand_total: totals.grandTotal,
        items: items.map(item => ({
          ...item,
          total: calculateItemTotal(item)
        }))
      } as any;

      const res = await quotationsApi.create(payload);
      if ('error' in res) throw new Error(res.error);

      toastSuccess('Quotation created successfully');
      router.push('/dashboard/quotations');
    } catch (err: any) {
      toastError(err.message || 'Failed to create quotation');
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
          <h1 className="text-4xl font-black tracking-tight text-foreground">New Quotation</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Create a pricing proposal from a vendor.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleSubmit('draft')}
            disabled={submitting}
            className="px-6 py-2 bg-muted border border-border text-foreground rounded-xl font-semibold text-sm hover:bg-muted/80 transition-all shadow-sm"
          >
            Save as Draft
          </button>
          <button 
            onClick={() => handleSubmit('valid')}
            disabled={submitting}
            className="px-8 py-2 bg-orange-600 text-white rounded-xl font-semibold text-sm hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Submit Quote
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-8">
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
                <div className="space-y-1.5 opacity-60 grayscale-[0.3]">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Quote Number (Auto)</label>
                  <input
                    readOnly
                    placeholder={quotationNumberPreview}
                    className="w-full px-4 py-2.5 bg-muted/40 border border-border rounded-xl text-muted-foreground font-mono cursor-not-allowed"
                  />
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
          <div className="bg-card border border-border rounded-3xl shadow-sm">
            <div className="px-6 py-4 bg-muted/30 border-b border-border flex justify-between items-center rounded-t-3xl">
               <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-orange-600" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Proposal Items</h3>
               </div>
               <button 
                 onClick={handleAddItem}
                 className="flex items-center gap-2 text-xs font-bold text-orange-600 hover:underline"
               >
                 <Plus className="w-3 h-3" /> Add Product
               </button>
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
                                                    product_id: Number(p.id), 
                                                    item_name: p.name, 
                                                    unit_price: Number(p.cost || p.price || 0)
                                                  });
                                                  setShowItemSearch(null);
                                                }}
                                                className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted rounded-lg transition-colors group/item"
                                              >
                                                 <div className="flex flex-col">
                                                   <span className="text-xs font-bold text-foreground group-hover/item:text-orange-600 transition-colors">{p.name}</span>
                                                   <span className="text-[10px] text-muted-foreground">{p.sku || ''}</span>
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
                           <button 
                             onClick={() => handleRemoveItem(idx)}
                             className="p-1 text-muted-foreground hover:text-red-600 transition-all"
                           >
                              <Trash2 className="w-3.5 h-3.5" />
                           </button>
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

              <div className="mt-8 p-4 bg-muted/30 rounded-2xl border border-border flex items-start gap-3">
                 <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                 <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Once this quotation is approved, you can convert it into a formal Purchase Order with a single click.
                 </p>
              </div>
           </div>

           <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
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
