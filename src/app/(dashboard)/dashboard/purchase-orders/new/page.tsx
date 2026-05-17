'use client';

import { useEffect, useState, useMemo } from 'react';
import { 
  FileText, 
  ChevronLeft, 
  Calendar, 
  User, 
  Building2, 
  Plus, 
  Trash2, 
  Settings2,
  Tag,
  MessageSquare,
  Truck,
  Check,
  ChevronRight,
  Search,
  ChevronDown,
  Hash,
  Paperclip,
  X,
  UploadCloud
} from 'lucide-react';
import { 
  vendorsApi, 
  purchaseOrdersApi, 
  settingsApi, 
  productsApi,
  staffApi,
  type Vendor, 
  type PurchaseOrder, 
  type PurchaseOrderItem,
  type StaffMember,
  type Product,
  vendorAttachmentsApi,
  api
} from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { Skeleton } from '@/components/ui/skeleton';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { useRef } from 'react';

// --- Reusable Searchable Select Component ---
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
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-transparent border-none focus:ring-0" 
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

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'shipping'>('general');

  // Master Data
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [currency, setCurrency] = useState('USD');
  const [existingPoCount, setExistingPoCount] = useState(0);

  const searchParams = useSearchParams();
  const initialVendorId = searchParams.get('vendor_id') || '';

  // Form State
  const [vendorId, setVendorId] = useState<string | number>(initialVendorId);
  const [branchId, setBranchId] = useState<string | number>('');
  const [vendorPoNumber, setVendorPoNumber] = useState('');
  const [personInChargeId, setPersonInChargeId] = useState<string | number>('');
  const [description, setDescription] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [tags, setTags] = useState('');
  const [vendorNote, setVendorNote] = useState('');
  const [shippingFee, setShippingFee] = useState(0);

  // PO Number Preview logic
  const poNumberPreview = useMemo(() => {
    const month = new Date().toLocaleString('default', { month: 'short' });
    const year = new Date().getFullYear();
    const sequence = String(existingPoCount + 1).padStart(5, '0');
    return `#PO-${sequence}-${month}-${year}`;
  }, [existingPoCount]);

  // Items State
  const [items, setItems] = useState<Partial<PurchaseOrderItem>[]>([
    { item_name: '', unit_price: 0, quantity: 1, total: 0 }
  ]);

  // Attachments State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search/Item Selection UI
  const [showItemSearch, setShowItemSearch] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [vRes, sRes, pRes, setRes, poRes, bRes] = await Promise.all([
      vendorsApi.list({ per_page: 100 }),
      staffApi.list(),
      productsApi.list({ per_page: 100 }),
      settingsApi.get(),
      purchaseOrdersApi.list({ per_page: 1 }),
      api<any[]>('/api/branches')
    ]);
    
    setLoading(false);
    if (!('error' in vRes)) {
      const vData = (vRes.data as any).data || vRes.data || [];
      setVendors(vData);
    }
    if (!('error' in bRes)) setBranches(bRes.data || []);
    if (!('error' in sRes)) {
      const staffList = sRes.data || [];
      setStaff(staffList);
      
      // Auto-select logged in user
      if (user) {
        const currentStaff = staffList.find(s => String(s.user_id) === String(user.id));
        if (currentStaff) setPersonInChargeId(currentStaff.id);
      }
    }
    if (!('error' in pRes)) {
      const pData = (pRes.data as any).products || (pRes.data as any).data || pRes.data || [];
      setProducts(pData);
    }
    if (!('error' in setRes)) setCurrency(setRes.data?.salon?.currency || 'USD');
    if (!('error' in poRes)) setExistingPoCount(poRes.data?.meta?.total || 0);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto-select person in charge when staff or user is available
  useEffect(() => {
    if (user && staff.length > 0 && !personInChargeId) {
      // Try matching by user_id first
      let currentStaff = staff.find(s => String(s.user_id) === String(user.id));
      
      // Fallback to email match if user_id doesn't link
      if (!currentStaff && user.email) {
        currentStaff = staff.find(s => s.email?.toLowerCase() === user.email.toLowerCase());
      }

      if (currentStaff) setPersonInChargeId(currentStaff.id);
    }
  }, [user, staff, personInChargeId]);

  const handleAddItem = () => {
    setItems([...items, { item_name: '', unit_price: 0, quantity: 1, total: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updates: Partial<PurchaseOrderItem>) => {
    const newItems = [...items];
    const item = { ...newItems[index], ...updates };
    
    // Calculate totals
    const sub = (item.unit_price || 0) * (item.quantity || 1);
    const taxVal = (sub * (item.tax_rate || 0)) / 100;
    const discVal = item.discount_percentage ? (sub * item.discount_percentage) / 100 : (item.discount_value || 0);
    
    item.tax_value = taxVal;
    item.discount_value = discVal;
    item.total = sub + taxVal - discVal;
    
    newItems[index] = item;
    setItems(newItems);
  };

  const totals = useMemo(() => {
    const subtotal = items.reduce((acc, item) => acc + ((item.unit_price || 0) * (item.quantity || 1)), 0);
    const totalTax = items.reduce((acc, item) => acc + (item.tax_value || 0), 0);
    const totalDiscount = items.reduce((acc, item) => acc + (item.discount_value || 0), 0);
    const grandTotal = subtotal + totalTax - totalDiscount + shippingFee;
    
    return { subtotal, totalTax, totalDiscount, grandTotal };
  }, [items, shippingFee]);

  const handleSubmit = async (status: 'draft' | 'received' = 'draft') => {
    if (!vendorId) return toastError('Please select a vendor');
    if (items.some(i => !i.item_name)) return toastError('All items must have a name');

    setSubmitting(true);
    const res = await purchaseOrdersApi.create({
      vendor_id: parseInt(String(vendorId)),
      person_in_charge_id: personInChargeId ? parseInt(String(personInChargeId)) : undefined,
      description,
      order_date: orderDate,
      currency,
      status,
      branch_id: branchId ? parseInt(String(branchId)) : undefined,
      tags,
      vendor_note: vendorNote,
      shipping_fee: shippingFee,
      subtotal: totals.subtotal,
      total_tax: totals.totalTax,
      total_discount: totals.totalDiscount,
      grand_total: totals.grandTotal,
      items: items as PurchaseOrderItem[]
    });

    if ('error' in res) {
      setSubmitting(false);
      toastError(res.error || 'Failed to create purchase order');
    } else {
      // Upload attachments if any
      if (selectedFiles.length > 0 && vendorId) {
        const newPoId = (res as any).data?.id;
        await Promise.all(selectedFiles.map(file => vendorAttachmentsApi.upload(Number(vendorId), file, newPoId)));
      }
      
      setSubmitting(false);
      toastSuccess('Purchase order created successfully');
      router.push('/dashboard/purchase-orders');
    }
  };

  if (loading) return (
    <div className="p-8 space-y-4">
      <Skeleton className="h-12 w-full rounded-2xl" />
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-muted rounded-xl transition-colors border border-border shadow-sm"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Create Purchase Order</h1>
            <p className="text-xs text-muted-foreground">Draft a new procurement request for your suppliers.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="px-6 py-2 border border-border rounded-xl font-semibold text-sm hover:bg-muted transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={() => handleSubmit('draft')}
            disabled={submitting}
            className="px-6 py-2 bg-muted border border-border text-foreground rounded-xl font-semibold text-sm hover:bg-muted/80 transition-all shadow-sm"
          >
            Save as Draft
          </button>
          <button 
            onClick={() => handleSubmit('received')}
            disabled={submitting}
            className="px-8 py-2 bg-orange-600 text-white rounded-xl font-semibold text-sm hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/20"
          >
            {submitting ? 'Processing...' : 'Save & Receive (Stock)'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-8 border-b border-border px-2">
         <button 
           onClick={() => setActiveTab('general')}
           className={cn(
             "pb-4 text-sm font-bold transition-all relative",
             activeTab === 'general' ? "text-orange-600" : "text-muted-foreground hover:text-foreground"
           )}
         >
           General Information
           {activeTab === 'general' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 rounded-t-full" />}
         </button>
         <button 
           onClick={() => setActiveTab('shipping')}
           className={cn(
             "pb-4 text-sm font-bold transition-all relative",
             activeTab === 'shipping' ? "text-orange-600" : "text-muted-foreground hover:text-foreground"
           )}
         >
           Shipping Information
           {activeTab === 'shipping' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 rounded-t-full" />}
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'general' ? (
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-8 animate-in fade-in duration-300">
               {/* Grid 1 */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Purchase Order Description *</label>
                    <input
                      placeholder="e.g. Monthly Inventory Restock"
                      className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5 opacity-60 grayscale-[0.3]">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Purchase Order Number (Auto)</label>
                    <input
                      readOnly
                      placeholder={poNumberPreview}
                      className="w-full px-4 py-2.5 bg-muted/40 border border-border rounded-xl text-muted-foreground font-mono cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Vendor PO Number</label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        placeholder="e.g. V-98765"
                        className="w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                        value={vendorPoNumber}
                        onChange={(e) => setVendorPoNumber(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <SearchableSelect 
                    label="Vendors *"
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
                        placeholder="Add tags..."
                        className="w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                      />
                    </div>
                  </div>
               </div>

               {/* Grid 2 */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1.5 opacity-60 grayscale-[0.3]">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Currency</label>
                    <input
                      readOnly
                      className="w-full px-4 py-2.5 bg-muted/40 border border-border rounded-xl text-muted-foreground font-bold cursor-not-allowed"
                      value={currency}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Order Date *</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="date"
                        className="w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                        value={orderDate}
                        onChange={(e) => setOrderDate(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <SearchableSelect 
                    label="Person in charge"
                    icon={User}
                    placeholder="Select Employee"
                    options={staff.map(s => ({ id: s.id, label: s.name }))}
                    value={personInChargeId}
                    onChange={setPersonInChargeId}
                  />
               </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6 animate-in fade-in duration-300">
               <div className="flex items-center gap-3 text-orange-600 mb-2">
                  <Truck className="w-5 h-5" />
                  <h3 className="font-bold">Shipping Information</h3>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Shipping Fee ({currency})</label>
                    <input
                      type="number"
                      className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                      value={shippingFee}
                      onChange={(e) => setShippingFee(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Vendor Note</label>
                    <textarea
                      rows={4}
                      placeholder="Add any specific instructions for the vendor..."
                      className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                      value={vendorNote}
                      onChange={(e) => setVendorNote(e.target.value)}
                    />
                  </div>
               </div>
            </div>
          )}

          {/* Items Section */}
          <div className="bg-card border border-border rounded-3xl shadow-sm">
            <div className="px-6 py-4 bg-muted/30 border-b border-border flex justify-between items-center rounded-t-3xl">
               <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-orange-600" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Order Items</h3>
               </div>
               <button 
                 onClick={handleAddItem}
                 className="flex items-center gap-2 text-xs font-bold text-orange-600 hover:underline"
               >
                 <Plus className="w-3 h-3" /> Add Item
               </button>
            </div>
            <div className="">
               <table className="w-full text-left">
                  <thead className="bg-muted/10 border-b border-border">
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3 min-w-[200px]">Item / Description</th>
                      <th className="px-4 py-3 w-32">Unit Price</th>
                      <th className="px-4 py-3 w-24">Quantity</th>
                      <th className="px-4 py-3 w-32">Tax (%)</th>
                      <th className="px-4 py-3 w-32">Discount (%)</th>
                      <th className="px-4 py-3 w-32">Total</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item, idx) => (
                      <tr key={idx} className="group hover:bg-muted/5 transition-colors">
                        <td className="px-4 py-3">
                           <div className="space-y-2">
                              <div className="relative">
                                <input
                                  placeholder="Select or type item name..."
                                  className="w-full px-3 py-1.5 bg-muted/10 border border-border rounded-lg text-sm focus:ring-1 focus:ring-orange-500/30"
                                  value={item.item_name || ''}
                                  onChange={(e) => updateItem(idx, { item_name: e.target.value })}
                                  onFocus={() => setShowItemSearch(idx)}
                                />
                                {showItemSearch === idx && (
                                   <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                      <div className="p-2 border-b border-border">
                                         <div className="relative">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                            <input placeholder="Search products..." className="w-full pl-7 pr-3 py-1 text-xs bg-transparent border-none focus:ring-0" />
                                         </div>
                                      </div>
                                      <div className="max-h-40 overflow-y-auto">
                                         {products.length === 0 ? (
                                            <div className="p-4 text-center text-[10px] text-muted-foreground">No products found</div>
                                         ) : products.map(p => (
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
                                              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted transition-colors"
                                            >
                                               <span className="text-xs font-semibold">{p.name}</span>
                                               <span className="text-[10px] text-orange-600 font-bold">{currency} {Number(p.cost || p.price || 0).toLocaleString()}</span>
                                            </button>
                                         ))}
                                      </div>
                                   </div>
                                )}
                              </div>
                              <textarea
                                placeholder="Add description..."
                                rows={1}
                                className="w-full px-3 py-1.5 bg-muted/5 border border-border rounded-lg text-[10px] focus:ring-1 focus:ring-orange-500/30 resize-none"
                                value={item.item_description || ''}
                                onChange={(e) => updateItem(idx, { item_description: e.target.value })}
                              />
                           </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                           <input
                             type="number"
                             className="w-full px-3 py-1.5 bg-muted/10 border border-border rounded-lg text-sm focus:ring-1 focus:ring-orange-500/30"
                             value={item.unit_price || 0}
                             onChange={(e) => updateItem(idx, { unit_price: parseFloat(e.target.value) || 0 })}
                           />
                        </td>
                        <td className="px-4 py-3 align-top">
                           <input
                             type="number"
                             className="w-full px-3 py-1.5 bg-muted/10 border border-border rounded-lg text-sm focus:ring-1 focus:ring-orange-500/30"
                             value={item.quantity || 0}
                             onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                           />
                        </td>
                        <td className="px-4 py-3 align-top">
                           <input
                             type="number"
                             placeholder="0%"
                             className="w-full px-3 py-1.5 bg-muted/10 border border-border rounded-lg text-sm focus:ring-1 focus:ring-orange-500/30"
                             value={item.tax_rate || 0}
                             onChange={(e) => updateItem(idx, { tax_rate: parseFloat(e.target.value) || 0 })}
                           />
                        </td>
                        <td className="px-4 py-3 align-top">
                           <input
                             type="number"
                             placeholder="0%"
                             className="w-full px-3 py-1.5 bg-muted/10 border border-border rounded-lg text-sm focus:ring-1 focus:ring-orange-500/30"
                             value={item.discount_percentage || 0}
                             onChange={(e) => updateItem(idx, { discount_percentage: parseFloat(e.target.value) || 0 })}
                           />
                        </td>
                        <td className="px-4 py-3 align-top text-sm font-bold text-foreground">
                           {currency} {(item.total || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 align-top">
                           <button 
                             onClick={() => handleRemoveItem(idx)}
                             className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                           >
                              <Trash2 className="w-4 h-4" />
                           </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>

          {/* Attachments Section */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                   <Paperclip className="w-4 h-4 text-orange-600" />
                   <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Attachments</h3>
                </div>
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors flex items-center gap-1.5"
                >
                   <UploadCloud className="w-3.5 h-3.5" />
                   Add Files
                </button>
                <input 
                  type="file" 
                  hidden 
                  ref={fileInputRef} 
                  multiple 
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    if (e.target.files) {
                      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                    }
                  }}
                />
             </div>
             
             {selectedFiles.length === 0 ? (
                <div className="py-8 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center bg-muted/5">
                   <UploadCloud className="w-8 h-8 text-muted-foreground opacity-20 mb-2" />
                   <p className="text-xs text-muted-foreground">No files selected. Upload images or PDFs.</p>
                </div>
             ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                   {selectedFiles.map((file, idx) => (
                      <div key={idx} className="group relative bg-muted/20 border border-border rounded-xl p-3 flex items-center gap-3">
                         <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-orange-600" />
                         </div>
                         <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-foreground truncate">{file.name}</p>
                            <p className="text-[9px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                         </div>
                         <button 
                           type="button"
                           onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                           className="p-1 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                         >
                            <X className="w-3 h-3" />
                         </button>
                      </div>
                   ))}
                </div>
             )}
          </div>
        </div>

        {/* Totals Summary */}
        <div className="space-y-6">
           <div className="bg-card border border-border rounded-3xl p-6 shadow-sm sticky top-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-6">Order Summary</h3>
              
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">{currency} {totals.subtotal.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Total Tax</span>
                    <span className="font-semibold">{currency} {totals.totalTax.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-semibold text-red-600">-{currency} {totals.totalDiscount.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Shipping Fee</span>
                    <span className="font-semibold">{currency} {shippingFee.toLocaleString()}</span>
                 </div>
                 
                 <div className="pt-4 border-t border-border flex justify-between items-center">
                    <span className="font-bold text-foreground">Grand Total</span>
                    <span className="text-xl font-black text-orange-600">{currency} {totals.grandTotal.toLocaleString()}</span>
                 </div>
              </div>

              <div className="mt-8 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-2xl border border-orange-100 dark:border-orange-900/30 flex items-start gap-3">
                 <MessageSquare className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                 <div className="text-[10px] text-orange-800 dark:text-orange-300 leading-relaxed">
                    Once saved, this order will be set to <strong>Draft</strong> status. You can later mark it as Sent or Received to update your stock levels.
                 </div>
              </div>

              <div className="space-y-3 mt-6">
                <button 
                  onClick={() => handleSubmit('draft')}
                  disabled={submitting}
                  className="w-full py-3 bg-muted border border-border text-foreground rounded-xl font-bold text-sm hover:bg-muted/80 transition-all"
                >
                  Save as Draft
                </button>
                <button 
                  onClick={() => handleSubmit('received')}
                  disabled={submitting}
                  className="w-full py-3 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Save & Receive (Update Stock)'}
                </button>
              </div>
           </div>
        </div>
      </div>
      
      {/* Click outside search handler */}
      {showItemSearch !== null && (
        <div className="fixed inset-0 z-40" onClick={() => setShowItemSearch(null)} />
      )}
    </div>
  );
}
