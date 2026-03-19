'use client';

import { type ReactNode } from 'react';

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'sm' ? 'w-4 h-4 border' : size === 'lg' ? 'w-10 h-10 border-2' : 'w-6 h-6 border-2';
  return (
    <div
      className={`${s} border-salon-gold border-t-transparent rounded-full animate-spin`}
      aria-label="Loading"
    />
  );
}

const statusMap: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700 border-blue-100',
  confirmed: 'bg-salon-sage/20 text-green-700 border-salon-sage/40',
  completed: 'bg-salon-sand text-salon-stone border-salon-sand',
  cancelled: 'bg-red-50 text-red-600 border-red-100',
  'no-show': 'bg-orange-50 text-orange-600 border-orange-100',
  active: 'bg-salon-sage/20 text-green-700 border-salon-sage/40',
  inactive: 'bg-red-50 text-red-600 border-red-100',
};

export function Badge({ status }: { status: string }) {
  const cls = statusMap[status.toLowerCase()] ?? 'bg-salon-sand text-salon-stone border-salon-sand';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${cls}`}>
      {status}
    </span>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">
      {message}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: string; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <span className="text-4xl mb-4">{icon}</span>
      <h3 className="font-display text-xl font-semibold text-salon-espresso mb-2">{title}</h3>
      <p className="text-salon-stone text-sm max-w-xs mb-6">{body}</p>
      {action}
    </div>
  );
}
