'use client';

import { useEffect, useState } from 'react';
import { expensesApi, locationsApi, type Expense, type Location } from '@/lib/api';

const CATEGORIES = ['rent', 'utilities', 'salaries', 'marketing', 'supplies', 'other'] as const;

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filterError, setFilterError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    category: 'rent',
    amount: '',
    expense_date: new Date().toISOString().slice(0, 10),
    description: '',
  });

  const loadExpenses = () => {
    if (from && to && from > to) {
      setFilterError('From date cannot be after To date.');
      return;
    }
    setLoading(true);
    setListError(null);
    setFilterError(null);
    expensesApi.list({ location_id: locationId || undefined, from: from || undefined, to: to || undefined }).then((res) => {
      setLoading(false);
      if ('error' in res && res.error) setListError(res.error);
      else if (res.data?.expenses) setExpenses(res.data.expenses);
    });
  };

  useEffect(() => {
    Promise.all([locationsApi.list()]).then(([locRes]) => {
      if (locRes.data?.locations) {
        setLocations(locRes.data.locations);
        if (locRes.data.locations[0]) setLocationId(locRes.data.locations[0].id);
      }
      loadExpenses();
    });
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [locationId]);

  const submitExpense = async () => {
    setFormError(null);
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Please enter an amount.');
      return;
    }
    if (!form.expense_date) {
      setFormError('Expense date is required.');
      return;
    }
    if (form.description && form.description.length > 255) {
      setFormError('Description must be 255 characters or less.');
      return;
    }
    setSaving(true);
    const res = editing
      ? await expensesApi.update(editing.id, {
          category: form.category,
          amount,
          expense_date: form.expense_date,
          description: form.description || undefined,
          branch_id: locationId || undefined,
        } as any)
      : await expensesApi.create({
          category: form.category,
          amount,
          expense_date: form.expense_date,
          description: form.description || undefined,
          location_id: locationId || undefined,
        });
    setSaving(false);
    if ('error' in res && res.error) {
      setFormError(res.error);
      return;
    }
    setShowAdd(false);
    setEditing(null);
    setForm((f) => ({ ...f, amount: '', description: '' }));
    loadExpenses();
  };

  const startEdit = (e: Expense) => {
    setEditing(e);
    setForm({
      category: (e.category as any) ?? 'other',
      amount: String(e.amount ?? ''),
      expense_date: e.expense_date,
      description: e.description ?? '',
    });
    setFormError(null);
    setShowAdd(true);
  };

  const deleteExpense = async (id: string) => {
    if (!confirm('Delete this expense? A reversal ledger entry will be created.')) return;
    const res = await expensesApi.delete(id);
    if ('error' in res && res.error) {
      setListError(res.error);
      return;
    }
    loadExpenses();
  };

  if (loading) return <p className="text-salon-stone">Loading expenses...</p>;
  if (listError) return <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl">{listError}</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-salon-espresso">Expenses</h1>
          <p className="text-salon-stone text-sm mt-1">Record business costs and keep your profitability accurate.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-salon-gold text-white text-sm font-semibold hover:bg-salon-goldLight transition-colors"
        >
          + Add expense
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-2 mb-4 text-sm">
        <label className="flex-1">
          <span className="block text-xs text-salon-stone mb-1">Location</span>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50"
          >
            <option value="">All</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex-1">
          <span className="block text-xs text-salon-stone mb-1">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50"
          />
        </label>
        <label className="flex-1">
          <span className="block text-xs text-salon-stone mb-1">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={loadExpenses}
            className="px-4 py-2 rounded-xl bg-salon-espresso text-white text-sm font-semibold hover:bg-salon-bark"
          >
            Apply
          </button>
        </div>
      </div>
      {filterError && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
          {filterError}
        </div>
      )}

      <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-salon-sand/60">
          <thead className="bg-salon-sand/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Category</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Description</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-salon-stone uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-salon-sand/60">
            {expenses.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-3 text-sm text-salon-stone">{e.expense_date}</td>
                <td className="px-4 py-3 text-sm text-salon-espresso">{e.category}</td>
                <td className="px-4 py-3 text-sm text-salon-stone">{Number(e.amount).toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-salon-stone">{e.description ?? '—'}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(e)}
                      className="text-salon-gold font-medium hover:text-salon-goldLight transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteExpense(e.id)}
                      className="text-red-600 font-medium hover:text-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {expenses.length === 0 && (
          <p className="p-6 text-salon-stone text-center">No expenses found.</p>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="font-display text-xl font-semibold text-salon-espresso">
                {editing ? 'Edit expense' : 'Add expense'}
              </h2>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                disabled={saving}
                className="text-salon-stone hover:text-salon-espresso disabled:opacity-50"
              >
                ✕
              </button>
            </div>
            {formError && (
              <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                {formError}
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-salon-stone mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-white text-salon-espresso"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-salon-stone mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-white text-salon-espresso"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-salon-stone mb-1">Date</label>
                  <input
                    type="date"
                    value={form.expense_date}
                    onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
                    className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-white text-salon-espresso"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-salon-stone mb-1">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-white text-salon-espresso"
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                disabled={saving}
                className="px-4 py-2 rounded-xl border border-salon-sand/60 text-salon-espresso hover:bg-salon-sand/30"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitExpense}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-salon-gold text-white font-semibold hover:bg-salon-goldLight disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
