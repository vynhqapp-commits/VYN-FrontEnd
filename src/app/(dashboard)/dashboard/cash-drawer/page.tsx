'use client';

import { useEffect, useMemo, useState } from 'react';
import { cashDrawerApi, locationsApi, CashDrawerSession, CashMovement, Location } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

type StatusFilter = 'all' | 'open' | 'closed' | 'pending_approval' | 'reconciled';

export default function CashDrawerPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState<string>('');
  const [status, setStatus] = useState<StatusFilter>('open');
  const [sessions, setSessions] = useState<CashDrawerSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openingBalance, setOpeningBalance] = useState<string>('');
  const [movementAmount, setMovementAmount] = useState<string>('');
  const [movementType, setMovementType] = useState<'in' | 'out'>('in');
  const [movementReason, setMovementReason] = useState<string>('');
  const [closingBalance, setClosingBalance] = useState<string>('');
  const [expectedBalance, setExpectedBalance] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [approvalNotes, setApprovalNotes] = useState<string>('');

  useEffect(() => {
    locationsApi.list().then((res) => {
      if (res.data?.locations?.length) {
        setLocations(res.data.locations);
        setLocationId(res.data.locations[0].id);
      }
      if ('error' in res && res.error) setError(res.error);
    });
  }, []);

  useEffect(() => {
    if (!locationId) return;
    setLoading(true);
    setError(null);
    cashDrawerApi
      .list(locationId, status === 'all' ? undefined : status)
      .then(({ data, error: err }) => {
        setLoading(false);
        if (err) setError(err);
        else if (data) setSessions(data.sessions || []);
      });
  }, [locationId, status]);

  const currentOpen = useMemo(
    () => sessions.find((s) => s.status === 'open'),
    [sessions],
  );
  const runningExpected = useMemo(() => {
    if (!currentOpen) return null;
    const opening = Number(currentOpen.opening_balance ?? 0);
    const movementDelta = (currentOpen.CashMovements ?? []).reduce((sum, m) => {
      const amt = Number(m.amount ?? 0);
      return sum + (m.type === 'in' ? amt : -amt);
    }, 0);
    return opening + movementDelta;
  }, [currentOpen]);

  const handleOpen = async () => {
    if (!locationId) return;
    setActionLoading(true);
    setActionMessage(null);
    const { error: err } = await cashDrawerApi.open({
      location_id: locationId,
      opening_balance: openingBalance ? Number(openingBalance) : undefined,
    });
    setActionLoading(false);
    if (err) {
      setActionMessage(err);
    } else {
      setActionMessage('Drawer opened.');
      setOpeningBalance('');
      // refresh
      cashDrawerApi
        .list(locationId, status === 'all' ? undefined : status)
        .then(({ data }) => data && setSessions(data.sessions || []));
    }
  };

  const handleMovement = async () => {
    if (!currentOpen || !movementAmount) return;
    setActionLoading(true);
    setActionMessage(null);
    const { error: err } = await cashDrawerApi.movement(currentOpen.id, {
      type: movementType,
      amount: Number(movementAmount),
      reason: movementReason || undefined,
    });
    setActionLoading(false);
    if (err) {
      setActionMessage(err);
    } else {
      setActionMessage('Movement recorded.');
      setMovementAmount('');
      setMovementReason('');
      cashDrawerApi
        .list(locationId, status === 'all' ? undefined : status)
        .then(({ data }) => data && setSessions(data.sessions || []));
    }
  };

  const handleClose = async () => {
    if (!currentOpen || !closingBalance) return;
    setActionLoading(true);
    setActionMessage(null);
    const { error: err } = await cashDrawerApi.close(currentOpen.id, {
      closing_balance: Number(closingBalance),
      expected_balance: expectedBalance ? Number(expectedBalance) : undefined,
    });
    setActionLoading(false);
    if (err) {
      setActionMessage(err);
    } else {
      setActionMessage('Session closed. You can now reconcile.');
      setClosingBalance('');
      setExpectedBalance('');
      cashDrawerApi
        .list(locationId, status === 'all' ? undefined : status)
        .then(({ data }) => data && setSessions(data.sessions || []));
    }
  };

  const handleReconcile = async (sessionId: string) => {
    setActionLoading(true);
    setActionMessage(null);
    const { error: err } = await cashDrawerApi.approve(sessionId, approvalNotes || undefined);
    setActionLoading(false);
    if (err) setActionMessage(err);
    else {
      setActionMessage('Session reconciled.');
      setApprovalNotes('');
      cashDrawerApi
        .list(locationId, status === 'all' ? undefined : status)
        .then(({ data }) => data && setSessions(data.sessions || []));
    }
  };

  const renderMovements = (movements?: CashMovement[]) => {
    if (!movements || !movements.length) {
      return <p className="text-xs text-salon-stone/70">No movements recorded yet.</p>;
    }
    return (
      <ul className="space-y-1 max-h-32 overflow-y-auto text-xs">
        {movements.map((m) => (
          <li key={m.id} className="flex items-start justify-between gap-2">
            <div>
              <p className={m.type === 'in' ? 'text-emerald-600' : 'text-red-600'}>
                {m.type === 'in' ? 'Cash in' : 'Cash out'}
              </p>
              {m.reason && <p className="text-salon-stone/70">{m.reason}</p>}
            </div>
            <span className="text-salon-espresso font-medium">{Number(m.amount).toFixed(2)}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-salon-espresso">Cash drawer</h1>
        <p className="text-salon-stone text-sm mt-1">
          Open, track, and reconcile the physical cash drawer at the end of each shift.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div>
          <label className="block text-xs font-medium text-salon-stone mb-1">Location</label>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/60 text-sm"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-salon-stone mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/60 text-sm"
          >
            <option value="open">Open only</option>
            <option value="closed">Closed</option>
            <option value="pending_approval">Pending approval</option>
            <option value="reconciled">Reconciled</option>
            <option value="all">All</option>
          </select>
        </div>
        {loading && <Skeleton className="h-5 w-32" />}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-4 md:col-span-1">
          <h2 className="font-display text-lg font-semibold text-salon-espresso mb-2">Today&apos;s session</h2>
          {currentOpen ? (
            <div className="space-y-2 text-sm">
              <p className="text-salon-stone">
                Status:{' '}
                <span className="font-medium text-emerald-600">
                  Open
                </span>
              </p>
              <p className="text-salon-stone">
                Opened at{' '}
                <span className="font-medium text-salon-espresso">
                  {new Date(currentOpen.opened_at).toLocaleString()}
                </span>
              </p>
              <p className="text-salon-stone">
                Opening balance:{' '}
                <span className="font-medium text-salon-espresso">
                  {Number(currentOpen.opening_balance).toFixed(2)}
                </span>
              </p>
              <p className="text-salon-stone">
                Running expected:{' '}
                <span className="font-medium text-salon-espresso">
                  {runningExpected != null ? runningExpected.toFixed(2) : '-'}
                </span>
              </p>
              <div className="mt-3">
                <p className="text-xs font-medium text-salon-stone mb-1">Session movements (manual + sales)</p>
                {renderMovements(currentOpen.CashMovements)}
              </div>
            </div>
          ) : (
            <p className="text-sm text-salon-stone">
              No open session for this location. Open the drawer below to start your shift.
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-4 space-y-3 md:col-span-1">
          <h2 className="font-display text-lg font-semibold text-salon-espresso">Open / adjust</h2>
          <div className="space-y-2 text-sm">
            <label className="block">
              <span className="text-xs font-medium text-salon-stone">Opening balance</span>
              <input
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0.00"
                className="mt-1 w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={handleOpen}
              disabled={actionLoading || !locationId || !!currentOpen}
              className="w-full mt-1 px-4 py-2 rounded-xl bg-salon-espresso text-salon-cream text-sm font-medium disabled:opacity-50"
            >
              {currentOpen ? 'Session already open' : 'Open drawer'}
            </button>
          </div>

          <div className="border-t border-salon-sand/30 pt-3 space-y-2">
            <p className="text-xs font-medium text-salon-stone uppercase tracking-wide">Cash movement</p>
            <div className="flex gap-2">
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value as 'in' | 'out')}
                className="border border-salon-sand/60 rounded-xl px-2 py-2 bg-salon-cream/50 text-xs"
              >
                <option value="in">Cash in</option>
                <option value="out">Cash out</option>
              </select>
              <input
                type="number"
                value={movementAmount}
                onChange={(e) => setMovementAmount(e.target.value)}
                placeholder="Amount"
                className="flex-1 border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm"
              />
            </div>
            <input
              type="text"
              value={movementReason}
              onChange={(e) => setMovementReason(e.target.value)}
              placeholder="Reason (optional)"
              className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm"
            />
            <button
              type="button"
              onClick={handleMovement}
              disabled={actionLoading || !currentOpen || !movementAmount}
              className="w-full mt-1 px-4 py-2 rounded-xl border border-salon-espresso/60 text-salon-espresso text-sm font-medium disabled:opacity-50"
            >
              Record movement
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-4 space-y-3 md:col-span-1">
          <h2 className="font-display text-lg font-semibold text-salon-espresso">Close &amp; reconcile</h2>
          <p className="text-xs text-salon-stone">
            Count the cash at end of day and record the actual amount. Compare with the expected balance to identify
            overages or shortages.
          </p>
          <label className="block text-sm">
            <span className="text-xs font-medium text-salon-stone">Closing balance (physical cash)</span>
            <input
              type="number"
              value={closingBalance}
              onChange={(e) => setClosingBalance(e.target.value)}
              placeholder="0.00"
              className="mt-1 w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-salon-stone">Expected balance (optional)</span>
            <input
              type="number"
              value={expectedBalance}
              onChange={(e) => setExpectedBalance(e.target.value)}
              placeholder={runningExpected != null ? runningExpected.toFixed(2) : "System-calculated"}
              className="mt-1 w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={handleClose}
            disabled={actionLoading || !currentOpen || !closingBalance}
            className="w-full mt-1 px-4 py-2 rounded-xl bg-salon-gold text-white text-sm font-medium disabled:opacity-50"
          >
            Close session
          </button>

          <div className="border-t border-salon-sand/30 pt-3 space-y-2">
            <input
              type="text"
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="Approval notes (optional)"
              className="w-full border border-salon-sand/60 rounded-xl px-3 py-2 bg-salon-cream/50 text-sm"
            />
            <p className="text-xs font-medium text-salon-stone">Recently closed sessions</p>
            <div className="space-y-2 max-h-40 overflow-y-auto text-xs">
              {sessions
                .filter((s) => s.status !== 'open')
                .slice(0, 5)
                .map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-salon-sand/40 px-3 py-2"
                  >
                    <div>
                      <p className="font-medium text-salon-espresso">
                        {new Date(s.opened_at).toLocaleDateString()} · {Number(s.closing_balance ?? 0).toFixed(2)}
                      </p>
                      <p className="text-salon-stone text-[11px]">
                        Status: {s.status}{' '}
                        {s.closed_at && `· Closed ${new Date(s.closed_at).toLocaleTimeString()}`}
                      </p>
                    </div>
                    {(s.status === 'closed' || s.status === 'pending_approval') && (
                      <button
                        type="button"
                        onClick={() => handleReconcile(s.id)}
                        className="text-[11px] px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100"
                      >
                        Mark reconciled
                      </button>
                    )}
                  </div>
                ))}
              {sessions.filter((s) => s.status !== 'open').length === 0 && (
                <p className="text-salon-stone/70">No closed sessions yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {sessions.length > 0 && (
        <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-4">
          <h2 className="font-display text-lg font-semibold text-salon-espresso mb-2">Session history</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs md:text-sm">
              <thead className="border-b border-salon-sand/40 text-salon-stone">
                <tr>
                  <th className="py-2 text-left font-medium">Opened</th>
                  <th className="py-2 text-left font-medium">Closed</th>
                  <th className="py-2 text-right font-medium">Opening</th>
                  <th className="py-2 text-right font-medium">Closing</th>
                  <th className="py-2 text-right font-medium">Expected</th>
                  <th className="py-2 text-right font-medium">Discrepancy</th>
                  <th className="py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-salon-sand/30">
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2 text-salon-espresso">
                      {new Date(s.opened_at).toLocaleString()}
                    </td>
                    <td className="py-2 text-salon-stone">
                      {s.closed_at ? new Date(s.closed_at).toLocaleString() : '-'}
                    </td>
                    <td className="py-2 text-right text-salon-espresso">
                      {Number(s.opening_balance).toFixed(2)}
                    </td>
                    <td className="py-2 text-right text-salon-espresso">
                      {s.closing_balance != null ? Number(s.closing_balance).toFixed(2) : '-'}
                    </td>
                    <td className="py-2 text-right text-salon-stone">
                      {s.expected_balance != null ? Number(s.expected_balance).toFixed(2) : '-'}
                    </td>
                    <td className="py-2 text-right text-salon-stone">
                      {s.discrepancy != null ? Number(s.discrepancy).toFixed(2) : '-'}
                    </td>
                    <td className="py-2 text-left">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${
                          s.status === 'open'
                            ? 'bg-emerald-50 text-emerald-700'
                            : s.status === 'closed' || s.status === 'pending_approval'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-salon-cream text-salon-espresso'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {actionMessage && (
        <p className="text-xs text-salon-espresso bg-salon-cream/80 border border-salon-sand/50 rounded-xl px-3 py-2 inline-block">
          {actionMessage}
        </p>
      )}
    </div>
  );
}

