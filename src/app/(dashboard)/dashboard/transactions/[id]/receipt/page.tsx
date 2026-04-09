'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { transactionsApi, paymentsApi } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function ReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [receipt, setReceipt] = useState<{
    receipt?: {
      id: string;
      total: string | number;
      Location?: { name: string };
      TransactionItems?: {
        quantity: string;
        unit_price: string;
        total: string;
        Service?: { name: string };
        Product?: { name: string };
      }[];
      Payments?: { method: string; amount: string }[];
      Customer?: { name?: string; email?: string; phone?: string };
      created_at?: string;
    };
  } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refunded, setRefunded] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState<'email' | 'sms' | null>(null);

  useEffect(() => {
    if (!id) return;
    transactionsApi.getReceipt(id).then(({ data, error }) => {
      if (error) return;
      // Backend returns the receipt object directly, not wrapped.
      const maybeWrapped = data as typeof receipt;
      if (maybeWrapped && typeof maybeWrapped === 'object' && 'receipt' in (maybeWrapped as object)) {
        setReceipt(maybeWrapped);
      } else {
        setReceipt({ receipt: data as any });
      }
    });
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleRefund = async () => {
    const r = receipt?.receipt;
    if (!id || !r) return;
    if (!window.confirm('Refund this sale? This will mark payments refunded and void any remaining debt.')) return;
    setRefundError(null);
    setRefundLoading(true);
    const total = Number(r.total ?? 0);
    const { data, error } = await paymentsApi.refund({
      transaction_id: id,
      amount: total,
      reason: 'Refund from dashboard',
    });
    setRefundLoading(false);
    if (error) {
      setRefundError(error);
      return;
    }
    setRefunded(true);
  };

  const handleNotify = async (channel: 'email' | 'sms') => {
    if (!id) return;
    setNotifyLoading(channel);
    const { data, error } = await transactionsApi.notifyReceipt(id, channel);
    setNotifyLoading(null);
    if (error) {
      toastError(error);
      return;
    }
    if (channel === 'sms' && data?.sms_url) {
      window.open(data.sms_url, '_self');
      return;
    }
    toastSuccess(channel === 'email' ? 'Receipt email queued.' : 'SMS link generated.');
  };

  if (!receipt?.receipt) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-[420px] w-full max-w-md rounded-xl" />
      </div>
    );
  }

  const r = receipt.receipt;
  return (
    <div className="p-6">
      <div className="flex gap-2 mb-4 no-print">
        <button type="button" onClick={() => router.back()} className="px-4 py-2 border border-border rounded-xl text-foreground hover:bg-accent transition-colors">Back</button>
        <button type="button" onClick={handlePrint} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-colors">Print receipt</button>
        <button
          type="button"
          onClick={() => handleNotify('email')}
          disabled={notifyLoading !== null}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-colors"
        >
          {notifyLoading === 'email' ? 'Sending…' : 'Email receipt'}
        </button>
        <button
          type="button"
          onClick={() => handleNotify('sms')}
          disabled={notifyLoading !== null}
          className="px-4 py-2 border border-border rounded-xl text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
        >
          {notifyLoading === 'sms' ? 'Preparing…' : 'SMS receipt'}
        </button>
        <button
          type="button"
          onClick={handleRefund}
          disabled={refundLoading || refunded}
          className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {refunded ? 'Refunded' : refundLoading ? 'Processing…' : 'Refund sale'}
        </button>
      </div>
      {refundError && (
        <div className="no-print mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {refundError}
        </div>
      )}
      <div ref={printRef} className="bg-card shadow-sm rounded-xl border border-border p-6 max-w-md">
        <h1 className="font-display text-lg font-semibold text-foreground border-b border-border pb-2">Receipt</h1>
        <p className="text-sm text-muted-foreground mt-2">{r.Location?.name}</p>
        <p className="text-sm text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</p>
        <table className="w-full mt-4 text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 text-muted-foreground font-semibold">Item</th>
              <th className="text-right py-2 text-muted-foreground font-semibold">Qty</th>
              <th className="text-right py-2 text-muted-foreground font-semibold">Price</th>
              <th className="text-right py-2 text-muted-foreground font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {(r.TransactionItems || []).map((item) => (
              <tr
                key={`${item.Service?.name ?? item.Product?.name ?? 'item'}-${item.unit_price}-${item.quantity}-${item.total}`}
                className="border-b border-border"
              >
                <td className="py-2 text-foreground">{item.Service?.name || item.Product?.name || '—'}</td>
                <td className="text-right text-muted-foreground">{item.quantity}</td>
                <td className="text-right text-muted-foreground">{Number(item.unit_price).toFixed(2)}</td>
                <td className="text-right text-muted-foreground">{Number(item.total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 text-sm text-muted-foreground">
          {(r.Payments || []).map((p) => (
            <div key={p.method} className="flex justify-between">
              <span>{p.method}</span>
              <span>{Number(p.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 font-semibold text-foreground border-t border-border pt-2">Total: {Number(r.total).toFixed(2)}</p>
      </div>
    </div>
  );
}
