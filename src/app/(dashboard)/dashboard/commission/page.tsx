'use client';

import { useEffect, useState } from 'react';
import { commissionApi, CommissionRecord, CommissionRule, clientsApi } from '@/lib/api';

export default function CommissionPage() {
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);

  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleType, setNewRuleType] = useState('percent_service');
  const [newRuleRole, setNewRuleRole] = useState('');

  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [earnings, setEarnings] = useState<CommissionRecord[]>([]);
  const [earningsTotal, setEarningsTotal] = useState<number>(0);
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [earningsError, setEarningsError] = useState<string | null>(null);

  useEffect(() => {
    setLoadingRules(true);
    setRulesError(null);
    commissionApi.listRules().then((res) => {
      setLoadingRules(false);
      if ('error' in res && res.error) setRulesError(res.error);
      else if (res.data) setRules(res.data.rules || []);
    });
  }, []);

  const reloadRules = () => {
    setLoadingRules(true);
    setRulesError(null);
    commissionApi.listRules().then((res) => {
      setLoadingRules(false);
      if ('error' in res && res.error) setRulesError(res.error);
      else if (res.data) setRules(res.data.rules || []);
    });
  };

  const handleCreateRule = async () => {
    if (!newRuleName) return;
    const body: { name: string; rule_type: string; role?: string } = {
      name: newRuleName,
      rule_type: newRuleType,
    };
    if (newRuleRole) body.role = newRuleRole;
    const { error } = await commissionApi.createRule();
    if (error) {
      setRulesError(error);
      return;
    }
    setNewRuleName('');
    setNewRuleRole('');
    reloadRules();
  };

  const handleDeleteRule = async (id: string) => {
    const { error } = await commissionApi.deleteRule();
    if (!error) reloadRules();
  };

  const loadEarnings = () => {
    setLoadingEarnings(true);
    setEarningsError(null);
    commissionApi.earnings({ from: from || undefined, to: to || undefined })
      .then((res) => {
        setLoadingEarnings(false);
        if ('error' in res && res.error) setEarningsError(res.error);
        else if (res.data) {
          setEarnings(res.data.records || []);
          setEarningsTotal(res.data.total || 0);
        }
      });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-salon-espresso">Commission</h1>
        <p className="text-salon-stone text-sm mt-1">
          Configure commission rules and monitor stylist earnings over time.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-salon-espresso">Rules</h2>
              <p className="text-xs text-salon-stone">
                High-level rules that define how much each staff member earns from services and retail sales.
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex flex-col md:flex-row gap-2">
              <input
                type="text"
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                placeholder="Rule name (e.g. Stylist 40% on services)"
                className="flex-1 border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm"
              />
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <select
                value={newRuleType}
                onChange={(e) => setNewRuleType(e.target.value)}
                className="border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm"
              >
                <option value="percent_service">Percent of service revenue</option>
                <option value="percent_product">Percent of product sales</option>
                <option value="flat_per_service">Flat per service</option>
              </select>
              <input
                type="text"
                value={newRuleRole}
                onChange={(e) => setNewRuleRole(e.target.value)}
                placeholder="Applies to role (optional)"
                className="flex-1 border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleCreateRule}
              disabled={!newRuleName}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-salon-gold text-white text-sm font-medium disabled:opacity-50"
            >
              Save rule
            </button>
          </div>

          {rulesError && <p className="text-xs text-red-600">{rulesError}</p>}

          <div className="border-t border-salon-sand/30 pt-3 max-h-64 overflow-y-auto">
            {loadingRules ? (
              <p className="text-sm text-salon-stone">Loading rules…</p>
            ) : rules.length === 0 ? (
              <p className="text-sm text-salon-stone">No rules configured yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {rules.map((rule) => (
                  <li
                    key={rule.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-salon-sand/40 px-3 py-2"
                  >
                    <div>
                      <p className="font-medium text-salon-espresso">{rule.name}</p>
                      <p className="text-xs text-salon-stone mt-0.5">
                        Type: <span className="font-mono">{rule.rule_type}</span>
                        {rule.role && (
                          <>
                            {' · '}Role: <span className="font-mono">{rule.role}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-[11px] text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-salon-espresso">Earnings</h2>
              <p className="text-xs text-salon-stone">
                View calculated commission amounts over a date range.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-2 text-sm">
            <label className="flex-1">
              <span className="block text-xs text-salon-stone mb-1">From</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm"
              />
            </label>
            <label className="flex-1">
              <span className="block text-xs text-salon-stone mb-1">To</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={loadEarnings}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-salon-espresso text-salon-cream text-sm font-medium"
          >
            Run report
          </button>

          {earningsError && <p className="text-xs text-red-600">{earningsError}</p>}

          <div className="bg-salon-cream/70 rounded-xl border border-salon-sand/60 px-3 py-2 text-sm flex items-center justify-between">
            <span className="text-salon-stone">Total commission</span>
            <span className="font-display text-lg text-salon-gold">
              {earningsTotal.toFixed(2)}
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto border border-salon-sand/40 rounded-xl">
            <table className="min-w-full text-xs md:text-sm">
              <thead className="bg-salon-cream/70 text-salon-stone">
                <tr>
                  <th className="py-2 px-3 text-left font-medium">Date</th>
                  <th className="py-2 px-3 text-left font-medium">Type</th>
                  <th className="py-2 px-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-salon-sand/40">
                {earnings.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 px-3 text-salon-espresso">
                      {/* CommissionRecord does not expose created_at in the type, but backend returns it */}
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {((r as any).created_at && new Date((r as any).created_at).toLocaleDateString()) || '-'}
                    </td>
                    <td className="py-2 px-3 text-salon-stone">{r.type}</td>
                    <td className="py-2 px-3 text-right text-salon-espresso">
                      {Number(r.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {earnings.length === 0 && !loadingEarnings && (
                  <tr>
                    <td className="py-3 px-3 text-center text-salon-stone" colSpan={3}>
                      No records for this period yet.
                    </td>
                  </tr>
                )}
                {loadingEarnings && (
                  <tr>
                    <td className="py-3 px-3 text-center text-salon-stone" colSpan={3}>
                      Loading...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

