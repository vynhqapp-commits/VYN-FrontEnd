'use client';

import { useEffect, useState } from 'react';
import { Eye, Mail, MessageCircle, Phone, RefreshCw, Users, X, ChevronDown, Check, Search, Send } from 'lucide-react';
import { clientsApi, debtApi, settingsApi, type Client, type ClientMembership, type ClientPackage, type ClientStats } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { Skeleton } from '@/components/ui/skeleton';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import * as React from 'react';
import { usePhoneInput, defaultCountries, parseCountry, FlagImage, CountryIso2 } from 'react-international-phone';
import 'react-international-phone/style.css';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const parsedCountries = defaultCountries.map(c => parseCountry(c));

function GenericPhoneInput({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  const phoneInput = usePhoneInput({
    defaultCountry: 'us',
    value: value || '',
    onChange: ({ phone }) => onChange(phone),
  });

  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredCountries = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return parsedCountries;
    return parsedCountries.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.dialCode.includes(q) || 
      c.iso2.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className={cn(
      "flex h-11 w-full items-center rounded-xl border border-[var(--elite-border)] bg-[var(--elite-surface)] pl-1.5 pr-1 transition-all focus-within:ring-2 focus-within:ring-orange-500/30 focus-within:border-orange-600/50",
      className
    )}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            type="button"
            variant="ghost" 
            role="combobox"
            aria-expanded={open}
            className="h-8 flex items-center gap-1.5 px-2 rounded-lg hover:bg-[var(--elite-card)] shrink-0 text-[var(--elite-text)]"
          >
            <div className="flex items-center gap-1">
              <FlagImage iso2={phoneInput.country.iso2} size="20px" className="rounded-sm shrink-0 pointer-events-none shadow-sm" />
              <ChevronDown className="w-3 h-3 text-[var(--elite-muted)] opacity-50 shrink-0" />
            </div>
          </Button>
        </PopoverTrigger>
        
        <PopoverContent 
          className="p-0 w-[280px] sm:w-[320px] overflow-hidden bg-[var(--elite-card)] border border-[var(--elite-border)] shadow-xl rounded-xl z-[9999]" 
          align="start" 
          side="bottom" 
          sideOffset={8}
        >
          <div className="flex flex-col h-[350px]">
            <div className="flex items-center border-b border-[var(--elite-border)] px-3 py-2 bg-[var(--elite-surface)]/50">
              <Search className="w-4 h-4 text-[var(--elite-muted)] shrink-0 mr-2" />
              <input
                type="text"
                placeholder="Search country..."
                autoFocus
                className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm font-medium py-1 placeholder:text-[var(--elite-muted)]/60 text-[var(--elite-text)]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex-1 overflow-y-auto elite-scrollbar p-1 space-y-0.5">
              {filteredCountries.length === 0 ? (
                <div className="py-6 text-center text-sm text-[var(--elite-muted)]">No country found.</div>
              ) : (
                filteredCountries.map((c) => {
                  const isSelected = phoneInput.country.iso2 === c.iso2;
                  return (
                    <button
                      key={c.iso2}
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between py-2 px-3 cursor-pointer text-sm font-medium rounded-md transition-colors hover:bg-[var(--elite-surface)] hover:text-[var(--elite-text)] text-[var(--elite-text)]",
                        isSelected && "bg-[var(--elite-surface)]"
                      )}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        phoneInput.setCountry(c.iso2 as CountryIso2);
                        setOpen(false);
                        setSearchQuery('');
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        phoneInput.setCountry(c.iso2 as CountryIso2);
                        setOpen(false);
                        setSearchQuery('');
                      }}
                    >
                      <div className="flex items-center gap-2.5 pointer-events-none overflow-hidden text-left">
                        <FlagImage iso2={c.iso2} size="20px" className="rounded-sm shrink-0 shadow-sm pointer-events-none" />
                        <span className="truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 pointer-events-none">
                        <span className="text-xs text-[var(--elite-muted)]">+{c.dialCode}</span>
                        <div className={cn("w-4 flex justify-center", isSelected ? "opacity-100" : "opacity-0")}>
                          <Check className="h-3 w-3 text-orange-500" />
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <input
        type="tel"
        ref={phoneInput.inputRef}
        value={phoneInput.inputValue}
        onChange={phoneInput.handlePhoneValueChange}
        placeholder="Phone number"
        className="flex-1 h-full bg-transparent px-2 py-1 text-sm font-medium text-[var(--elite-text)] placeholder:text-[var(--elite-muted)]/60 focus:outline-none focus:ring-0 border-none ring-0 shadow-none transition-none"
      />
    </div>
  );
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openClient, setOpenClient] = useState<Client | null>(null);
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState<Array<{ id: string; note: string; created_at?: string; user?: { id: string; email?: string; name?: string } }>>([]);
  const [noteText, setNoteText] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingTags, setSavingTags] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [debtLoading, setDebtLoading] = useState(false);
  const [debtEntries, setDebtEntries] = useState<Array<{ id: string; amount: string | number; balance_after?: string | number; created_at?: string }>>([]);
  const [debtBalance, setDebtBalance] = useState(0);
  const [debtPaymentAmount, setDebtPaymentAmount] = useState('');
  const [writeOffReason, setWriteOffReason] = useState('');

  // CRM tracking modal sections (Packages, Memberships, Stats, Contact)
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  const [packages, setPackages] = useState<ClientPackage[]>([]);

  const [membershipsLoading, setMembershipsLoading] = useState(false);
  const [membershipsError, setMembershipsError] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<ClientMembership[]>([]);

  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [stats, setStats] = useState<ClientStats | null>(null);

  const [renewLoadingId, setRenewLoadingId] = useState<string | null>(null);
  const [invitingClientId, setInvitingClientId] = useState<string | null>(null);
  const [currency, setCurrency] = useState('USD');

  // Add client modal
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [addClientForm, setAddClientForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: '',
    tags: '',
  });
  const [addingClient, setAddingClient] = useState(false);

  // Edit mode
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editClientForm, setEditClientForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: '',
    tags: '',
  });
  const [updatingClient, setUpdatingClient] = useState(false);

  useEffect(() => {
    settingsApi.get().then((r) => {
      if (!('error' in r) && r.data?.salon?.currency) setCurrency(r.data.salon.currency);
    });
  }, []);

  const fmt = (amount: number) =>
    amount.toLocaleString('en-US', { style: 'currency', currency });

  const loadClients = () => {
    setLoading(true);
    clientsApi.list().then((res) => {
      setLoading(false);
      if ('error' in res && res.error) setError(res.error);
      else if (res.data?.clients) setClients(res.data.clients);
    });
  };

  useEffect(() => {
    loadClients();
  }, []);

  const openDetails = async (c: Client) => {
    setOpenClient(c);
    setEditingClientId(null);
    setTags(c.tags ?? '');
    setNotes([]);
    setNoteText('');
    setDetailLoading(true);
    const res = await clientsApi.notes(c.id);
    setDetailLoading(false);
    if ('error' in res && res.error) {
      setError(res.error);
      return;
    }
    setNotes(res.data?.notes ?? []);

    // Load debt info
    setDebtLoading(true);
    const debtRes = await debtApi.list(c.id);
    setDebtLoading(false);
    if (!('error' in debtRes) && debtRes.data) {
      const entries = debtRes.data.entries ?? [];
      setDebtEntries(entries as any);
      // Approximate balance from entries if backend doesn't send balance yet
      const bal = (debtRes.data as any).balance ?? entries.reduce((acc: number, e: any) => acc + Number(e.amount ?? 0), 0);
      setDebtBalance(Number(bal));
    } else if ('error' in debtRes && debtRes.error) {
      // don't hard-fail modal, just log inline
      setDebtEntries([]);
      setDebtBalance(0);
    }

    // Load CRM tracking sections (packages, memberships, stats)
    setPackagesLoading(true);
    setPackagesError(null);
    const pkgRes = await clientsApi.packages(c.id);
    setPackagesLoading(false);
    if (!('error' in pkgRes) && pkgRes.data?.packages) {
      setPackages(pkgRes.data.packages as ClientPackage[]);
    } else if ('error' in pkgRes && pkgRes.error) {
      setPackagesError(pkgRes.error);
      setPackages([]);
    }

    setMembershipsLoading(true);
    setMembershipsError(null);
    const memRes = await clientsApi.memberships(c.id);
    setMembershipsLoading(false);
    if (!('error' in memRes) && memRes.data?.memberships) {
      setMemberships(memRes.data.memberships as ClientMembership[]);
    } else if ('error' in memRes && memRes.error) {
      setMembershipsError(memRes.error);
      setMemberships([]);
    }

    setStatsLoading(true);
    setStatsError(null);
    const statsRes = await clientsApi.stats(c.id);
    setStatsLoading(false);
    if (!('error' in statsRes) && statsRes.data?.stats) {
      setStats(statsRes.data.stats as ClientStats);
    } else if ('error' in statsRes && statsRes.error) {
      setStatsError(statsRes.error);
      setStats(null);
    }
  };

  const saveTags = async () => {
    if (!openClient) return;
    setSavingTags(true);
    const res = await clientsApi.update(openClient.id, { tags });
    setSavingTags(false);
    if ('error' in res && res.error) {
      setError(res.error);
      return;
    }
    setOpenClient(res.data?.client ?? openClient);
    loadClients();
  };

  const addNote = async () => {
    if (!openClient || !noteText.trim()) return;
    setSavingNote(true);
    const res = await clientsApi.addNote(openClient.id, noteText.trim());
    setSavingNote(false);
    if ('error' in res && res.error) {
      setError(res.error);
      return;
    }
    setNoteText('');
    const refreshed = await clientsApi.notes(openClient.id);
    if (!('error' in refreshed) && refreshed.data?.notes) setNotes(refreshed.data.notes);
  };

  const sendWelcomeInvite = async (c: Client) => {
    if (!c || !c.email) return;
    setInvitingClientId(c.id);
    const res = await clientsApi.invite(c.id);
    setInvitingClientId(null);
    if ('error' in res && res.error) {
      toastError(res.error);
    } else {
      toastSuccess(`Welcome invitation email sent successfully to ${c.email}!`);
    }
  };

  const handleRenewMembership = async (membershipId: string) => {
    if (!openClient) return;
    setRenewLoadingId(membershipId);
    setMembershipsError(null);

    const res = await clientsApi.renewMembership(openClient.id, membershipId);
    setRenewLoadingId(null);

    if ('error' in res && res.error) {
      setMembershipsError(res.error);
      return;
    }

    // Reload CRM sections after renewal.
    setPackagesLoading(true);
    setPackagesError(null);
    const pkgRes = await clientsApi.packages(openClient.id);
    setPackagesLoading(false);
    if (!('error' in pkgRes) && pkgRes.data?.packages) {
      setPackages(pkgRes.data.packages as ClientPackage[]);
    }

    setMembershipsLoading(true);
    setMembershipsError(null);
    const memRes = await clientsApi.memberships(openClient.id);
    setMembershipsLoading(false);
    if (!('error' in memRes) && memRes.data?.memberships) {
      setMemberships(memRes.data.memberships as ClientMembership[]);
    }

    setStatsLoading(true);
    setStatsError(null);
    const statsRes = await clientsApi.stats(openClient.id);
    setStatsLoading(false);
    if (!('error' in statsRes) && statsRes.data?.stats) {
      setStats(statsRes.data.stats as ClientStats);
    }
  };

  const handleDebtPayment = async () => {
    if (!openClient) return;
    const amt = Number(debtPaymentAmount);
    if (!amt || amt <= 0) return;
    if (!debtEntries.length) return;
    const targetDebt = (debtEntries as any[]).find((e) => e?.debt_id || e?.debtId) ?? (debtEntries as any)[0];
    const targetDebtId = String(targetDebt?.debt_id ?? targetDebt?.debtId ?? targetDebt?.id ?? '');
    if (!targetDebtId) return;
    const res = await debtApi.addPayment({
      client_id: openClient.id,
      amount: amt,
      debt_id: targetDebtId,
    });
    if ('error' in res && res.error) {
      setError(res.error);
      return;
    }
    setDebtPaymentAmount('');
    // Refresh debt list
    const debtRes = await debtApi.list(openClient.id);
    if (!('error' in debtRes) && debtRes.data) {
      const entries = debtRes.data.entries ?? [];
      setDebtEntries(entries as any);
      const bal = (debtRes.data as any).balance ?? entries.reduce((acc: number, e: any) => acc + Number(e.amount ?? 0), 0);
      setDebtBalance(Number(bal));
    }
  };

  const handleRequestWriteOff = async () => {
    if (!openClient || debtBalance <= 0) return;
    const targetDebt = (debtEntries as any[]).find((e) => e?.debt_id || e?.debtId) ?? (debtEntries as any)[0];
    const targetDebtId = String(targetDebt?.debt_id ?? targetDebt?.debtId ?? targetDebt?.id ?? '');
    if (!targetDebtId) return;
    const res = await debtApi.requestWriteOff(targetDebtId, writeOffReason || undefined);
    if ('error' in res && res.error) {
      setError(res.error);
      return;
    }
    setWriteOffReason('');
    const debtRes = await debtApi.list(openClient.id);
    if (!('error' in debtRes) && debtRes.data) {
      const entries = debtRes.data.entries ?? [];
      setDebtEntries(entries as any);
      const bal = (debtRes.data as any).balance ?? entries.reduce((acc: number, e: any) => acc + Number(e.amount ?? 0), 0);
      setDebtBalance(Number(bal));
    }
  };

  const handleAddClient = async () => {
    if (!addClientForm.full_name.trim()) {
      toastError('Please enter client name');
      return;
    }
    setAddingClient(true);
    const res = await clientsApi.create({
      full_name: addClientForm.full_name.trim(),
      phone: addClientForm.phone.trim() || undefined,
      email: addClientForm.email.trim() || undefined,
      password: addClientForm.password.trim() || undefined,
      tags: addClientForm.tags.trim() || undefined,
    });
    setAddingClient(false);
    if ('error' in res && res.error) {
      toastError(res.error);
      return;
    }
    toastSuccess(`Client "${addClientForm.full_name}" added successfully`);
    setAddClientForm({ full_name: '', phone: '', email: '', password: '', tags: '' });
    setShowAddClientModal(false);
    loadClients();
  };

  const startEditingClient = (c: Client) => {
    setEditingClientId(c.id);
    setEditClientForm({
      full_name: c.full_name,
      phone: c.phone || '',
      email: c.email || '',
      password: '',
      tags: c.tags || '',
    });
  };

  const handleUpdateClient = async () => {
    if (!editClientForm.full_name.trim()) {
      toastError('Please enter client name');
      return;
    }
    if (!openClient) return;
    setUpdatingClient(true);
    const res = await clientsApi.update(openClient.id, {
      full_name: editClientForm.full_name.trim(),
      phone: editClientForm.phone.trim() || undefined,
      email: editClientForm.email.trim() || undefined,
      password: editClientForm.password.trim() || undefined,
      tags: editClientForm.tags.trim() || undefined,
    });
    setUpdatingClient(false);
    if ('error' in res && res.error) {
      toastError(res.error);
      return;
    }
    toastSuccess(`Client updated successfully`);
    setEditingClientId(null);
    loadClients();
    
    // Refresh the open client details with the fresh response data from the API
    if ('data' in res && res.data?.client) {
      openDetails(res.data.client);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    );
  }
  if (error) return <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl">{error}</div>;

  return (
    <div>
      <DashboardPageHeader
        className="mb-4"
        title="Clients"
        icon={<Users className="w-5 h-5" />}
        rightSlot={
          <button
            onClick={() => setShowAddClientModal(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium text-sm hover:bg-orange-700 transition"
          >
            + Add Client
          </button>
        }
      />
      {/* Mobile list (cards) */}
      <div className="md:hidden space-y-3">
        {clients.length === 0 ? (
          <div className="bg-card rounded-xl border border-border shadow-sm p-6 text-muted-foreground text-center">
            No clients found.
          </div>
        ) : (
          clients.map((c) => (
            <div
              key={c.id}
              className="bg-card rounded-2xl border border-border shadow-sm p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {c.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    <a
                      href={c.phone ? `tel:${c.phone}` : '#'}
                      onClick={(e) => {
                        if (!c.phone) e.preventDefault();
                      }}
                      className={c.phone ? 'hover:underline' : 'cursor-default'}
                    >
                      {c.phone ?? '—'}
                    </a>{' '}
                    ·{' '}
                    <a
                      href={c.email ? `mailto:${c.email}` : '#'}
                      onClick={(e) => {
                        if (!c.email) e.preventDefault();
                      }}
                      className={c.email ? 'hover:underline' : 'cursor-default'}
                    >
                      {c.email ?? '—'}
                    </a>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    Tags: {c.tags ?? '—'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openDetails(c)}
                  className="shrink-0 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
                >
                  View
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {clients.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 text-sm text-foreground">{c.full_name}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {c.phone ? (
                    <a className="hover:underline" href={`tel:${c.phone}`}>
                      {c.phone}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {c.email ? (
                    <a className="hover:underline" href={`mailto:${c.email}`}>
                      {c.email}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{c.tags ?? '—'}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openDetails(c)}
                      aria-label="View client details"
                      title="View client details"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-[var(--elite-border-2)] text-[var(--elite-text)] hover:bg-[var(--elite-card-2)] transition-colors"
                    >
                      <Eye className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        openDetails(c);
                        setTimeout(() => startEditingClient(c), 100);
                      }}
                      aria-label="Edit client"
                      title="Edit client"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-[var(--elite-border-2)] text-[var(--elite-text)] hover:bg-[var(--elite-card-2)] transition-colors"
                    >
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {c.email ? (
                      <button
                        type="button"
                        disabled={invitingClientId === c.id}
                        onClick={() => sendWelcomeInvite(c)}
                        aria-label="Send welcome email"
                        title="Send welcome email"
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-[var(--elite-border-2)] text-[var(--elite-text)] hover:bg-[var(--elite-card-2)] disabled:opacity-45 transition-colors"
                      >
                        {invitingClientId === c.id ? (
                          <RefreshCw className="size-4 animate-spin" />
                        ) : (
                          <Send className="size-4 text-orange-600" />
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        aria-label="No email recorded"
                        title="No email recorded"
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-[var(--elite-border-2)] text-muted-foreground/30 cursor-not-allowed"
                      >
                        <Send className="size-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {clients.length === 0 && (
          <p className="p-6 text-muted-foreground text-center">No clients found.</p>
        )}
      </div>

      {openClient && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[1px] p-2 sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpenClient(null)}
        >
          <div
            className="elite-scrollbar bg-card rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-4 sm:px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-semibold text-foreground">{openClient.full_name}</h2>
                  <p className="text-muted-foreground text-sm">{openClient.email ?? '—'} · {openClient.phone ?? '—'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenClient(null)}
                  className="p-2 rounded-xl text-muted-foreground hover:bg-accent transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-4 sm:px-6 py-6 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-4 space-y-6">
                {/* Edit Profile Section */}
                {editingClientId === openClient.id ? (
                  <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Edit Profile</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Full Name</label>
                        <input
                          type="text"
                          value={editClientForm.full_name}
                          onChange={(e) => setEditClientForm({ ...editClientForm, full_name: e.target.value })}
                          className="w-full border border-border rounded-xl px-3 py-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
                          placeholder="Client name"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Phone</label>
                        <GenericPhoneInput 
                          value={editClientForm.phone}
                          onChange={(val) => setEditClientForm({ ...editClientForm, phone: val })}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Email</label>
                        <input
                          type="email"
                          value={editClientForm.email}
                          onChange={(e) => setEditClientForm({ ...editClientForm, email: e.target.value })}
                          className="w-full border border-border rounded-xl px-3 py-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
                          placeholder="email@example.com"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Password</label>
                        <input
                          type="password"
                          value={editClientForm.password}
                          onChange={(e) => setEditClientForm({ ...editClientForm, password: e.target.value })}
                          className="w-full border border-border rounded-xl px-3 py-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
                          placeholder="Leave empty to keep current password"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Leave empty to keep the current password unchanged</p>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingClientId(null)}
                          className="flex-1 px-4 py-2 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-accent transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleUpdateClient}
                          disabled={updatingClient}
                          className="flex-1 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-40"
                        >
                          {updatingClient ? 'Saving…' : 'Save changes'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-1">Profile</h3>
                        <p className="text-xs text-muted-foreground">View and update client information</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => startEditingClient(openClient)}
                        className="px-3 py-1.5 rounded-lg border border-border text-foreground text-xs font-semibold hover:bg-accent transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="mt-3 space-y-2 text-xs">
                      <p><span className="text-muted-foreground">Name:</span> <span className="text-foreground font-medium">{openClient.full_name}</span></p>
                      <p><span className="text-muted-foreground">Phone:</span> <span className="text-foreground font-medium">{openClient.phone || '—'}</span></p>
                      <p><span className="text-muted-foreground">Email:</span> <span className="text-foreground font-medium">{openClient.email || '—'}</span></p>
                    </div>
                  </div>
                )}

                <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-foreground mb-1">Tags</h3>
                  <p className="text-xs text-muted-foreground mb-3">Comma separated (e.g. VIP, color, prefers_morning)</p>
                  <input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full border border-border rounded-xl px-3 py-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
                    placeholder="VIP, ..."
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={saveTags}
                      disabled={savingTags}
                      className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-40"
                    >
                      {savingTags ? 'Saving…' : 'Save tags'}
                    </button>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Notes</h3>
                  <div className="elite-scrollbar border border-border rounded-xl p-3 bg-muted/40 max-h-64 overflow-auto">
                    {detailLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full rounded-xl" />
                        <Skeleton className="h-12 w-full rounded-xl" />
                      </div>
                    ) : notes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No notes yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {notes.map((n) => (
                          <div key={n.id} className="bg-card border border-border rounded-xl p-3">
                            <p className="text-sm text-foreground">{n.note}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {n.user?.email ?? n.user?.name ?? 'Staff'}{n.created_at ? ` · ${new Date(n.created_at).toLocaleString()}` : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      className="flex-1 w-full border border-border rounded-xl px-3 py-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
                      placeholder="Add a note..."
                    />
                    <button
                      type="button"
                      onClick={addNote}
                      disabled={savingNote || !noteText.trim()}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-40"
                    >
                      {savingNote ? 'Adding…' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-6">
                <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Debt</h3>
                  <div className="border border-border rounded-xl p-3 bg-muted/40 space-y-2">
                  {debtLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-10 w-full rounded-xl" />
                    </div>
                  ) : (
                    <>
                      <p className="text-sm">
                        Outstanding balance:{' '}
                        <span className="font-semibold text-foreground">
                          {fmt(typeof debtBalance === 'number' ? debtBalance : Number(debtBalance || 0))}
                        </span>
                      </p>
                      {debtBalance > 0 && (
                        <>
                          <div className="flex flex-col gap-2 mt-2 sm:flex-row">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={debtPaymentAmount}
                              onChange={(e) => setDebtPaymentAmount(e.target.value)}
                              className="flex-1 w-full border border-border rounded-xl px-3 py-2 bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
                              placeholder="Payment amount"
                            />
                            <button
                              type="button"
                              disabled={!debtPaymentAmount}
                              onClick={handleDebtPayment}
                              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40"
                            >
                              Record payment
                            </button>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Applies to the oldest open debt entry.
                          </p>
                          <div className="flex flex-col gap-2 mt-2 sm:flex-row">
                            <input
                              type="text"
                              value={writeOffReason}
                              onChange={(e) => setWriteOffReason(e.target.value)}
                              className="flex-1 w-full border border-border rounded-xl px-3 py-2 bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
                              placeholder="Write-off reason (optional)"
                            />
                            <button
                              type="button"
                              onClick={handleRequestWriteOff}
                              className="w-full sm:w-auto px-4 py-2 rounded-xl border border-amber-300 text-amber-700 text-sm font-semibold hover:bg-amber-50"
                            >
                              Request write-off
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Packages</h3>
                    <div className="border border-border rounded-xl p-3 bg-muted/40 space-y-2">
                    {packagesLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full rounded-xl" />
                        <Skeleton className="h-12 w-full rounded-xl" />
                      </div>
                    ) : packages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No packages found.</p>
                    ) : (
                      <div className="space-y-2">
                        {packages.map((p) => (
                          <div
                            key={p.id}
                            className="bg-card border border-border rounded-xl p-3"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  {p.name ?? 'Package'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Expires: {p.expires_at ? p.expires_at : '—'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-foreground">
                                  {p.remaining_services}
                                </p>
                                <p className="text-[11px] text-muted-foreground">Remaining</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {packagesError && <p className="text-sm text-red-600">{packagesError}</p>}
                  </div>
                  </div>

                  <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Membership</h3>
                    <div className="border border-border rounded-xl p-3 bg-muted/40 space-y-2">
                    {membershipsLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full rounded-xl" />
                        <Skeleton className="h-12 w-full rounded-xl" />
                      </div>
                    ) : memberships.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No memberships found.</p>
                    ) : (
                      <div className="space-y-2">
                        {memberships.map((m) => (
                          <div
                            key={m.id}
                            className="bg-card border border-border rounded-xl p-3"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  {m.name ?? m.plan ?? 'Membership'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Next renewal: {m.renewal_date ? m.renewal_date : '—'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Remaining credits: {m.remaining_services}
                                </p>
                                {m.status === 'active' && (
                                  <label className="flex items-center gap-2 text-xs text-muted-foreground mt-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={!!m.auto_renew}
                                      onChange={async (e) => {
                                        if (!openClient) return;
                                        const res = await clientsApi.toggleAutoRenew(openClient.id, m.id, e.target.checked);
                                        if ('error' in res && res.error) {
                                          toastError(res.error);
                                        } else {
                                          setMemberships((prev) => prev.map((x) => x.id === m.id ? { ...x, auto_renew: e.target.checked } : x));
                                          toastSuccess(e.target.checked ? 'Auto-renew enabled' : 'Auto-renew disabled');
                                        }
                                      }}
                                      className="size-3.5"
                                    />
                                    Auto-renew
                                  </label>
                                )}
                              </div>
                              {m.status === 'active' && (
                                <button
                                  type="button"
                                  disabled={renewLoadingId === m.id}
                                  onClick={() => handleRenewMembership(m.id)}
                                  className="shrink-0 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40"
                                >
                                  {renewLoadingId === m.id ? 'Renewing…' : (
                                    <span className="inline-flex items-center gap-2">
                                      <RefreshCw className="w-4 h-4" />
                                      Renew
                                    </span>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {membershipsError && <p className="text-sm text-red-600">{membershipsError}</p>}
                  </div>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Stats</h3>
                    <div className="border border-border rounded-xl p-3 bg-muted/40 space-y-2">
                    {statsLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ) : stats ? (
                      <div className="space-y-1">
                        <p className="text-sm">
                          Total spent:{' '}
                          <span className="font-semibold text-foreground">
                            {fmt(Number(stats.total_spent ?? 0))}
                          </span>
                        </p>
                        <p className="text-sm">
                          Avg ticket:{' '}
                          <span className="font-semibold text-foreground">
                            {fmt(Number(stats.avg_ticket ?? 0))}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Invoice count: {stats.invoice_count ?? 0}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No stats yet.</p>
                    )}
                    {statsError && <p className="text-sm text-red-600">{statsError}</p>}
                  </div>
                  </div>

                  <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Contact</h3>
                    <div className="border border-border rounded-xl p-3 bg-muted/40 space-y-2">
                    <div className="flex flex-col gap-2">
                      <a
                        href={openClient?.phone ? `tel:${openClient.phone}` : '#'}
                        onClick={(e) => {
                          if (!openClient?.phone) e.preventDefault();
                        }}
                        className="w-full px-4 py-2 rounded-xl bg-card border border-border text-foreground text-sm font-semibold hover:bg-accent disabled:opacity-40 inline-flex items-center justify-center gap-2"
                      >
                        <Phone className="w-4 h-4" />
                        Call
                      </a>
                      <a
                        href={openClient?.phone ? `sms:${openClient.phone}` : '#'}
                        onClick={(e) => {
                          if (!openClient?.phone) e.preventDefault();
                        }}
                        className="w-full px-4 py-2 rounded-xl bg-card border border-border text-foreground text-sm font-semibold hover:bg-accent disabled:opacity-40 inline-flex items-center justify-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        SMS
                      </a>
                      <a
                        href={openClient?.email ? `mailto:${openClient.email}` : '#'}
                        onClick={(e) => {
                          if (!openClient?.email) e.preventDefault();
                        }}
                        className="w-full px-4 py-2 rounded-xl bg-card border border-border text-foreground text-sm font-semibold hover:bg-accent disabled:opacity-40 inline-flex items-center justify-center gap-2"
                      >
                        <Mail className="w-4 h-4" />
                        Email
                      </a>
                      {openClient?.email && (
                        <button
                          type="button"
                          disabled={invitingClientId === openClient.id}
                          onClick={() => sendWelcomeInvite(openClient)}
                          className="w-full px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold disabled:opacity-40 inline-flex items-center justify-center gap-2 transition-colors shadow-sm"
                        >
                          {invitingClientId === openClient.id ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              Send Welcome Invite
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    {( !openClient?.phone && !openClient?.email) && (
                      <p className="text-sm text-muted-foreground">No phone/email available.</p>
                    )}
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[1px]" onClick={() => setShowAddClientModal(false)}>
          <div className="relative bg-[var(--elite-surface)] border border-[var(--elite-border)] rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold elite-title">Add New Client</h3>
              <button
                onClick={() => setShowAddClientModal(false)}
                className="rounded-lg p-1.5 hover:bg-[var(--elite-card)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium elite-title mb-1">
                  Full Name <span className="text-orange-600">*</span>
                </label>
                <input
                  type="text"
                  value={addClientForm.full_name}
                  onChange={(e) => setAddClientForm({ ...addClientForm, full_name: e.target.value })}
                  placeholder="Client name"
                  className="w-full elite-input rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium elite-title mb-1">Phone</label>
                <GenericPhoneInput 
                  value={addClientForm.phone}
                  onChange={(val) => setAddClientForm({ ...addClientForm, phone: val })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium elite-title mb-1">Email</label>
                <input
                  type="email"
                  value={addClientForm.email}
                  onChange={(e) => setAddClientForm({ ...addClientForm, email: e.target.value })}
                  placeholder="client@example.com"
                  className="w-full elite-input rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium elite-title mb-1">Password</label>
                <input
                  type="password"
                  value={addClientForm.password}
                  onChange={(e) => setAddClientForm({ ...addClientForm, password: e.target.value })}
                  placeholder="Optional password for login"
                  className="w-full elite-input rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium elite-title mb-1">Tags</label>
                <input
                  type="text"
                  value={addClientForm.tags}
                  onChange={(e) => setAddClientForm({ ...addClientForm, tags: e.target.value })}
                  placeholder="e.g. VIP, Referral"
                  className="w-full elite-input rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddClientModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-[var(--elite-border)] text-foreground text-sm font-medium hover:bg-[var(--elite-card)]"
              >
                Cancel
              </button>
              <button
                onClick={handleAddClient}
                disabled={addingClient}
                className="flex-1 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
              >
                {addingClient ? 'Adding...' : 'Add Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
