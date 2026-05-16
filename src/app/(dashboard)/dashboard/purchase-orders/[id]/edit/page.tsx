'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  CheckCircle,
  Paperclip,
  X,
  UploadCloud,
  FileText,
  Eye,
  Download
} from 'lucide-react';
import { 
  vendorsApi, 
  type Vendor, 
  productsApi, 
  type Product,
  staffApi,
  type StaffMember,
  purchaseOrdersApi,
  type PurchaseOrder,
  type PurchaseOrderItem,
  api,
  vendorAttachmentsApi,
  downloadFile,
  type VendorAttachment
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

export default function EditPurchaseOrderPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'shipping'>('general');

  // Master Data
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  // Form State
  const [vendorId, setVendorId] = useState<string | number>('');
  const [vendorPoNumber, setVendorPoNumber] = useState('');
  const [description, setDescription] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [personInChargeId, setPersonInChargeId] = useState<string | number>('');
  const [currency, setCurrency] = useState('AED');
  const [shippingFee, setShippingFee] = useState(0);
  const [tags, setTags] = useState('');
  const [vendorNote, setVendorNote] = useState('');
  const [status, setStatus] = useState('draft');
  const [branchId, setBranchId] = useState<string | number>('');
  const [items, setItems] = useState<Partial<PurchaseOrderItem>[]>([]);

  const [showItemSearch, setShowItemSearch] = useState<number | null>(null);

  // Attachments State
  const [existingAttachments, setExistingAttachments] = useState<VendorAttachment[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadInitialData();
  }, [id]);

  const loadInitialData = async () => {
    try {
      const [vRes, pRes, sRes, oRes, lRes, aRes] = await Promise.all([
        vendorsApi.list(),
        productsApi.list(),
        staffApi.list(),
        purchaseOrdersApi.get(id),
        api<any>('/api/branches'),
        vendorAttachmentsApi.list({ purchase_order_id: Number(id) })
      ]);

      if (!('error' in vRes)) {
        // Handle paginated response
        const vData = (vRes.data as any).data || vRes.data || [];
        setVendors(vData);
      }
      if (!('error' in pRes)) {
        // Handle paginated response
        const pData = (pRes.data as any).data || pRes.data || [];
        setProducts(pData);
      }
      if (!('error' in sRes)) setStaff(sRes.data || []);
      if (!('error' in lRes)) setLocations(lRes.data || []);
      if (!('error' in aRes)) setExistingAttachments(aRes.data || []);
      
      if (!('error' in oRes)) {
        const o = oRes.data;
        setVendorId(o.vendor_id);
        setVendorPoNumber(o.vendor_po_number || '');
        setDescription(o.description || '');
        setPoNumber(o.po_number);
        setOrderDate(o.order_date);
        setPersonInChargeId(o.person_in_charge_id || '');
        setCurrency(o.currency || 'AED');
        setShippingFee(parseFloat(o.shipping_fee?.toString() || '0'));
        setTags(o.tags || '');
        setVendorNote(o.vendor_note || '');
        setStatus(o.status);
        setBranchId(o.branch_id || '');
        setItems(o.items || []);
      } else {
        throw new Error(oRes.error);
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to load order data');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const calculateItemTotal = (item: Partial<PurchaseOrderItem>) => {
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

  const updateItem = (index: number, updates: Partial<PurchaseOrderItem>) => {
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

  const handleSubmit = async (newStatus?: string) => {
    if (!vendorId || !orderDate || items.length === 0) {
      toastError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        vendor_id: vendorId,
        vendor_po_number: vendorPoNumber,
        description,
        order_date: orderDate,
        person_in_charge_id: personInChargeId || null,
        currency,
        shipping_fee: shippingFee,
        tags,
        vendor_note: vendorNote,
        status: newStatus || status,
        branch_id: branchId || null,
        subtotal: totals.subtotal,
        total_tax: totals.totalTax,
        total_discount: totals.totalDiscount,
        grand_total: totals.grandTotal + shippingFee,
        items: items.map(item => ({
          ...item,
          total: calculateItemTotal(item)
        }))
      };

      const res = await purchaseOrdersApi.update(id, payload);
      if ('error' in res) throw new Error(res.error);

      // Upload attachments if any
      if (selectedFiles.length > 0 && vendorId) {
        await Promise.all(selectedFiles.map(file => vendorAttachmentsApi.upload(Number(vendorId), file, Number(id))));
      }

      toastSuccess(`Purchase Order ${newStatus === 'received' ? 'received' : 'updated'} successfully`);
      if (newStatus !== 'received') {
        router.push('/dashboard/purchase-orders');
      } else {
        setStatus('received');
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to update purchase order');
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
            <span className="text-sm font-medium">Back to Orders</span>
          </button>
          <h1 className="text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
            Edit Purchase Order
            <span className="text-sm font-bold px-3 py-1 bg-orange-100 text-orange-600 rounded-full">
              {poNumber}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="px-6 py-2 border border-border rounded-xl font-semibold text-sm hover:bg-muted transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={() => handleSubmit()}
            disabled={submitting}
            className="px-6 py-2 bg-muted border border-border text-foreground rounded-xl font-semibold text-sm hover:bg-muted/80 transition-all shadow-sm"
          >
            Save Changes
          </button>
          {(status === 'draft' || status === 'received') && (
            <button 
              onClick={() => status !== 'received' && handleSubmit('received')}
              disabled={submitting || status === 'received'}
              className={cn(
                "px-8 py-2 rounded-xl font-semibold text-sm transition-all shadow-lg",
                status === 'received' 
                  ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none" 
                  : "bg-orange-600 text-white hover:bg-orange-700 shadow-orange-500/20"
              )}
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </div>
              ) : status === 'received' ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Received
                </div>
              ) : (
                'Save & Receive (Stock)'
              )}
            </button>
          )}
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
                  <div className="space-y-1.5 opacity-60">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Purchase Order Number</label>
                    <input
                      readOnly
                      className="w-full px-4 py-2.5 bg-muted/40 border border-border rounded-xl text-muted-foreground font-mono cursor-not-allowed"
                      value={poNumber}
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

                  <SearchableSelect 
                    label="Receiving Location *"
                    icon={Building2}
                    placeholder="Select Branch"
                    options={locations.map(l => ({ id: l.id, label: l.name }))}
                    value={branchId}
                    onChange={setBranchId}
                  />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1.5 opacity-60">
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
            <div className="overflow-x-auto">
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
                                  placeholder="Item name..."
                                  className="w-full px-3 py-1.5 bg-muted/10 border border-border rounded-lg text-sm focus:ring-1 focus:ring-orange-500/30"
                                  value={item.item_name || ''}
                                  onChange={(e) => updateItem(idx, { item_name: e.target.value })}
                                  onFocus={() => setShowItemSearch(idx)}
                                />
                                {showItemSearch === idx && (
                                   <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                      <div className="max-h-40 overflow-y-auto">
                                         {products.map(p => (
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
                             className="w-full px-3 py-1.5 bg-muted/10 border border-border rounded-lg text-sm focus:ring-1 focus:ring-orange-500/30"
                             value={item.tax_rate || 0}
                             onChange={(e) => updateItem(idx, { tax_rate: parseFloat(e.target.value) || 0 })}
                           />
                        </td>
                        <td className="px-4 py-3 align-top">
                           <input
                             type="number"
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
             
             <div className="space-y-4">
                {existingAttachments.length > 0 && (
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-b border-border pb-4">
                      {existingAttachments.map((file) => (
                         <div key={file.id} className="group relative bg-orange-50/50 border border-orange-100 rounded-xl p-3 flex items-center gap-3">
                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
                               <FileText className="w-4 h-4 text-orange-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                               <p className="text-[10px] font-bold text-foreground truncate">{file.file_name}</p>
                               <p className="text-[9px] text-muted-foreground">{(file.file_size / 1024).toFixed(1)} KB</p>
                            </div>
                            <div className="flex gap-1">
                               <a href={file.url} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-white rounded-md transition-colors">
                                  <Eye className="w-3 h-3 text-orange-600" />
                               </a>
                               <button 
                                 onClick={() => downloadFile(`http://localhost:8000/api/vendor-attachments/${file.id}/download`, file.file_name)}
                                 className="p-1 hover:bg-white rounded-md transition-colors"
                               >
                                  <Download className="w-3 h-3 text-orange-600" />
                               </button>
                            </div>
                         </div>
                      ))}
                   </div>
                )}

                {selectedFiles.length === 0 && existingAttachments.length === 0 ? (
                   <div className="py-8 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center bg-muted/5">
                      <UploadCloud className="w-8 h-8 text-muted-foreground opacity-20 mb-2" />
                      <p className="text-xs text-muted-foreground">No files selected. Upload images or PDFs.</p>
                   </div>
                ) : selectedFiles.length > 0 && (
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
                    <span className="text-xl font-black text-orange-600">{currency} {(totals.grandTotal + shippingFee).toLocaleString()}</span>
                 </div>
              </div>

              <div className="mt-8 p-4 bg-muted/30 rounded-2xl border border-border flex items-start gap-3">
                 <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                 <div className="text-[10px] text-muted-foreground leading-relaxed">
                    You are currently editing an existing Purchase Order. Changes will be saved immediately. Current status is <strong className="uppercase">{status}</strong>.
                 </div>
              </div>
           </div>
        </div>
      </div>
      {showItemSearch !== null && <div className="fixed inset-0 z-40" onClick={() => setShowItemSearch(null)} />}
    </div>
  );
}
