'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { adminRolesApi } from '@/lib/api';

export default function AdminRolesPage() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<{ name: string; description: string; scopes: string[] }[]>([]);
  const [selected, setSelected] = useState<{ name: string; description: string; scopes: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminRolesApi.roles().then((res) => {
      if ('error' in res && res.error) setError(res.error);
      else if (res.data?.roles?.length) {
        setRoles(res.data.roles);
        setSelected(res.data.roles[0]);
      }
    });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roles &amp; permissions</h1>
          <p className="text-muted-foreground text-sm mt-1">
            High-level RBAC matrix for Admin, Salon Owner, Manager, Staff, and Customer.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          Logged in as <span className="font-medium text-foreground">{user?.email}</span> (Admin)
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">{error}</div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-card rounded-xl border shadow-sm p-3 space-y-2 md:col-span-1">
          <p className="text-xs text-muted-foreground mb-1">Roles</p>
          <ul className="space-y-1 text-sm">
            {roles.map((r) => (
              <li key={r.name}>
                <button
                  type="button"
                  onClick={() => setSelected(r)}
                  className={`w-full text-left px-3 py-2 rounded-lg ${
                    selected?.name === r.name
                      ? 'bg-accent text-foreground'
                      : 'bg-transparent text-foreground hover:bg-accent/60'
                  }`}
                >
                  <div className="font-medium">{r.name}</div>
                  <div className="text-[11px] text-muted-foreground">{r.description}</div>
                </button>
              </li>
            ))}
            {roles.length === 0 && (
              <li className="text-xs text-muted-foreground">No roles loaded.</li>
            )}
          </ul>
        </div>

        <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3 md:col-span-2">
          {selected && (
            <>
              <div>
                <h2 className="text-lg font-semibold">{selected.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">{selected.description}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Key permissions</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.scopes.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-[11px] text-foreground border"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Backend APIs already enforce role-based access; this matrix documents how they map to business-friendly
                roles. In a later phase, this screen can be wired to a dynamic permission store.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


