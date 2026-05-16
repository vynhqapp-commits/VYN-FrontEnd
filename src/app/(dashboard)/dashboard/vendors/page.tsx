'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  Banknote, 
  Clock, 
  X,
  Edit2,
  Trash2,
  ChevronRight,
  Globe,
  FileText,
  CreditCard,
  Receipt,
  FileSpreadsheet,
  Wallet,
  BookText,
  StickyNote,
  Paperclip,
  UserPlus,
  CheckCircle2,
  Circle,
  Eye, 
  DollarSign, 
  Wallet2, 
  Boxes, 
  Download, 
  ExternalLink,
  UploadCloud,
  FileIcon,
  ImageIcon,
  PlusCircle,
  TrendingDown,
  Calendar,
  Loader2,
  TrendingUp
} from 'lucide-react';
import { 
  vendorsApi, 
  vendorContactsApi, 
  settingsApi, 
  quotationsApi,
  purchaseOrdersApi,
  vendorPaymentsApi,
  vendorNotesApi,
  vendorAttachmentsApi,
  api,
  downloadFile,
  type Vendor, 
  type VendorContact,
  type Quotation,
  type PurchaseOrder,
  type VendorPayment,
  type VendorStatementTransaction,
  type VendorNote,
  type VendorAttachment
} from '@/lib/api';
import Link from 'next/link';
import { toastError, toastSuccess } from '@/lib/toast';
import { Skeleton } from '@/components/ui/skeleton';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import * as React from 'react';
import { cn } from '@/lib/utils';

const COUNTRIES = [
  "Lebanon", "United Arab Emirates", "Saudi Arabia", "Qatar", "Kuwait", "Oman", "Bahrain", 
  "Jordan", "Egypt", "Turkey", "United States", "United Kingdom", "France", "Germany"
];

function SearchableCountrySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = COUNTRIES.filter(c => c.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20 text-left text-sm"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value || "Select Country..."}
        </span>
        <ChevronRight className={cn("w-4 h-4 transition-transform", open ? "rotate-90" : "rotate-0")} />
      </button>

      {open && (
        <div className="absolute z-[300] top-full mt-2 w-full bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-2 border-b border-border bg-muted/30">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                autoFocus
                placeholder="Search country..."
                className="w-full pl-8 pr-3 py-1.5 bg-transparent border-none focus:ring-0 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                  setSearch("");
                }}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                  value === c ? "bg-orange-50 text-orange-600 font-bold" : "hover:bg-muted"
                )}
              >
                {c}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="p-4 text-center text-xs text-muted-foreground">No country found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type TabId = 'profile' | 'contacts' | 'quotations' | 'contracts' | 'orders' | 'invoices' | 'debit-notes' | 'statement' | 'payments' | 'expenses' | 'notes' | 'attachments';

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('USD');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selection / Profile View
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  // Modals
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Vendor Form State
  const [vendorForm, setVendorForm] = useState({
    name: '',
    code: '',
    phone: '',
    email: '',
    bank_details: '',
    payment_terms: '',
    address: '',
    city: '',
    country: 'Lebanon',
    return_window_days: 0,
    return_fee: 0,
    return_policy_info: ''
  });

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialVendorId = searchParams?.get('id');

  const loadVendors = async () => {
    setLoading(true);
    const res = await vendorsApi.list({ search: searchTerm });
    setLoading(false);
    if ('error' in res) {
      toastError(res.error || 'Failed to load vendors');
    } else {
      const data = res.data || [];
      setVendors(data);
      
      if (initialVendorId && !selectedVendor) {
        const v = data.find(item => String(item.id) === String(initialVendorId));
        if (v) setSelectedVendor(v);
      }
    }
  };

  useEffect(() => {
    settingsApi.get().then((r) => {
      if (!('error' in r) && r.data?.salon?.currency) setCurrency(r.data.salon.currency);
    });
    loadVendors();
  }, [initialVendorId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadVendors();
  };

  const handleOpenAddVendor = () => {
    setEditingVendor(null);
    setVendorForm({
      name: '',
      code: '',
      phone: '',
      email: '',
      bank_details: '',
      payment_terms: '',
      address: '',
      city: '',
      country: 'Lebanon',
      return_window_days: 0,
      return_fee: 0,
      return_policy_info: ''
    });
    setShowVendorModal(true);
  };

  const handleOpenEditVendor = (v: Vendor) => {
    setEditingVendor(v);
    setVendorForm({
      name: v.name,
      code: v.code || '',
      phone: v.phone || '',
      email: v.email || '',
      bank_details: v.bank_details || '',
      payment_terms: v.payment_terms || '',
      address: v.address || '',
      city: v.city || '',
      country: v.country || 'Lebanon',
      return_window_days: v.return_window_days,
      return_fee: v.return_fee,
      return_policy_info: v.return_policy_info || ''
    });
    setShowVendorModal(true);
  };

  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    let res;
    if (editingVendor) {
      res = await vendorsApi.update(editingVendor.id, vendorForm);
    } else {
      res = await vendorsApi.create(vendorForm);
    }

    setSubmitting(false);
    if ('error' in res) {
      toastError(res.error || 'Operation failed');
    } else {
      toastSuccess(editingVendor ? 'Vendor updated' : 'Vendor created');
      setShowVendorModal(false);
      loadVendors();
      if (selectedVendor && editingVendor && selectedVendor.id === editingVendor.id) {
         setSelectedVendor({ ...selectedVendor, ...vendorForm } as any);
      }
    }
  };

  if (selectedVendor) {
    return (
      <VendorProfileView 
        vendor={selectedVendor} 
        onBack={() => setSelectedVendor(null)} 
        currency={currency}
        onEdit={() => handleOpenEditVendor(selectedVendor)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    );
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Vendors"
        icon={<Users className="w-5 h-5" />}
        rightSlot={
          <button
            onClick={handleOpenAddVendor}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl font-semibold text-sm hover:bg-orange-700 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Vendor
          </button>
        }
      />

      {/* Search Bar */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, code, or email..."
              className="w-full pl-10 pr-4 py-2 bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-secondary text-secondary-foreground rounded-xl font-semibold text-sm hover:bg-secondary/80 transition-all"
          >
            Search
          </button>
        </form>
      </div>

      {/* Vendors List */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
      ) : vendors.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No vendors found</h3>
          <p className="text-muted-foreground mb-6">Start by adding your first supplier to the purchase module.</p>
          <button onClick={handleOpenAddVendor} className="text-orange-600 font-semibold hover:underline">
            + Add Vendor
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Company</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Code</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contact</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Location</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {vendors.map((v) => (
                <tr 
                  key={v.id} 
                  onClick={() => setSelectedVendor(v)}
                  className="group cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-orange-600">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="font-semibold text-foreground truncate max-w-[200px]">{v.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                      {v.code || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3 h-3" /> {v.email || '—'}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3" /> {v.phone || '—'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {v.city}, {v.country}
                  </td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {v.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenEditVendor(v); }}
                        className="p-1.5 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleStatus(v); }}
                        className={`p-1.5 rounded-lg transition-all ${v.is_active ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-green-50 hover:text-green-600'}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="p-1.5 hover:bg-muted rounded-lg transition-all text-muted-foreground hover:text-foreground">
                        <Users className="w-4 h-4" />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Vendor Modal */}
      {showVendorModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-border">
            <div className="sticky top-0 bg-card/95 backdrop-blur z-10 px-6 py-4 border-b border-border flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {editingVendor ? 'Edit Vendor' : 'New Vendor Registration'}
                </h2>
                <p className="text-xs text-muted-foreground">Fill in the supplier details and return policies below.</p>
              </div>
              <button onClick={() => setShowVendorModal(false)} className="p-2 hover:bg-muted rounded-xl transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleVendorSubmit} className="p-6 space-y-8">
              {/* General Information */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-4 h-4 text-orange-600" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">General Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground px-1">Company Name *</label>
                    <input
                      required
                      className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                      value={vendorForm.name}
                      onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground px-1">Vendor Code</label>
                    <input
                      placeholder="e.g. VEN-001"
                      className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                      value={vendorForm.code}
                      onChange={(e) => setVendorForm({ ...vendorForm, code: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground px-1">Phone Number</label>
                    <input
                      type="tel"
                      className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                      value={vendorForm.phone}
                      onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground px-1">Email Address</label>
                    <input
                      type="email"
                      className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                      value={vendorForm.email}
                      onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                    />
                  </div>
                </div>
              </section>

              {/* Financial Details */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Banknote className="w-4 h-4 text-orange-600" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Financial Details</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground px-1">Currency (Tenant Default)</label>
                    <input
                      readOnly
                      className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-xl font-bold text-muted-foreground cursor-not-allowed"
                      value={currency}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground px-1">Payment Terms</label>
                    <input
                      placeholder="e.g. Net 30, Cash on delivery"
                      className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                      value={vendorForm.payment_terms}
                      onChange={(e) => setVendorForm({ ...vendorForm, payment_terms: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground px-1">Bank Details (IBAN, Swift, Bank Name)</label>
                    <textarea
                      rows={3}
                      className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                      value={vendorForm.bank_details}
                      onChange={(e) => setVendorForm({ ...vendorForm, bank_details: e.target.value })}
                    />
                  </div>
                </div>
              </section>

              {/* Location */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-4 h-4 text-orange-600" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Address Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground px-1">City</label>
                    <input
                      className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                      value={vendorForm.city}
                      onChange={(e) => setVendorForm({ ...vendorForm, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground px-1">Country</label>
                    <SearchableCountrySelect 
                      value={vendorForm.country} 
                      onChange={(val) => setVendorForm({ ...vendorForm, country: val })} 
                    />
                  </div>
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground px-1">Full Address</label>
                    <input
                      className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                      value={vendorForm.address}
                      onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                    />
                  </div>
                </div>
              </section>

              {/* Return Policy */}
              <section className="p-5 bg-orange-50/50 dark:bg-orange-950/10 rounded-2xl border border-orange-100 dark:border-orange-900/30">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400">Return Policy</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground px-1">Return Window (Days After Delivery)</label>
                    <input
                      type="number"
                      className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                      value={vendorForm.return_window_days}
                      onChange={(e) => setVendorForm({ ...vendorForm, return_window_days: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground px-1">Return Fee ({currency})</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                      value={vendorForm.return_fee}
                      onChange={(e) => setVendorForm({ ...vendorForm, return_fee: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground px-1">Return Policy Information & Details</label>
                    <textarea
                      rows={3}
                      className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                      value={vendorForm.return_policy_info}
                      onChange={(e) => setVendorForm({ ...vendorForm, return_policy_info: e.target.value })}
                    />
                  </div>
                </div>
              </section>

              <div className="flex gap-3 justify-end pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowVendorModal(false)}
                  className="px-6 py-2.5 border border-border rounded-xl font-semibold text-sm hover:bg-muted transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-2.5 bg-orange-600 text-white rounded-xl font-semibold text-sm hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : editingVendor ? 'Save Changes' : 'Create Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function VendorProfileView({ 
  vendor, 
  onBack, 
  currency, 
  onEdit,
  activeTab,
  setActiveTab
}: { 
  vendor: Vendor; 
  onBack: () => void; 
  currency: string;
  onEdit: () => void;
  activeTab: TabId;
  setActiveTab: (t: TabId) => void;
}) {
  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'profile', label: 'Profile', icon: Building2 },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'quotations', label: 'Quotations', icon: FileSpreadsheet },
    { id: 'orders', label: 'Purchase order', icon: CreditCard },
    { id: 'statement', label: 'Purchase Statement', icon: BookText },
    { id: 'payments', label: 'Payments', icon: Wallet },
    { id: 'notes', label: 'Note', icon: StickyNote },
    { id: 'attachments', label: 'Attachments', icon: Paperclip },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-muted rounded-xl transition-colors border border-border"
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">#{vendor.id} {vendor.name}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
             <span>Vendor Profile</span>
             <span>•</span>
             <span className="font-semibold text-orange-600">{vendor.code || 'NO-CODE'}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <aside className="w-full lg:w-64 shrink-0">
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm sticky top-6">
             <div className="p-4 bg-muted/30 border-b border-border">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Vendor Menu</p>
             </div>
             <nav className="p-2 space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-left",
                      activeTab === tab.id 
                        ? "bg-orange-600 text-white shadow-md shadow-orange-500/20" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
             </nav>
          </div>
        </aside>

        {/* Tab Content */}
        <main className="flex-1 bg-card border border-border rounded-3xl p-6 shadow-sm min-h-[600px]">
           {activeTab === 'profile' && <VendorGeneralInfoTab vendor={vendor} onEdit={onEdit} currency={currency} />}
           {activeTab === 'contacts' && <VendorContactsTab vendorId={vendor.id} />}
           {activeTab === 'quotations' && <VendorQuotationsTab vendorId={vendor.id} currency={currency} />}
           {activeTab === 'orders' && <VendorPurchaseOrdersTab vendorId={vendor.id} currency={currency} />}
           {activeTab === 'payments' && <VendorPaymentsTab vendorId={vendor.id} currency={currency} />}
           {activeTab === 'statement' && <VendorStatementTab vendorId={vendor.id} currency={currency} />}
           {activeTab === 'notes' && <VendorNotesTab vendorId={vendor.id} />}
           {activeTab === 'attachments' && <VendorAttachmentsTab vendorId={vendor.id} />}
           {!['profile', 'contacts', 'quotations', 'orders', 'payments', 'statement', 'notes', 'attachments'].includes(activeTab) && (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                 <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                    <Clock className="w-10 h-10 text-muted-foreground opacity-20" />
                 </div>
                 <h3 className="text-lg font-semibold text-foreground">Module Coming Soon</h3>
                 <p className="text-muted-foreground max-w-xs">The {tabs.find(t => t.id === activeTab)?.label} sub-module is currently under development.</p>
              </div>
           )}
        </main>
      </div>
    </div>
  );
}

function VendorGeneralInfoTab({ vendor, onEdit, currency }: { vendor: Vendor, onEdit: () => void, currency: string }) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-foreground">General Profile</h3>
        <div className="flex gap-2">
           <Link 
             href={`/dashboard/quotations/new?vendor_id=${vendor.id}`}
             className="px-4 py-2 bg-orange-50 text-orange-600 border border-orange-100 rounded-xl text-sm font-semibold hover:bg-orange-100 transition-colors flex items-center gap-2"
           >
              <FileSpreadsheet className="w-4 h-4" /> New Quote
           </Link>
           <Link 
             href={`/dashboard/purchase-orders/new?vendor_id=${vendor.id}`}
             className="px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700 transition-colors flex items-center gap-2 shadow-sm"
           >
              <Plus className="w-4 h-4" /> New PO
           </Link>
           <button onClick={onEdit} className="px-4 py-2 border border-border rounded-xl text-sm font-semibold hover:bg-muted transition-colors flex items-center gap-2 ml-2">
              <Edit2 className="w-4 h-4" /> Edit
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Company Name</p>
          <p className="text-sm font-semibold text-foreground">{vendor.name}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Vendor Code</p>
          <p className="text-sm font-semibold text-foreground">{vendor.code || '—'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Currency</p>
          <p className="text-sm font-semibold text-orange-600">{vendor.currency}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contact Email</p>
          <p className="text-sm font-semibold text-foreground">{vendor.email || '—'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone Number</p>
          <p className="text-sm font-semibold text-foreground">{vendor.phone || '—'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Location</p>
          <p className="text-sm font-semibold text-foreground">{vendor.city}, {vendor.country}</p>
        </div>
      </div>

      <div className="pt-6 border-t border-border">
         <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Financial & Terms</h4>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payment Terms</p>
              <p className="text-sm font-semibold text-foreground">{vendor.payment_terms || 'Standard'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bank Details</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{vendor.bank_details || 'No bank details provided.'}</p>
            </div>
         </div>
      </div>

      <div className="pt-6 border-t border-border bg-orange-50/30 dark:bg-orange-950/10 p-6 rounded-3xl">
         <h4 className="text-sm font-bold uppercase tracking-wider text-orange-600 mb-4">Return Policy</h4>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Return Window</p>
              <p className="text-sm font-semibold text-foreground">{vendor.return_window_days} Days after delivery</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Return Fee</p>
              <p className="text-sm font-semibold text-foreground">{currency} {vendor.return_fee}</p>
            </div>
            <div className="md:col-span-2 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Policy Information</p>
              <p className="text-sm text-foreground italic">"{vendor.return_policy_info || 'No specific return policy provided.'}"</p>
            </div>
         </div>
      </div>
    </div>
  );
}

function VendorContactsTab({ vendorId }: { vendorId: number }) {
  const [contacts, setContacts] = useState<VendorContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingContact, setEditingContact] = useState<VendorContact | null>(null);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    position: '',
    email: '',
    phone: '',
    is_primary: false
  });

  const loadContacts = async () => {
    setLoading(true);
    const res = await vendorContactsApi.list(vendorId);
    setLoading(false);
    if (!('error' in res)) {
      setContacts(res.data);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [vendorId]);

  const handleOpenAdd = () => {
    setEditingContact(null);
    setForm({ first_name: '', last_name: '', position: '', email: '', phone: '', is_primary: false });
    setShowModal(true);
  };

  const handleOpenEdit = (c: VendorContact) => {
    setEditingContact(c);
    setForm({ 
      first_name: c.first_name, 
      last_name: c.last_name || '', 
      position: c.position || '', 
      email: c.email || '', 
      phone: c.phone || '', 
      is_primary: c.is_primary 
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    let res;
    if (editingContact) {
      res = await vendorContactsApi.update(editingContact.id, form);
    } else {
      res = await vendorContactsApi.create({ ...form, vendor_id: vendorId });
    }

    setSubmitting(false);
    if ('error' in res) {
      toastError(res.error || 'Operation failed');
    } else {
      toastSuccess(editingContact ? 'Contact updated' : 'Contact added');
      setShowModal(false);
      loadContacts();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    const res = await vendorContactsApi.delete(id);
    if (!('error' in res)) {
      toastSuccess('Contact removed');
      loadContacts();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-foreground">Vendor Contacts</h3>
          <p className="text-xs text-muted-foreground">Manage authorized representatives and primary contacts.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl font-semibold text-sm hover:bg-orange-700 transition-all"
        >
          <UserPlus className="w-4 h-4" /> New contact
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed border-border">
           <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-20" />
           <p className="text-sm text-muted-foreground">No contacts defined for this vendor.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-border">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full Name</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Position</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Primary</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-4 py-4 text-sm font-semibold text-foreground">
                    {c.first_name} {c.last_name}
                  </td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">{c.email || '—'}</td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">{c.position || '—'}</td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">{c.phone || '—'}</td>
                  <td className="px-4 py-4">
                    {c.is_primary ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground opacity-20" />
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                       <button onClick={() => handleOpenEdit(c)} className="p-1.5 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-all">
                          <Edit2 className="w-3.5 h-3.5" />
                       </button>
                       <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Contact Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-lg rounded-3xl shadow-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h4 className="font-bold text-foreground">{editingContact ? 'Update Contact' : 'Create New Contact'}</h4>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">First Name *</label>
                  <input
                    required
                    className="w-full px-4 py-2 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Last Name</label>
                  <input
                    className="w-full px-4 py-2 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Position / Title</label>
                <input
                  placeholder="e.g. Sales Manager"
                  className="w-full px-4 py-2 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-2 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone Number</label>
                <input
                  type="tel"
                  className="w-full px-4 py-2 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <label className="flex items-center gap-3 p-4 bg-muted/20 rounded-2xl border border-border cursor-pointer hover:bg-muted/40 transition-colors">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-border text-orange-600 focus:ring-orange-500/20"
                  checked={form.is_primary}
                  onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
                />
                <span className="text-sm font-semibold text-foreground">Mark as Primary Contact</span>
              </label>

              <div className="flex gap-2 pt-4">
                 <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-border rounded-xl font-semibold text-sm hover:bg-muted transition-colors">Cancel</button>
                 <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-xl font-semibold text-sm hover:bg-orange-700 transition-colors">
                   {submitting ? 'Saving...' : editingContact ? 'Update Contact' : 'Add Contact'}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function VendorQuotationsTab({ vendorId, currency }: { vendorId: number; currency: string }) {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    quotationsApi.list({ vendor_id: vendorId }).then(res => {
      setLoading(false);
      if (!('error' in res)) {
        setQuotations(res.data || []);
      }
    });
  }, [vendorId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-foreground">Quotations</h3>
          <p className="text-xs text-muted-foreground">Historical quotes and pricing proposals from this vendor.</p>
        </div>
        <Link 
          href={`/dashboard/quotations/new?vendor_id=${vendorId}`}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl font-semibold text-sm hover:bg-orange-700 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Quote
        </Link>
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full rounded-3xl" />
      ) : quotations.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed border-border">
           <FileSpreadsheet className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-20" />
           <p className="text-sm text-muted-foreground">No quotations found for this vendor.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quote #</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {quotations.map(q => (
                <tr key={q.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-foreground">#{q.quotation_number}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(q.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm font-bold text-foreground">{q.currency || currency} {q.grand_total}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-bold uppercase">{q.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/dashboard/quotations/${q.id}/edit`} className="text-orange-600 hover:underline text-xs font-bold">Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function VendorPurchaseOrdersTab({ vendorId, currency }: { vendorId: number; currency: string }) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    purchaseOrdersApi.list({ vendor_id: vendorId }).then(res => {
      setLoading(false);
      if (!('error' in res)) {
        setOrders(res.data || []);
      }
    });
  }, [vendorId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-foreground">Purchase Orders</h3>
          <p className="text-xs text-muted-foreground">All purchase orders issued to this supplier.</p>
        </div>
        <Link 
          href={`/dashboard/purchase-orders/new?vendor_id=${vendorId}`}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl font-semibold text-sm hover:bg-orange-700 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" /> New PO
        </Link>
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full rounded-3xl" />
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed border-border">
           <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-20" />
           <p className="text-sm text-muted-foreground">No purchase orders found.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">PO #</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payment</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map(o => (
                <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-foreground">{o.po_number}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(o.order_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm font-bold text-foreground">{o.currency} {o.grand_total}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${o.status === 'received' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${o.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {o.payment_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/dashboard/purchase-orders/${o.id}`} className="text-orange-600 hover:bg-orange-50 p-2 rounded-lg transition-colors inline-block">
                       <Eye className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function VendorPaymentsTab({ vendorId, currency }: { vendorId: number; currency: string }) {
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'payments' | 'refunds'>('payments');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      vendorPaymentsApi.list({ vendor_id: vendorId }),
      vendorPaymentsApi.listRefunds({ vendor_id: vendorId })
    ]).then(([payRes, refRes]) => {
      setLoading(false);
      if (!('error' in payRes)) setPayments(payRes.data || []);
      if (!('error' in refRes)) setRefunds(refRes.data || []);
    });
  }, [vendorId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Settlement History</h3>
          <p className="text-xs text-muted-foreground">Log of all payments sent and refunds received.</p>
        </div>
        
        <div className="flex p-1 bg-muted/20 border border-border rounded-xl">
           <button 
             onClick={() => setActiveSubTab('payments')}
             className={cn(
               "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
               activeSubTab === 'payments' ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-muted-foreground hover:text-foreground"
             )}
           >
             Payments Made
           </button>
           <button 
             onClick={() => setActiveSubTab('refunds')}
             className={cn(
               "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
               activeSubTab === 'refunds' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-muted-foreground hover:text-foreground"
             )}
           >
             Refunds Received
           </button>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full rounded-3xl" />
      ) : activeSubTab === 'payments' ? (
        payments.length === 0 ? (
          <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed border-border">
             <Wallet className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-20" />
             <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ref #</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">PO #</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Method</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-foreground">{new Date(p.payment_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{p.reference_number || '—'}</td>
                    <td className="px-6 py-4 text-xs font-bold text-orange-600">PO #{p.purchase_order?.po_number}</td>
                    <td className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{p.payment_method}</td>
                    <td className="px-6 py-4 text-right font-black text-foreground">{currency} {p.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        refunds.length === 0 ? (
          <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed border-border">
             <TrendingDown className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-20" />
             <p className="text-sm text-muted-foreground">No refunds received from this vendor yet.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ref #</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Return #</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Method</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Refund Amt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {refunds.map(r => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-foreground">{new Date(r.refund_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{r.reference_number || '—'}</td>
                    <td className="px-6 py-4 text-xs font-bold text-emerald-600">{r.purchase_order_return?.return_number || 'General'}</td>
                    <td className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{r.payment_method}</td>
                    <td className="px-6 py-4 text-right font-black text-emerald-600">{currency} {r.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

function VendorStatementTab({ vendorId, currency }: { vendorId: number; currency: string }) {
  const [statement, setStatement] = useState<VendorStatementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('month'); // month, quarter, year, custom
  const [dates, setDates] = useState({ 
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  // Refund Modal State
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refundForm, setRefundForm] = useState({
    refund_date: new Date().toISOString().split('T')[0],
    amount: 0,
    payment_method: 'Cash',
    reference_number: '',
    note: ''
  });

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await vendorPaymentsApi.recordRefund({
      vendor_id: vendorId,
      ...refundForm
    });
    setSubmitting(false);

    if (!('error' in res)) {
      toastSuccess('Refund recorded and balance updated');
      setShowRefundModal(false);
      loadStatement();
    } else {
      toastError(res.error);
    }
  };

  const loadStatement = async () => {
    setLoading(true);
    const res = await vendorPaymentsApi.getStatement({ vendor_id: vendorId, ...dates });
    setLoading(false);
    if (!('error' in res)) {
      setStatement(res.data || null);
    }
  };

  useEffect(() => {
    loadStatement();
  }, [vendorId, dates]);

  const handleRangeChange = (r: string) => {
    setRange(r);
    const to = new Date().toISOString().split('T')[0];
    let from = '';
    
    if (r === 'month') {
      from = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    } else if (r === 'year') {
      from = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    } else if (r === 'last_month') {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    }

    if (from) setDates({ from, to });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Account Statement</h3>
          <p className="text-xs text-muted-foreground">Transaction log showing all purchases (debits) and payments (credits).</p>
        </div>
        
        <div className="flex items-center gap-2">
           <button 
             onClick={() => {
                const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/vendor-statements/pdf?vendor_id=${vendorId}&from=${dates.from}&to=${dates.to}`;
                downloadFile(url, `Statement-${vendorId}.pdf`);
             }}
             className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-zinc-700 hover:text-white transition-all flex items-center gap-1.5 shadow-xl mr-2"
           >
             <FileText className="w-3 h-3" />
             Download PDF
           </button>
           {statement && statement.summary.balance < 0 && (
              <button 
                onClick={() => setShowRefundModal(true)}
                className="px-3 py-1.5 bg-emerald-500 text-emerald-950 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-400 transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 mr-2"
              >
                <Plus className="w-3 h-3" />
                Record Refund
              </button>
           )}
           <select 
             className="px-3 py-1.5 bg-muted/20 border border-border rounded-xl text-xs font-bold"
             value={range}
             onChange={(e) => handleRangeChange(e.target.value)}
           >
              <option value="month">Current Month</option>
              <option value="last_month">Last Month</option>
              <option value="year">Current Year</option>
              <option value="custom">Custom Range</option>
           </select>
           {range === 'custom' && (
              <div className="flex items-center gap-2">
                 <input 
                   type="date" 
                   className="px-2 py-1 bg-muted/20 border border-border rounded-lg text-xs"
                   value={dates.from}
                   onChange={(e) => setDates({ ...dates, from: e.target.value })}
                 />
                 <span className="text-muted-foreground text-xs">to</span>
                 <input 
                   type="date" 
                   className="px-2 py-1 bg-muted/20 border border-border rounded-lg text-xs"
                   value={dates.to}
                   onChange={(e) => setDates({ ...dates, to: e.target.value })}
                 />
              </div>
           )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="p-4 bg-muted/20 border border-border rounded-2xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Purchases</p>
            <p className="text-xl font-black text-foreground">{currency} {statement?.summary.total_debit.toLocaleString() || '0'}</p>
         </div>
         <div className="p-4 bg-muted/20 border border-border rounded-2xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Paid/Returned</p>
            <p className="text-xl font-black text-green-600">{currency} {statement?.summary.total_credit.toLocaleString() || '0'}</p>
         </div>
         <div className={cn(
           "p-4 rounded-2xl shadow-lg",
           statement && statement.summary.balance < 0 
            ? "bg-emerald-600 shadow-emerald-600/20" 
            : "bg-orange-600 shadow-orange-600/20"
         )}>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">
              {statement && statement.summary.balance < 0 ? 'Vendor Credit' : 'Current Balance'}
            </p>
            <p className="text-xl font-black text-white">{currency} {Math.abs(statement?.summary.balance || 0).toLocaleString()}</p>
         </div>
      </div>

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-zinc-800 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-zinc-100">Record Vendor Refund</h2>
                <p className="text-sm text-zinc-500 font-medium">Record cash/bank back from vendor</p>
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
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Amount ({currency})</label>
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

      {loading ? (
        <Skeleton className="h-64 w-full rounded-3xl" />
      ) : !statement || statement.transactions.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed border-border">
           <BookText className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-20" />
           <p className="text-sm text-muted-foreground">No transactions found for the selected period.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-right">Debit (+)</th>
                <th className="px-6 py-4 text-right">Credit (-)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {statement.transactions.map((tx, idx) => (
                <tr key={idx} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(tx.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       {tx.type === 'Payment' ? <Wallet2 className="w-3.5 h-3.5 text-green-500" /> : <Boxes className="w-3.5 h-3.5 text-blue-500" />}
                       <span className="text-xs font-bold text-foreground">{tx.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-black tracking-tighter text-muted-foreground">{tx.reference}</td>
                  <td className="px-6 py-4 text-xs text-muted-foreground italic truncate max-w-[200px]">{tx.description}</td>
                  <td className="px-6 py-4 text-right font-bold text-foreground">
                    {tx.debit > 0 ? `${currency} ${tx.debit.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-green-600">
                    {tx.credit > 0 ? `${currency} ${tx.credit.toLocaleString()}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function VendorNotesTab({ vendorId }: { vendorId: number }) {
  const [notes, setNotes] = useState<VendorNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState<VendorNote | null>(null);
  const [form, setForm] = useState({ title: '', content: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadNotes = async () => {
    setLoading(true);
    const res = await vendorNotesApi.list(vendorId);
    setLoading(false);
    if (!('error' in res)) setNotes(res.data || []);
  };

  useEffect(() => { loadNotes(); }, [vendorId]);

  const handleOpenAdd = () => {
    setEditingNote(null);
    setForm({ title: '', content: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (note: VendorNote) => {
    setEditingNote(note);
    setForm({ title: note.title, content: note.content });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = editingNote 
      ? await vendorNotesApi.update(editingNote.id, form)
      : await vendorNotesApi.create({ ...form, vendor_id: vendorId });
    setSubmitting(false);
    if (!('error' in res)) {
      toastSuccess(editingNote ? 'Note updated' : 'Note added');
      setShowModal(false);
      loadNotes();
    } else {
      toastError(res.error || 'Failed to save note');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    const res = await vendorNotesApi.delete(id);
    if (!('error' in res)) {
      toastSuccess('Note removed');
      loadNotes();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-foreground">Internal Notes</h3>
          <p className="text-xs text-muted-foreground">Keep track of important information about this vendor.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl font-semibold text-sm hover:bg-orange-700 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Note
        </button>
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full rounded-3xl" />
      ) : notes.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed border-border">
           <StickyNote className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-20" />
           <p className="text-sm text-muted-foreground">No notes recorded for this vendor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notes.map(note => (
            <div key={note.id} className="p-5 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md transition-shadow group relative">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-foreground pr-8">{note.title}</h4>
                <div className="flex gap-1">
                   <button onClick={() => handleOpenEdit(note)} className="p-1.5 hover:bg-muted rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                   <button onClick={() => handleDelete(note.id)} className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">{note.content}</p>
              <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                 <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                    {new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                 </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-lg rounded-3xl shadow-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h4 className="font-bold text-foreground">{editingNote ? 'Edit Note' : 'Add New Note'}</h4>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Title</label>
                <input
                  required
                  className="w-full px-4 py-2 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Delivery Preferences"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Content</label>
                <textarea
                  required
                  rows={6}
                  className="w-full px-4 py-2 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-orange-500/20 resize-none"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Write your note here..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 text-sm font-bold text-muted-foreground hover:bg-muted rounded-xl transition-all">Cancel</button>
                <button 
                  disabled={submitting}
                  className="px-6 py-2 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function VendorAttachmentsTab({ vendorId }: { vendorId: number }) {
  const [attachments, setAttachments] = useState<VendorAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAttachments = async () => {
    setLoading(true);
    const res = await vendorAttachmentsApi.list({ vendor_id: vendorId });
    setLoading(false);
    if (!('error' in res)) setAttachments(res.data || []);
  };

  useEffect(() => { loadAttachments(); }, [vendorId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const res = await vendorAttachmentsApi.upload(vendorId, file);
    setUploading(false);
    
    if (!('error' in res)) {
      toastSuccess('File uploaded successfully');
      loadAttachments();
    } else {
      toastError(res.error || 'Upload failed');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;
    const res = await vendorAttachmentsApi.delete(id);
    if (!('error' in res)) {
      toastSuccess('File removed');
      loadAttachments();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-foreground">Attachments</h3>
          <p className="text-xs text-muted-foreground">Store and manage contract documents, images, and PDF files.</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl font-semibold text-sm hover:bg-orange-700 transition-all shadow-sm disabled:opacity-50"
        >
          {uploading ? (
            <span className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading...</span>
          ) : (
            <><UploadCloud className="w-4 h-4" /> Upload File</>
          )}
        </button>
        <input type="file" hidden ref={fileInputRef} onChange={handleUpload} accept=".pdf,.png,.jpg,.jpeg" />
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full rounded-3xl" />
      ) : attachments.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed border-border">
           <Paperclip className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-20" />
           <p className="text-sm text-muted-foreground">No attachments found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {attachments.map(file => {
            const isImage = file.file_type.includes('image');
            return (
              <div key={file.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                <div className="aspect-video bg-muted/30 flex items-center justify-center relative overflow-hidden border-b border-border">
                  {isImage ? (
                    <img src={file.url} alt={file.file_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                       <FileIcon className="w-10 h-10 text-muted-foreground opacity-30" />
                       <span className="text-[10px] font-black uppercase text-muted-foreground">PDF Document</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                     <a href={file.url} target="_blank" rel="noopener noreferrer" className="p-2 bg-white text-black rounded-lg hover:scale-110 transition-transform">
                        <Eye className="w-4 h-4" />
                     </a>
                     <button 
                       onClick={() => downloadFile(`http://localhost:8000/api/vendor-attachments/${file.id}/download`, file.file_name)}
                       className="p-2 bg-white text-black rounded-lg hover:scale-110 transition-transform"
                     >
                        <Download className="w-4 h-4" />
                     </button>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{file.file_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-muted-foreground">{(file.file_size / 1024).toFixed(1)} KB</p>
                        {file.purchase_order && (
                           <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded uppercase">
                              {file.purchase_order.po_number}
                           </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(file.id)} className="p-1 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
