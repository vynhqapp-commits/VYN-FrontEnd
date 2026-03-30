'use client';

import { useEffect, useState } from 'react';
import { commissionApi, CommissionRecord, CommissionRule } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, BadgePercent, TrendingUp } from 'lucide-react';

// ─── helpers ─────────────────────────────────────────────────────────────────

const RULE_TYPES: { value: string; label: string }[] = [
  { value: 'percent_service',  label: 'Percent of service revenue' },
  { value: 'percent_product',  label: 'Percent of product sales'   },
  { value: 'flat_per_service', label: 'Flat amount per service'    },
  { value: 'tiered',           label: 'Tiered (threshold-based)'   },
];

function typeLabel(t: string) {
  return RULE_TYPES.find((r) => r.value === t)?.label ?? t;
}

// ─── Rule Modal ───────────────────────────────────────────────────────────────

interface RuleForm {
  type: string;
  value: string;
  tier_threshold: string;
  is_active: boolean;
}

const emptyForm = (): RuleForm => ({ type: 'percent_service', value: '', tier_threshold: '', is_active: true });

function RuleModal({
  rule,
  onClose,
  onSaved,
}: {
  rule: CommissionRule | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<RuleForm>(
    rule
      ? { type: rule.type, value: String(rule.value), tier_threshold: rule.tier_threshold != null ? String(rule.tier_threshold) : '', is_active: rule.is_active }
      : emptyForm(),
  );
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.value || Number(form.value) <= 0) {
      toast.error('Value must be greater than 0.');
      return;
    }
    setSaving(true);
    const body = {
      type: form.type,
      value: Number(form.value),
      tier_threshold: form.tier_threshold ? Number(form.tier_threshold) : undefined,
      is_active: form.is_active,
    };
    const { error } = rule
      ? await commissionApi.updateRule(rule.id, body)
      : await commissionApi.createRule(body);
    setSaving(false);
    if (error) { toast.error(error); return; }
    toast.success(rule ? 'Rule updated.' : 'Rule created.');
    onSaved();
    onClose();
  };

  const set = (k: keyof RuleForm, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <form
        onSubmit={submit}
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-salon-gold/10 flex items-center justify-center">
              <BadgePercent className="size-4 text-salon-gold" />
            </div>
            <h2 className="font-display text-lg font-semibold text-salon-espresso">
              {rule ? 'Edit rule' : 'New commission rule'}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="size-7 flex items-center justify-center rounded-lg text-salon-stone hover:bg-salon-sand/40 transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-salon-stone mb-1">
              Rule type <span className="text-red-500">*</span>
            </label>
            <select
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
              className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 text-sm bg-salon-cream/50 focus:outline-none focus:ring-2 focus:ring-salon-gold/30"
            >
              {RULE_TYPES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-salon-stone mb-1">
                Value {form.type.startsWith('percent') ? '(%)' : '(amount)'} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.value}
                onChange={(e) => set('value', e.target.value)}
                placeholder={form.type.startsWith('percent') ? '0–100' : '0.00'}
                className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 text-sm bg-salon-cream/50 focus:outline-none focus:ring-2 focus:ring-salon-gold/30"
                required
              />
            </div>

            {form.type === 'tiered' && (
              <div>
                <label className="block text-xs font-medium text-salon-stone mb-1">
                  Tier threshold
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.tier_threshold}
                  onChange={(e) => set('tier_threshold', e.target.value)}
                  placeholder="Min revenue"
                  className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 text-sm bg-salon-cream/50 focus:outline-none focus:ring-2 focus:ring-salon-gold/30"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => set('is_active', e.target.checked)}
              className="rounded border-salon-sand/60"
            />
            <label htmlFor="is_active" className="text-sm text-salon-espresso">Active</label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-salon-sand/60 text-salon-espresso text-sm hover:bg-salon-sand/30 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-salon-gold text-white text-sm font-medium hover:bg-salon-gold/90 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : rule ? 'Update rule' : 'Create rule'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommissionPage() {
  const [rules, setRules]             = useState<CommissionRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [showModal, setShowModal]     = useState(false);
  const [editRule, setEditRule]       = useState<CommissionRule | null>(null);
  const [deletingId, setDeletingId]   = useState<string | null>(null);

  const [from, setFrom]               = useState('');
  const [to, setTo]                   = useState('');
  const [earnings, setEarnings]       = useState<CommissionRecord[]>([]);
  const [earningsTotal, setEarningsTotal] = useState(0);
  const [loadingEarnings, setLoadingEarnings] = useState(false);

  const loadRules = async () => {
    setLoadingRules(true);
    const { data, error } = await commissionApi.listRules();
    setLoadingRules(false);
    if (error) toast.error(error);
    else if (data) setRules(data.rules ?? []);
  };

  useEffect(() => { loadRules(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this commission rule?')) return;
    setDeletingId(id);
    const { error } = await commissionApi.deleteRule(id);
    setDeletingId(null);
    if (error) toast.error(error);
    else { toast.success('Rule deleted.'); loadRules(); }
  };

  const loadEarnings = async () => {
    setLoadingEarnings(true);
    const res = await commissionApi.earnings({ from: from || undefined, to: to || undefined });
    setLoadingEarnings(false);
    if ('error' in res && res.error) toast.error(res.error);
    else if (res.data) {
      setEarnings(res.data.records ?? []);
      setEarningsTotal(res.data.total ?? 0);
    }
  };

  return (
    <>
      <div className="space-y-5">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-salon-espresso">Commission</h1>
            <p className="text-salon-stone text-sm mt-0.5">Configure rules and monitor stylist earnings.</p>
          </div>
          <button
            onClick={() => { setEditRule(null); setShowModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-salon-gold text-white text-sm font-medium hover:bg-salon-gold/90 transition-colors shadow-sm"
          >
            <Plus className="size-4" />
            Add rule
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Rules table */}
          <section className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-salon-sand/30">
              <BadgePercent className="size-4 text-salon-gold" />
              <h2 className="text-sm font-semibold text-salon-espresso">Rules</h2>
              <span className="ml-auto text-xs text-salon-stone">{rules.length} rule{rules.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-salon-cream/60 text-xs text-salon-stone">
                  <tr>
                    <th className="py-3 px-4 text-left font-medium">Type</th>
                    <th className="py-3 px-4 text-right font-medium">Value</th>
                    <th className="py-3 px-4 text-left font-medium">Status</th>
                    <th className="py-3 px-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-salon-sand/30">
                  {loadingRules && (
                    <tr><td colSpan={4} className="py-8 text-center text-salon-stone text-sm">Loading…</td></tr>
                  )}
                  {!loadingRules && rules.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-10 text-center">
                        <div className="flex flex-col items-center gap-2 text-salon-stone">
                          <BadgePercent className="size-7 opacity-30" />
                          <p className="text-sm">No rules yet.</p>
                          <button
                            onClick={() => { setEditRule(null); setShowModal(true); }}
                            className="text-xs text-salon-gold hover:underline"
                          >
                            Create first rule
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-salon-cream/30 transition-colors">
                      <td className="py-3 px-4">
                        <p className="text-salon-espresso font-medium text-xs">{typeLabel(rule.type)}</p>
                        {rule.tier_threshold != null && (
                          <p className="text-[11px] text-salon-stone mt-0.5">Threshold: {rule.tier_threshold}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-salon-espresso tabular-nums">
                        {rule.type.startsWith('percent') ? `${Number(rule.value).toFixed(1)}%` : `$${Number(rule.value).toFixed(2)}`}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${rule.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setEditRule(rule); setShowModal(true); }}
                            className="p-1.5 rounded-lg text-salon-stone hover:bg-salon-sand/40 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(rule.id)}
                            disabled={deletingId === rule.id}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 disabled:opacity-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Earnings */}
          <section className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-salon-sand/30">
              <TrendingUp className="size-4 text-salon-gold" />
              <h2 className="text-sm font-semibold text-salon-espresso">Staff Earnings</h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex gap-2 flex-wrap">
                <label className="flex flex-col gap-1 text-xs font-medium text-salon-stone flex-1 min-w-[120px]">
                  From
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm focus:outline-none focus:ring-2 focus:ring-salon-gold/30"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-salon-stone flex-1 min-w-[120px]">
                  To
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm focus:outline-none focus:ring-2 focus:ring-salon-gold/30"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={loadEarnings}
                disabled={loadingEarnings}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-salon-espresso text-white text-sm font-medium disabled:opacity-50 hover:bg-salon-espresso/90 transition-colors"
              >
                {loadingEarnings ? 'Loading…' : 'Run report'}
              </button>

              {earnings.length > 0 && (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-salon-cream/70 border border-salon-sand/60">
                  <span className="text-sm text-salon-stone">Total commission</span>
                  <span className="font-display text-lg font-semibold text-salon-gold">${earningsTotal.toFixed(2)}</span>
                </div>
              )}

              <div className="overflow-x-auto border border-salon-sand/40 rounded-xl max-h-72">
                <table className="min-w-full text-sm">
                  <thead className="bg-salon-cream/60 text-xs text-salon-stone sticky top-0">
                    <tr>
                      <th className="py-2 px-3 text-left font-medium">Date</th>
                      <th className="py-2 px-3 text-left font-medium">Type</th>
                      <th className="py-2 px-3 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-salon-sand/30">
                    {earnings.map((r) => (
                      <tr key={r.id} className="hover:bg-salon-cream/20">
                        <td className="py-2 px-3 text-salon-stone text-xs">
                          {((r as { created_at?: string }).created_at
                            ? new Date((r as { created_at?: string }).created_at!).toLocaleDateString()
                            : '—')}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium ${r.type === 'tip' ? 'bg-amber-50 text-amber-700' : 'bg-salon-gold/10 text-salon-gold'}`}>
                            {r.type}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-salon-espresso tabular-nums">
                          ${Number(r.amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {earnings.length === 0 && !loadingEarnings && (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-salon-stone text-sm">
                          Run the report to see earnings.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>

      {showModal && (
        <RuleModal
          rule={editRule}
          onClose={() => { setShowModal(false); setEditRule(null); }}
          onSaved={loadRules}
        />
      )}
    </>
  );
}
