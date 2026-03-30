const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("salon_token");
}

function getTenantId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("salon_tenant_id");
}

export function setTenantId(tenantId: string | null) {
  if (typeof window === "undefined") return;
  if (tenantId) localStorage.setItem("salon_tenant_id", tenantId);
  else localStorage.removeItem("salon_tenant_id");
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ data?: T; meta?: PaginationMeta; error?: string }> {
  const token = getToken();
  const tenantId = getTenantId();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token)
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  if (tenantId) (headers as Record<string, string>)["X-Tenant"] = tenantId;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    if (
      msg === "Failed to fetch" ||
      msg.includes("NetworkError") ||
      msg.includes("REFUSED")
    ) {
      return {
        error:
          "Cannot reach the server. Make sure the backend is running (e.g. php artisan serve in the backend folder).",
      };
    }
    return { error: msg };
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      error: (json as { message?: string }).message || "Request failed",
    };
  }
  const payload =
    (json as { data?: T }).data !== undefined
      ? (json as { data: T }).data
      : (json as T);
  const meta = (json as { meta?: PaginationMeta }).meta;
  return { data: payload, meta };
}

/**
 * Auth API helper: sends NO Authorization and NO X-Tenant headers.
 * Use for login / register / OTP endpoints where the user has no session yet
 * and a stale salon_tenant_id in localStorage must not leak into the request.
 */
async function plainRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ data?: T; meta?: PaginationMeta; error?: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    if (
      msg === "Failed to fetch" ||
      msg.includes("NetworkError") ||
      msg.includes("REFUSED")
    ) {
      return {
        error:
          "Cannot reach the server. Make sure the backend is running (e.g. php artisan serve in the backend folder).",
      };
    }
    return { error: msg };
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      error: (json as { message?: string }).message || "Request failed",
    };
  }

  const payload =
    (json as { data?: T }).data !== undefined
      ? (json as { data: T }).data
      : (json as T);
  const meta = (json as { meta?: PaginationMeta }).meta;
  return { data: payload, meta };
}

/** Public API helper: never sends X-Tenant; sends Bearer token when available */
export async function publicRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ data?: T; meta?: PaginationMeta; error?: string }> {
  // Include Bearer token when available so logged-in customers can be identified
  // by the backend (e.g. to link user_id on booking). X-Tenant is intentionally
  // NOT sent — public endpoints are tenant-agnostic.
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    if (
      msg === "Failed to fetch" ||
      msg.includes("NetworkError") ||
      msg.includes("REFUSED")
    ) {
      return {
        error:
          "Cannot reach the server. Make sure the backend is running (e.g. php artisan serve in the backend folder).",
      };
    }
    return { error: msg };
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      error: (json as { message?: string }).message || "Request failed",
    };
  }

  const payload =
    (json as { data?: T }).data !== undefined
      ? (json as { data: T }).data
      : (json as T);
  const meta = (json as { meta?: PaginationMeta }).meta;
  return { data: payload, meta };
}

export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number | null;
  to: number | null;
}

/** Extract list from Laravel response (array or paginated { data: [] }) */
function listData<T>(raw: T | T[] | { data: T[] } | undefined): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  const pag = raw as { data?: T[] };
  return Array.isArray(pag?.data) ? pag.data : [];
}

function qs(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => [k, String(v)] as [string, string]);
  return entries.length ? "?" + new URLSearchParams(entries).toString() : "";
}

export const authApi = {
  login: (email: string, password: string) =>
    plainRequest<{ user: AuthUser; token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  otpSend: (email: string, purpose?: string) =>
    plainRequest<{ message?: string }>("/api/auth/request-otp", {
      method: "POST",
      body: JSON.stringify({ email, ...(purpose ? { purpose } : {}) }),
    }),
  otpVerify: (email: string, code: string, purpose?: string) =>
    plainRequest<{ user: AuthUser; token: string } | { verified: boolean }>("/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, code, ...(purpose ? { purpose } : {}) }),
    }),
  me: async () => {
    const res = await api<AuthUser>("/api/me");
    return res.data != null
      ? { data: { user: res.data } }
      : { error: res.error };
  },
  registerCustomer: (body: {
    email: string;
    password: string;
    full_name?: string;
    phone?: string;
  }) =>
    plainRequest<{ user: AuthUser; token: string }>("/api/auth/register/customer", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  registerSalonOwner: (body: {
    salon_name: string;
    salon_address?: string;
    email: string;
    password: string;
    full_name?: string;
    phone?: string;
  }) =>
    plainRequest<{ user: AuthUser; token: string }>("/api/auth/register/salon-owner", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export const profileApi = {
  update: (body: { name?: string; email?: string; phone?: string }) =>
    api<{ user: AuthUser }>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  changePassword: (body: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }) =>
    api<null>("/api/profile/change-password", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export const tenantsApi = {
  list: async (params?: { page?: number; per_page?: number }) => {
    const qsPart = params?.page || params?.per_page ? qs(params) : "";
    const res = await api<Tenant[] | { data: Tenant[] }>(
      "/api/admin/tenants" + qsPart,
    );
    const list = listData(res.data).map(normalizeTenant);
    return res.error
      ? { error: res.error }
      : { data: { tenants: list }, meta: res.meta };
  },
  get: (id: string) => api<Tenant>(`/api/admin/tenants/${id}`).then((r) =>
    r.data ? { data: { tenant: normalizeTenant(r.data) } } : { error: r.error },
  ),
  create: (body: { name: string; slug?: string; status?: string }) =>
    api<Tenant>("/api/admin/tenants", {
      method: "POST",
      body: JSON.stringify(body),
    }).then((r) => (r.data ? { data: normalizeTenant(r.data) } : r)),
  update: (
    id: string,
    body: { name?: string; slug?: string; status?: string },
  ) =>
    api<Tenant>(`/api/admin/tenants/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then((r) => (r.data ? { data: normalizeTenant(r.data) } : r)),
  suspend: (id: string) =>
    api<Tenant>(`/api/admin/tenants/${id}/suspend`, { method: "PATCH" }).then(
      (r) => (r.data ? { data: { tenant: normalizeTenant(r.data) } } : { error: r.error }),
    ),
  activate: (id: string) =>
    api<Tenant>(`/api/admin/tenants/${id}/activate`, { method: "PATCH" }).then(
      (r) => (r.data ? { data: { tenant: normalizeTenant(r.data) } } : { error: r.error }),
    ),
  delete: (id: string) =>
    api<unknown>(`/api/admin/tenants/${id}`, { method: "DELETE" }).then((r) =>
      r.error ? r : { data: { deleted: true } },
    ),
};

export const adminReportsApi = {
  kpis: () => api<unknown>("/api/admin/reports"),
  financial: (from: string, to: string) =>
    api<{ from: string; to: string; rows: { type: string; category: string; total: number }[] }>(
      `/api/admin/reports/financial?from=${from}&to=${to}`,
    ),
  franchiseKpis: (from: string, to: string) =>
    api<{ from: string; to: string; rows: { tenant_id: string; tenant_name: string; plan: string; status: string; revenue: number; booking_count: number; avg_ticket: number }[] }>(
      `/api/admin/franchise/kpis?from=${from}&to=${to}`,
    ),
};

export type AdminUserRow = {
  id: string;
  email: string;
  name?: string | null;
  tenant_id?: string | null;
  role?: string | null;
  created_at?: string;
};

export const adminUsersApi = {
  list: async (
    params?: { tenant_id?: string; role?: string; q?: string; page?: number; per_page?: number },
  ) => {
    const res = await api<AdminUserRow[] | { data: AdminUserRow[] }>(
      "/api/admin/users" + qs(params || {}),
    );
    const list = listData(res.data);
    return res.error
      ? { error: res.error }
      : { data: { users: list }, meta: res.meta };
  },
  invite: (body: {
    email: string;
    name?: string;
    tenant_id?: string;
    role: string;
    password?: string;
  }) =>
    api<AdminUserRow>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(body),
    }).then((r) => (r.data ? { data: { user: r.data } } : { error: r.error })),
  update: (id: string, body: Partial<AdminUserRow> & { role?: string }) =>
    api<AdminUserRow>(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then((r) => (r.data ? { data: { user: r.data } } : { error: r.error })),
  delete: (id: string) =>
    api<unknown>(`/api/admin/users/${id}`, { method: "DELETE" }).then((r) =>
      r.error ? r : { data: { deleted: true } },
    ),
};

export type AdminRoleRow = {
  name: string;
  description: string;
  scopes: string[];
};

export const adminRolesApi = {
  roles: async () => {
    const res = await api<AdminRoleRow[] | { data: AdminRoleRow[] }>(
      "/api/admin/roles",
    );
    const list = listData(res.data);
    return res.error ? { error: res.error } : { data: { roles: list } };
  },
  permissions: async () => {
    const res = await api<string[] | { data: string[] }>("/api/admin/permissions");
    const list = listData(res.data);
    // permissions is a plain list; listData will return [] unless wrapped.
    const perms = Array.isArray(res.data) ? (res.data as string[]) : list;
    return res.error ? { error: res.error } : { data: { permissions: perms } };
  },
};

export type AdminSubscriptionRow = {
  id: string;
  tenant_id: string;
  tenant_name?: string | null;
  plan: string;
  status: string;
  starts_at?: string | null;
  ends_at?: string | null;
  notes?: string | null;
};

export const adminSubscriptionsApi = {
  list: async () => {
    const res = await api<AdminSubscriptionRow[] | { data: AdminSubscriptionRow[] }>(
      "/api/admin/subscriptions",
    );
    const list = listData(res.data);
    return res.error ? { error: res.error } : { data: { subscriptions: list } };
  },
  upsertForTenant: (
    tenantId: string,
    body: {
      plan: "basic" | "pro" | "enterprise";
      status: "active" | "suspended" | "trial" | "cancelled";
      starts_at?: string;
      ends_at?: string;
      notes?: string;
    },
  ) =>
    api<AdminSubscriptionRow>(`/api/admin/tenants/${tenantId}/subscription`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then((r) => (r.data ? { data: { subscription: r.data } } : { error: r.error })),
};

export type AdminAuditLogRow = {
  id: string;
  action: string;
  actor?: { id: string; email: string; name?: string | null } | null;
  tenant?: { id: string; name: string } | null;
  meta?: any;
  created_at?: string;
};

export const adminAuditApi = {
  list: async (params?: {
    from?: string;
    to?: string;
    actor_id?: string;
    tenant_id?: string;
    action?: string;
  }) => {
    const res = await api<AdminAuditLogRow[] | { data: AdminAuditLogRow[] }>(
      "/api/admin/audit" + qs(params || {}),
    );
    const list = listData(res.data);
    return res.error ? { error: res.error } : { data: { logs: list } };
  },
};

export const locationsApi = {
  list: async (params?: { include_inactive?: boolean; q?: string }) => {
    const res = await api<Location[] | { data: Location[] }>(
      "/api/branches" +
        qs({
          include_inactive:
            params?.include_inactive == null
              ? undefined
              : params.include_inactive
                ? 1
                : 0,
          q: params?.q,
        }),
    );
    const list = listData(res.data);
    return res.error ? { error: res.error } : { data: { locations: list } };
  },
  get: (id: string) =>
    api<Location>(`/api/branches/${id}`).then((r) =>
      r.data ? { data: { location: r.data } } : { error: r.error },
    ),
  create: (body: {
    name: string;
    phone?: string;
    contact_email?: string;
    address?: string;
    timezone?: string;
    working_hours?: string;
    is_active?: boolean;
  }) => {
    return api<Location>("/api/branches", {
      method: "POST",
      body: JSON.stringify({
        name: body.name,
        phone: body.phone,
        contact_email: body.contact_email,
        address: body.address,
        timezone: body.timezone,
        working_hours: body.working_hours,
        is_active: body.is_active ?? true,
      }),
    }).then((r) =>
      r.data ? { data: { location: r.data } } : { error: r.error },
    );
  },
  update: (
    id: string,
    body: {
      name?: string;
      phone?: string;
      contact_email?: string;
      address?: string;
      timezone?: string;
      working_hours?: string;
      is_active?: boolean;
    },
  ) =>
    api<Location>(`/api/branches/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then((r) =>
      r.data ? { data: { location: r.data } } : { error: r.error },
    ),
  delete: (id: string) =>
    api<unknown>(`/api/branches/${id}`, { method: "DELETE" }).then((r) =>
      r.error ? r : { data: { deleted: true } },
    ),
};

export const clientsApi = {
  list: async () => {
    const res = await api<unknown>("/api/customers");
    const list = listData(res.data as unknown as Array<Record<string, unknown>> | { data: Array<Record<string, unknown>> });
    const clients = list.map(normalizeClient);
    return res.error ? { error: res.error } : { data: { clients } };
  },
  get: (id: string) =>
    api<Record<string, unknown>>(`/api/customers/${id}`).then((r) =>
      r.data ? { data: { client: normalizeClient(r.data) } } : { error: r.error },
    ),
  create: (body: {
    full_name: string;
    phone?: string;
    email?: string;
    notes?: string;
    tags?: string;
    user_id?: string;
  }) =>
    api<Record<string, unknown>>("/api/customers", {
      method: "POST",
      body: JSON.stringify({
        name: body.full_name,
        phone: body.phone ?? "",
        email: body.email,
        notes: body.notes,
        tags: body.tags,
      }),
    }).then((r) =>
      r.data ? { data: { client: normalizeClient(r.data) } } : { error: r.error },
    ),
  update: (
    id: string,
    body: {
      full_name?: string;
      phone?: string;
      email?: string;
      notes?: string;
      tags?: string;
      user_id?: string;
    },
  ) =>
    api<Record<string, unknown>>(`/api/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: body.full_name,
        phone: body.phone,
        email: body.email,
        notes: body.notes,
        tags: body.tags,
      }),
    }).then((r) =>
      r.data ? { data: { client: normalizeClient(r.data) } } : { error: r.error },
    ),
  delete: (id: string) =>
    api<unknown>(`/api/customers/${id}`, { method: "DELETE" }).then((r) =>
      r.error ? r : { data: { deleted: true } },
    ),

  notes: (id: string) =>
    api<{ data?: Array<{ id: string; note: string; created_at?: string; user?: { id: string; email?: string; name?: string } }> }>(
      `/api/customers/${id}/notes`,
    ).then((r) => (r.error ? { error: r.error } : { data: { notes: listData(r.data as unknown as any) } })),

  addNote: (id: string, note: string) =>
    api<Record<string, unknown>>(`/api/customers/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ note }),
    }).then((r) => (r.error ? { error: r.error } : { data: { created: true } })),

  // CRM tracking (Packages, Memberships, Stats)
  packages: async (clientId: string) => {
    const res = await api<unknown>(`/api/customers/${clientId}/packages`);
    const raw = res.data as unknown;
    const packages = Array.isArray(raw) ? raw : listData(raw as any);
    return res.error ? { error: res.error } : { data: { packages: packages as any[] } };
  },

  memberships: async (clientId: string) => {
    const res = await api<unknown>(`/api/customers/${clientId}/memberships`);
    const raw = res.data as unknown;
    const memberships = Array.isArray(raw) ? raw : listData(raw as any);
    return res.error ? { error: res.error } : { data: { memberships: memberships as any[] } };
  },

  stats: async (clientId: string) => {
    const res = await api<unknown>(`/api/customers/${clientId}/stats`);
    return res.error ? { error: res.error } : { data: { stats: res.data } };
  },

  renewMembership: async (clientId: string, membershipId: string) => {
    const res = await api<unknown>(`/api/customers/${clientId}/memberships/${membershipId}/renew`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    return res.error ? { error: res.error } : { data: { membership: res.data } };
  },
};

function normalizeClient(raw: Record<string, unknown>): Client {
  const id = String(raw.id ?? "");
  const full_name = String((raw.full_name ?? raw.name ?? "") as string);
  return {
    id,
    tenant_id: String(raw.tenant_id ?? ""),
    full_name,
    phone: (raw.phone as string | null | undefined) ?? null,
    email: (raw.email as string | null | undefined) ?? null,
    notes: (raw.notes as string | null | undefined) ?? null,
    tags: (raw.tags as string | null | undefined) ?? null,
    created_at: (raw.created_at as string | undefined) ?? undefined,
    updated_at: (raw.updated_at as string | undefined) ?? undefined,
  };
}

export const servicesApi = {
  list: async (params?: {
    include_inactive?: boolean;
    q?: string;
    status?: "all" | "active" | "inactive";
    page?: number;
    per_page?: number;
  }) => {
    const query = {
      ...params,
      include_inactive:
        params?.include_inactive == null
          ? undefined
          : params.include_inactive
            ? 1
            : 0,
    };
    const res = await api<Service[] | { data: Service[] }>(
      "/api/services" + qs(query),
    );
    const list = listData(res.data);
    return res.error ? { error: res.error } : { data: { services: list }, meta: res.meta };
  },
  get: (id: string) =>
    api<Service>(`/api/services/${id}`).then((r) =>
      r.data ? { data: { service: r.data } } : { error: r.error },
    ),
  create: (body: {
    name: string;
    service_category_id?: string | number | null;
    description?: string | null;
    duration_minutes: number;
    price: number;
    cost?: number | null;
    is_active?: boolean;
  }) =>
    api<Service>("/api/services", {
      method: "POST",
      body: JSON.stringify({
        name: body.name,
        service_category_id: body.service_category_id ?? null,
        description: body.description ?? null,
        duration_minutes: body.duration_minutes,
        price: body.price,
        cost: body.cost ?? 0,
        is_active: body.is_active ?? true,
      }),
    }).then((r) =>
      r.data ? { data: { service: r.data } } : { error: r.error },
    ),
  update: (id: string, body: Partial<Service>) =>
    api<Service>(`/api/services/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then((r) =>
      r.data ? { data: { service: r.data } } : { error: r.error },
    ),
  delete: (id: string) =>
    api<unknown>(`/api/services/${id}`, { method: "DELETE" }).then((r) =>
      r.error ? r : { data: { deleted: true } },
    ),
  availability: {
    list: (serviceId: string, branch_id: string) =>
      api<unknown>(
        `/api/services/${serviceId}/availabilities` + qs({ branch_id }),
      ).then((r) =>
        r.error ? { error: r.error } : { data: { availabilities: listData(r.data as any) } },
      ),
    create: (
      serviceId: string,
      body: {
        branch_id: string;
        day_of_week: number;
        start_time: string; // HH:mm
        end_time: string; // HH:mm
        slot_minutes?: number | null;
        is_active?: boolean;
      },
    ) =>
      api<unknown>(`/api/services/${serviceId}/availabilities`, {
        method: "POST",
        body: JSON.stringify(body),
      }).then((r) =>
        r.error ? { error: r.error } : { data: { availability: (r.data as any) } },
      ),
    update: (
      serviceId: string,
      id: string,
      body: Partial<{
        day_of_week: number;
        start_time: string;
        end_time: string;
        slot_minutes: number | null;
        is_active: boolean;
      }>,
    ) =>
      api<unknown>(`/api/services/${serviceId}/availabilities/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }).then((r) => (r.error ? { error: r.error } : { data: { availability: r.data } })),
    delete: (serviceId: string, id: string) =>
      api<unknown>(`/api/services/${serviceId}/availabilities/${id}`, {
        method: "DELETE",
      }).then((r) => (r.error ? { error: r.error } : { data: { deleted: true } })),
  },
  overrides: {
    list: (
      serviceId: string,
      params: { branch_id: string; from?: string; to?: string },
    ) =>
      api<unknown>(
        `/api/services/${serviceId}/availability-overrides` + qs(params),
      ).then((r) =>
        r.error ? { error: r.error } : { data: { overrides: listData(r.data as any) } },
      ),
    create: (
      serviceId: string,
      body: {
        branch_id: string;
        date: string; // YYYY-MM-DD
        is_closed?: boolean;
        start_time?: string | null;
        end_time?: string | null;
        slot_minutes?: number | null;
      },
    ) =>
      api<unknown>(`/api/services/${serviceId}/availability-overrides`, {
        method: "POST",
        body: JSON.stringify(body),
      }).then((r) => (r.error ? { error: r.error } : { data: { override: r.data } })),
    update: (
      serviceId: string,
      id: string,
      body: Partial<{
        date: string;
        is_closed: boolean;
        start_time: string | null;
        end_time: string | null;
        slot_minutes: number | null;
      }>,
    ) =>
      api<unknown>(`/api/services/${serviceId}/availability-overrides/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }).then((r) => (r.error ? { error: r.error } : { data: { override: r.data } })),
    delete: (serviceId: string, id: string) =>
      api<unknown>(`/api/services/${serviceId}/availability-overrides/${id}`, {
        method: "DELETE",
      }).then((r) => (r.error ? { error: r.error } : { data: { deleted: true } })),
  },
};

export const productsApi = {
  list: async (params?: {
    search?: string;
    is_active?: boolean;
    category?: string;
    page?: number;
    per_page?: number;
  }) => {
    const res = await api<Product[] | { data: Product[] }>(
      "/api/products" +
        qs({
          search: params?.search,
          is_active:
            params?.is_active == null ? undefined : params.is_active ? 1 : 0,
          category: params?.category,
          page: params?.page,
          per_page: params?.per_page,
        }),
    );
    const list = listData(res.data);
    return res.error
      ? { error: res.error }
      : { data: { products: list }, meta: res.meta };
  },
  get: (id: string) =>
    api<Product>(`/api/products/${id}`).then((r) =>
      r.data ? { data: { product: r.data } } : { error: r.error },
    ),
  create: (body: {
    name: string;
    description?: string;
    category?: string;
    sku?: string;
    cost?: number;
    price?: number;
    stock_quantity?: number;
    low_stock_threshold?: number;
    is_active?: boolean;
  }) => {
    return api<Product>("/api/products", {
      method: "POST",
      body: JSON.stringify({
        name: body.name,
        description: body.description,
        category: body.category,
        sku: body.sku ?? "SKU-" + Date.now(),
        cost: body.cost ?? 0,
        price: body.price ?? body.cost ?? 0,
        stock_quantity: body.stock_quantity ?? 0,
        low_stock_threshold: body.low_stock_threshold ?? 5,
        is_active: body.is_active ?? true,
      }),
    }).then((r) =>
      r.data ? { data: { product: r.data } } : { error: r.error },
    );
  },
  update: (id: string, body: Partial<Product>) =>
    api<Product>(`/api/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then((r) =>
      r.data ? { data: { product: r.data } } : { error: r.error },
    ),
  delete: (id: string) =>
    api<unknown>(`/api/products/${id}`, { method: "DELETE" }).then((r) =>
      r.error ? r : { data: { deleted: true } },
    ),
};

export const inventoryApi = {
  list: async (params?: { location_id?: string }) => {
    if (!params?.location_id) return { data: { inventory: [] } };
    const res = await api<Inventory[] | { data: Inventory[] }>(
      `/api/inventory/${params.location_id}`,
    );
    const list = listData(res.data);
    return res.error ? { error: res.error } : { data: { inventory: list } };
  },
  lowStock: () =>
    api<{ items: Inventory[] }>("/api/reports/low-stock").then((r) =>
      r.data
        ? {
            data: {
              items: listData(
                r.data as unknown as Inventory[] | { data: Inventory[] },
              ),
            },
          }
        : { error: r.error },
    ),
  update: (
    id: string,
    body: {
      quantity?: number;
      low_stock_threshold?: number;
      branch_id?: string;
    },
  ) =>
    api<Inventory>("/api/inventory/stock", {
      method: "POST",
      body: JSON.stringify({
        product_id: id,
        branch_id: body.branch_id,
        quantity: body.quantity ?? 0,
      }),
    }).then((r) =>
      r.data ? { data: { inventory: r.data } } : { error: r.error },
    ),
};

export const appointmentsApi = {
  list: async (params?: {
    location_id?: string;
    staff_id?: string;
    from?: string;
    to?: string;
    status?: string;
  }) => {
    const q = {
      branch_id: params?.location_id,
      staff_id: params?.staff_id,
      from: params?.from,
      to: params?.to,
      status: params?.status,
    };
    const res = await api<unknown>(
      "/api/appointments" + qs(q as Record<string, string>),
    );
    const list = listData(res.data as unknown as Array<Record<string, unknown>> | { data: Array<Record<string, unknown>> });
    const appointments = list.map(normalizeAppointment);
    return res.error ? { error: res.error } : { data: { appointments } };
  },
  getAvailability: (locationId: string, serviceId: string, date: string) =>
    api<{ slots: { start: string; end: string }[] }>(
      `/api/public/availability?location_id=${locationId}&service_id=${serviceId}&date=${date}`,
    ),
  get: (id: string) =>
    api<Record<string, unknown>>(`/api/appointments/${id}`).then((r) =>
      r.data ? { data: { appointment: normalizeAppointment(r.data) } } : { error: r.error },
    ),
  create: (body: {
    location_id: string;
    client_id: string;
    staff_id: string;
    service_id: string;
    start_at: string;
    source?: string;
    notes?: string;
  }) => {
    const start = new Date(body.start_at);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    return api<Record<string, unknown>>("/api/appointments", {
      method: "POST",
      body: JSON.stringify({
        branch_id: body.location_id,
        customer_id: body.client_id,
        staff_id: body.staff_id,
        service_id: body.service_id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        source: body.source === "walk-in" ? "walk_in" : body.source,
        notes: body.notes,
      }),
    }).then((r) =>
      r.data ? { data: { appointment: normalizeAppointment(r.data) } } : { error: r.error },
    );
  },
  updateStatus: (id: string, status: string) =>
    api<Record<string, unknown>>(`/api/appointments/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }).then((r) =>
      r.data ? { data: { appointment: normalizeAppointment(r.data) } } : { error: r.error },
    ),
  reschedule: (id: string, body: { start_time: string; end_time: string }) =>
    api<Record<string, unknown>>(`/api/appointments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then((r) =>
      r.data ? { data: { appointment: normalizeAppointment(r.data) } } : { error: r.error },
    ),
  cancel: (id: string) =>
    api<Record<string, unknown>>(`/api/appointments/${id}`, { method: "DELETE" }).then(
      (r) => (r.data ? { data: { appointment: normalizeAppointment(r.data) } } : { error: r.error }),
    ),
};

function normalizeAppointment(raw: Record<string, unknown>): Appointment {
  const start =
    (raw.start_at as string | undefined) ??
    (raw.starts_at as string | undefined) ??
    (raw.startsAt as string | undefined) ??
    '';
  const end =
    (raw.end_at as string | undefined) ??
    (raw.ends_at as string | undefined) ??
    (raw.endsAt as string | undefined) ??
    '';

  // Backend returns branch_id/customer_id/staff_id and may include relations.
  const clientRaw = (raw.customer as Record<string, unknown> | undefined) ?? (raw.Client as Record<string, unknown> | undefined);
  const serviceRaw =
    (raw.service as Record<string, unknown> | undefined) ??
    (raw.Service as Record<string, unknown> | undefined) ??
    // If loaded through services.service, use the first line item
    (((raw.services as Array<Record<string, unknown>> | undefined) ?? [])
      .map((s) => (s.service as Record<string, unknown> | undefined) ?? undefined)
      .filter(Boolean)[0] as Record<string, unknown> | undefined) ??
    undefined;
  const staffRaw = (raw.staff as Record<string, unknown> | undefined) ?? (raw.Staff as Record<string, unknown> | undefined);

  return {
    id: String(raw.id ?? ''),
    tenant_id: String(raw.tenant_id ?? ''),
    location_id: String(raw.branch_id ?? raw.location_id ?? ''),
    client_id: String(raw.customer_id ?? raw.client_id ?? ''),
    staff_id: String(raw.staff_id ?? ''),
    service_id: String(raw.service_id ?? ''),
    start_at: start,
    end_at: end,
    status: String(raw.status ?? ''),
    source: String(raw.source ?? ''),
    notes: (raw.notes as string | null | undefined) ?? null,
    Client: clientRaw
      ? {
          id: String(clientRaw.id ?? ''),
          tenant_id: String(clientRaw.tenant_id ?? ''),
          full_name: String((clientRaw.full_name ?? clientRaw.name ?? '') as string),
          phone: (clientRaw.phone as string | null | undefined) ?? null,
          email: (clientRaw.email as string | null | undefined) ?? null,
          notes: (clientRaw.notes as string | null | undefined) ?? null,
          tags: (clientRaw.tags as string | null | undefined) ?? null,
          created_at: (clientRaw.created_at as string | undefined) ?? undefined,
          updated_at: (clientRaw.updated_at as string | undefined) ?? undefined,
        }
      : undefined,
    Service: serviceRaw
      ? ({
          id: String(serviceRaw.id ?? ''),
          tenant_id: String(serviceRaw.tenant_id ?? ''),
          name: String(serviceRaw.name ?? ''),
          description: (serviceRaw.description as string | null | undefined) ?? null,
          duration_minutes: Number(serviceRaw.duration_minutes ?? 0),
          price: (serviceRaw.price as string | number | undefined) ?? 0,
          cost: (serviceRaw.cost as string | number | null | undefined) ?? null,
          category: (serviceRaw.category as string | null | undefined) ?? null,
          is_active: Boolean(serviceRaw.is_active ?? true),
          created_at: (serviceRaw.created_at as string | undefined) ?? undefined,
          updated_at: (serviceRaw.updated_at as string | undefined) ?? undefined,
        } as Service)
      : undefined,
    Staff: staffRaw
      ? ({
          id: String(staffRaw.id ?? ''),
          email: String(staffRaw.email ?? ''),
          name: (staffRaw.name as string | null | undefined) ?? null,
          role: String(staffRaw.role ?? ''),
          tenantId: (staffRaw.tenantId as string | null | undefined) ?? null,
          fullName: (staffRaw.fullName as string | null | undefined) ?? null,
        } as AuthUser)
      : undefined,
  };
}

export const transactionsApi = {
  list: async (params?: {
    location_id?: string;
    from?: string;
    to?: string;
  }) => {
    const q = {
      branch_id: params?.location_id,
      from: params?.from,
      to: params?.to,
    };
    const res = await api<Transaction[] | { data: Transaction[] }>(
      "/api/sales" + qs(q as Record<string, string>),
    );
    const list = listData(res.data);
    return res.error ? { error: res.error } : { data: { transactions: list } };
  },
  get: (id: string) =>
    api<Transaction>(`/api/sales/${id}`).then((r) =>
      r.data ? { data: { transaction: r.data } } : { error: r.error },
    ),
  getReceipt: (id: string) =>
    api<unknown>(`/api/sales/${id}`).then((r) =>
      r.data ? { data: { receipt: r.data } } : { error: r.error },
    ),
  create: (body: {
    client_id?: string;
    location_id: string;
    appointment_id?: string;
    items: {
      type: "service" | "product";
      service_id?: string;
      product_id?: string;
      quantity: number;
      unit_price: number;
      staff_id?: string;
    }[];
    payments: { method: string; amount: number; reference?: string }[];
  }) => {
    const total = body.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const paymentMethod = (body.payments?.[0]?.method ?? "cash")
      .toLowerCase()
      .replace(/\s+/g, "_");
    const items = body.items.map((i) => ({
      item_name: i.type === "service" ? "Service" : "Product",
      service_id: i.service_id ?? null,
      product_id: i.product_id ?? null,
      quantity: i.quantity,
      unit_price: i.unit_price,
    }));
    return api<Transaction>("/api/sales", {
      method: "POST",
      body: JSON.stringify({
        branch_id: body.location_id,
        customer_id: body.client_id ?? null,
        staff_id: body.items[0]?.staff_id ?? null,
        items,
        payments: (body.payments ?? []).map((p) => ({
          method: p.method,
          amount: p.amount,
          reference: p.reference,
        })),
        appointment_id: body.appointment_id ?? null,
        payment_method:
          paymentMethod === "card"
            ? "card"
            : paymentMethod === "transfer"
              ? "bank_transfer"
              : paymentMethod === "mobile"
                ? "mobile"
                : "cash",
      }),
    }).then((r) =>
      r.data ? { data: { transaction: r.data } } : { error: r.error },
    );
  },
};

export const paymentsApi = {
  listByTransaction: (transactionId: string) =>
    api<Transaction>(`/api/sales/${transactionId}`).then((r) =>
      r.data
        ? { data: { payments: (r.data as Transaction).Payments ?? [] } }
        : { error: r.error },
    ),
  refund: (body: { transaction_id: string; amount: number; reason?: string }) =>
    api<Transaction>(`/api/sales/${body.transaction_id}/refund`, {
      method: "POST",
      body: JSON.stringify({
        refund_reason: body.reason ?? "Refund requested",
      }),
    }).then((r) =>
      r.data
        ? {
            data: {
              refund: {
                id: "",
                transaction_id: body.transaction_id,
                amount: body.amount,
                reason: body.reason,
              },
            },
          }
        : { error: r.error },
    ),
};

export const cashDrawerApi = {
  list: (locationId: string, status?: string) =>
    api<CashDrawerSession[] | { data: CashDrawerSession[] }>(
      `/api/cash-drawers?branch_id=${locationId}` +
        (status ? `&status=${status}` : ""),
    ).then((r) =>
      r.data ? { data: { sessions: listData(r.data) } } : { error: r.error },
    ),
  open: (body: { location_id: string; opening_balance?: number }) =>
    api<CashDrawerSession>("/api/cash-drawers/open", {
      method: "POST",
      body: JSON.stringify({
        branch_id: body.location_id,
        opening_balance: body.opening_balance ?? 0,
      }),
    }).then((r) =>
      r.data ? { data: { session: r.data } } : { error: r.error },
    ),
  movement: (
    sessionId: string,
    body: { type: "in" | "out"; amount: number; reason?: string },
  ) =>
    api<CashMovement>(`/api/cash-drawers/${sessionId}/transaction`, {
      method: "POST",
      body: JSON.stringify({
        type: body.type === "in" ? "cash_in" : "cash_out",
        amount: body.amount,
        reason: body.reason ?? "Adjustment",
      }),
    }).then((r) =>
      r.data ? { data: { movement: r.data } } : { error: r.error },
    ),
  close: (
    sessionId: string,
    body: { closing_balance: number; expected_balance?: number },
  ) =>
    api<CashDrawerSession>(`/api/cash-drawers/${sessionId}/close`, {
      method: "POST",
      body: JSON.stringify({ actual_cash: body.closing_balance, notes: "" }),
    }).then((r) =>
      r.data ? { data: { session: r.data } } : { error: r.error },
    ),
  reconcile: (sessionId: string) =>
    api<CashDrawerSession>(`/api/cash-drawers/${sessionId}/approve`, {
      method: "POST",
      body: JSON.stringify({}),
    }).then((r) =>
      r.data ? { data: { session: r.data } } : { error: r.error },
    ),
  approve: (sessionId: string, notes?: string) =>
    api<CashDrawerSession>(`/api/cash-drawers/${sessionId}/approve`, {
      method: "POST",
      body: JSON.stringify({ notes: notes ?? "" }),
    }).then((r) =>
      r.data ? { data: { session: r.data } } : { error: r.error },
    ),
};

export const debtApi = {
  list: (clientId: string) =>
    api<unknown>(`/api/debts?customer_id=${clientId}`).then((r) =>
      r.data
        ? {
            data: {
              entries: listData(
                (r.data as any)?.entries ??
                  (r.data as DebtLedgerEntry[] | { data: DebtLedgerEntry[] }),
              ),
              balance: typeof r.data === "object" && r.data && "balance" in (r.data as any) ? Number((r.data as any).balance) : 0,
            },
          }
        : { error: r.error },
    ),
  aging: () =>
    api<{ aging: DebtAgingRow[]; summary: Record<string, number> }>(
      "/api/debts/aging-report",
    ).then((r) =>
      r.data
        ? {
            data:
              typeof r.data === "object" && "aging" in r.data
                ? r.data
                : {
                    aging: listData(r.data as unknown as DebtAgingRow[]),
                    summary: {},
                  },
          }
        : { error: r.error },
    ),
  addPayment: (body: {
    client_id: string;
    amount: number;
    transaction_id?: string;
    debt_id?: string;
  }) => {
    if (!body.debt_id) return Promise.resolve({ error: "debt_id required" });
    return api<unknown>(`/api/debts/${body.debt_id}/payment`, {
      method: "POST",
      body: JSON.stringify({ amount: body.amount }),
    }).then((r) =>
      r.data
        ? { data: { entry: r.data, balance_after: (r.data as any)?.balance_after ?? 0 } }
        : { error: r.error },
    );
  },
  writeOff: (body: { client_id: string; amount: number; debt_id?: string }) => {
    if (!body.debt_id) return Promise.resolve({ error: "debt_id required" });
    return api<unknown>(`/api/debts/${body.debt_id}/write-off`, {
      method: "POST",
      body: JSON.stringify({}),
    }).then((r) =>
      r.data
        ? { data: { entry: r.data, balance_after: (r.data as any)?.balance_after ?? 0 } }
        : { error: r.error },
    );
  },
  writeOffRequests: (status?: "pending" | "approved" | "rejected") =>
    api<unknown>("/api/debts/write-off-requests" + qs({ status })).then((r) =>
      r.data
        ? { data: { requests: listData(r.data as DebtWriteOffRequest[] | { data: DebtWriteOffRequest[] }) } }
        : { error: r.error },
    ),
  requestWriteOff: (debtId: string, reason?: string) =>
    api<{ request_id: string; status: string }>(`/api/debts/${debtId}/write-off`, {
      method: "POST",
      body: JSON.stringify({ submit_for_approval: true, reason }),
    }).then((r) => (r.data ? { data: r.data } : { error: r.error })),
  approveWriteOff: (requestId: string) =>
    api<unknown>(`/api/debts/write-off-requests/${requestId}/approve`, {
      method: "POST",
      body: JSON.stringify({}),
    }).then((r) => (r.data ? { data: r.data } : { error: r.error })),
  rejectWriteOff: (requestId: string) =>
    api<unknown>(`/api/debts/write-off-requests/${requestId}/reject`, {
      method: "POST",
      body: JSON.stringify({}),
    }).then((r) => (r.data ? { data: r.data } : { error: r.error })),
};

export interface DebtAgingRow {
  client_id: string;
  client: Client;
  balance: number;
  oldest_debt_days: number;
  bucket: string;
}

export const expensesApi = {
  list: async (params?: {
    location_id?: string;
    from?: string;
    to?: string;
  }) => {
    const q = {
      branch_id: params?.location_id,
      from: params?.from,
      to: params?.to,
    };
    const res = await api<Expense[] | { data: Expense[] }>(
      "/api/expenses" + qs(q as Record<string, string>),
    );
    const list = listData(res.data);
    return res.error ? { error: res.error } : { data: { expenses: list } };
  },
  get: (id: string) =>
    api<Expense>(`/api/expenses/${id}`).then((r) =>
      r.data ? { data: { expense: r.data } } : { error: r.error },
    ),
  create: (body: {
    category: string;
    amount: number;
    expense_date: string;
    description?: string;
    location_id?: string;
  }) =>
    api<Expense>("/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        category: body.category,
        amount: body.amount,
        expense_date: body.expense_date,
        description: body.description ?? body.category,
        branch_id: body.location_id,
      }),
    }).then((r) =>
      r.data ? { data: { expense: r.data } } : { error: r.error },
    ),
  update: (id: string, body: Partial<Expense>) =>
    api<Expense>(`/api/expenses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then((r) =>
      r.data ? { data: { expense: r.data } } : { error: r.error },
    ),
  delete: (id: string) =>
    api<unknown>(`/api/expenses/${id}`, { method: "DELETE" }).then((r) =>
      r.error ? r : { data: { deleted: true } },
    ),
};

export const commissionApi = {
  listRules: async () => {
    const res = await api<CommissionRule[] | { data: CommissionRule[] }>(
      "/api/commissions",
    );
    const list = listData(res.data);
    return res.error ? { error: res.error } : { data: { rules: list } };
  },
  createRule: (body: { type: string; value: number; tier_threshold?: number; staff_id?: string; service_id?: string; is_active?: boolean }) =>
    api<CommissionRule>("/api/commissions/rules", {
      method: "POST",
      body: JSON.stringify(body),
    }).then((r) => r.data ? { data: { rule: r.data } } : { error: r.error }),
  getRule: (id: string) =>
    api<CommissionRule>(`/api/commissions/${id}`).then((r) =>
      r.data ? { data: { rule: r.data } } : { error: r.error },
    ),
  updateRule: (id: string, body: { type?: string; value?: number; tier_threshold?: number; staff_id?: string; service_id?: string; is_active?: boolean }) =>
    api<CommissionRule>(`/api/commissions/rules/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }).then((r) => r.data ? { data: { rule: r.data } } : { error: r.error }),
  deleteRule: (id: string) =>
    api<null>(`/api/commissions/rules/${id}`, { method: "DELETE" })
      .then((r) => r.error ? { error: r.error } : { data: null }),
  earnings: (params?: { staff_id?: string; from?: string; to?: string }) =>
    api<unknown>(
      `/api/commissions/staff/${params?.staff_id ?? 0}/earnings` +
        qs(params || {}),
    ).then((r) =>
      r.data
        ? {
            data: {
              records: listData(
                r.data as CommissionRecord[] | { data: CommissionRecord[] },
              ),
              total: listData(
                r.data as CommissionRecord[] | { data: CommissionRecord[] },
              ).reduce((sum, x: any) => sum + Number(x.amount ?? 0), 0),
            },
          }
        : { error: r.error },
    ),
};

export const invoicesApi = {
  list: async (params?: { status?: string; search?: string; from?: string; to?: string; page?: number }) => {
    const qsPart = params ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)])).toString() : "";
    const res = await api<{ data: InvoiceData[]; meta?: PaginationMeta }>(`/api/invoices${qsPart}`);
    return res.error ? { error: res.error } : { data: { invoices: (res.data as { data: InvoiceData[] })?.data ?? [], meta: (res.data as { meta?: PaginationMeta })?.meta } };
  },
  get: (id: string) =>
    api<{ data: InvoiceData }>(`/api/invoices/${id}`).then((r) =>
      r.data ? { data: { invoice: (r.data as { data: InvoiceData }).data } } : { error: r.error },
    ),
  void: (id: string) =>
    api<{ data: InvoiceData }>(`/api/invoices/${id}/void`, { method: "POST" }).then((r) =>
      r.data ? { data: { invoice: (r.data as { data: InvoiceData }).data } } : { error: r.error },
    ),
};

export const ledgerApi = {
  list: async (params?: { type?: string; category?: string; from?: string; to?: string; is_locked?: string; page?: number }) => {
    const qsPart = params ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)])).toString() : "";
    const res = await api<{ data: LedgerEntryRow[]; meta?: PaginationMeta }>(`/api/ledger${qsPart}`);
    return res.error ? { error: res.error } : { data: { entries: (res.data as { data: LedgerEntryRow[] })?.data ?? [], meta: (res.data as { meta?: PaginationMeta })?.meta } };
  },
};

export const giftCardsApi = {
  list: async (params?: { status?: string; search?: string; page?: number }) => {
    const qs = params ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)])).toString() : "";
    const res = await api<{ data: GiftCard[]; meta?: unknown }>(`/api/gift-cards${qs}`);
    const list = Array.isArray(res.data) ? res.data : (res.data as { data: GiftCard[] })?.data ?? [];
    return res.error ? { error: res.error } : { data: { gift_cards: list, meta: (res.data as { meta?: unknown })?.meta } };
  },
  get: (id: string) =>
    api<GiftCard>(`/api/gift-cards/${id}`).then((r) =>
      r.data ? { data: { gift_card: r.data } } : { error: r.error },
    ),
  getByCode: (code: string) =>
    api<GiftCard>("/api/gift-cards/verify", {
      method: "POST",
      body: JSON.stringify({ code }),
    }).then((r) =>
      r.data ? { data: { gift_card: r.data } } : { error: r.error },
    ),
  create: (body: {
    initial_balance: number;
    currency?: string;
    expires_at?: string;
    code?: string;
  }) =>
    api<GiftCard>("/api/gift-cards", {
      method: "POST",
      body: JSON.stringify({
        initial_balance: body.initial_balance,
        currency: body.currency,
        expires_at: body.expires_at,
        code: body.code,
      }),
    }).then((r) =>
      r.data ? { data: { gift_card: r.data } } : { error: r.error },
    ),
  redeem: (id: string, body: { amount: number }) =>
    api<GiftCard>(`/api/gift-cards/${id}/redeem`, {
      method: "POST",
      body: JSON.stringify(body),
    }).then((r) =>
      r.data ? { data: { gift_card: r.data } } : { error: r.error },
    ),
  void: (id: string) =>
    api<GiftCard>(`/api/gift-cards/${id}/void`, {
      method: "POST",
    }).then((r) =>
      r.data ? { data: { gift_card: r.data } } : { error: r.error },
    ),
};

export interface MonthlyClosing {
  id: string;
  year: number;
  month: number;
  period: string;
  status: 'open' | 'closed';
  notes?: string | null;
  closed_by?: string | null;
  closed_by_name?: string | null;
  closed_at?: string | null;
  created_at?: string;
}

export const reportsApi = {
  pnl: (period: string, locationId?: string) =>
    api<{
      period: string;
      revenue: number;
      expense: number;
      commission: number;
      profit: number;
      entries: {
        by_type: { type: string; total: number }[];
        by_category: { type: string; category: string | null; total: number }[];
      };
    }>(
      `/api/reports/profit-loss?period=${period}` +
        (locationId ? `&branch_id=${locationId}` : ""),
    ),
  pnlExportUrl: (period: string, locationId?: string) =>
    `${API_BASE}/api/reports/profit-loss/export?period=${period}` +
    (locationId ? `&branch_id=${locationId}` : ""),
  vatExportUrl: (period: string, locationId?: string) =>
    `${API_BASE}/api/reports/vat/export?period=${period}` +
    (locationId ? `&branch_id=${locationId}` : ""),
  paymentsExportUrl: (from: string, to: string, locationId?: string) =>
    `${API_BASE}/api/reports/payment-breakdown/export?from=${from}&to=${to}` +
    (locationId ? `&branch_id=${locationId}` : ""),
  vat: (period: string, locationId?: string) =>
    api<{
      period: string;
      total_revenue: number;
      vat_rate?: number | null;
      estimated_vat?: number | null;
      vat_report: unknown[];
    }>(
      `/api/reports/vat?period=${period}` +
        (locationId ? `&branch_id=${locationId}` : ""),
    ),
  paymentBreakdown: (from: string, to: string, locationId?: string) =>
    api<{
      from: string;
      to: string;
      by_method: Record<string, number>;
      transactions: number;
    }>(
      `/api/reports/payment-breakdown?from=${from}&to=${to}` +
        (locationId ? `&branch_id=${locationId}` : ""),
    ),
  inventoryMovement: (params?: {
    from: string;
    to: string;
    location_id?: string;
    product_id?: string;
  }) =>
    api<{
      from: string;
      to: string;
      summary: { in: number; out: number; net: number };
      rows: InventoryMovementRow[];
    }>(
      "/api/reports/inventory-movement" +
        qs({
          from: params?.from,
          to: params?.to,
          branch_id: params?.location_id,
          product_id: params?.product_id,
        }),
    ).then((r) => (r.data ? { data: r.data } : { error: r.error })),
  monthlyClose: (period: string, notes?: string) => {
    const [y, m] = period.split("-").map(Number);
    const body: Record<string, unknown> = {
      year: y || new Date().getFullYear(),
      month: m || new Date().getMonth() + 1,
    };
    if (notes) body.notes = notes;
    return api<MonthlyClosing>("/api/monthly-closings/close", {
      method: "POST",
      body: JSON.stringify(body),
    }).then((r) =>
      r.data ? { data: r.data } : { error: r.error },
    );
  },
  monthlyClosings: () =>
    api<{ data: MonthlyClosing[]; meta: { total: number; last_page: number } }>(
      "/api/monthly-closings",
    ).then((r) => (r.data ? { data: r.data } : { error: r.error })),
  margins: (from: string, to: string, locationId?: string) =>
    api<{
      from: string;
      to: string;
      rows: {
        type: 'service' | 'product';
        id: string;
        name: string;
        revenue: number;
        cost: number;
        margin: number;
        margin_pct: number;
      }[];
    }>(
      `/api/reports/margins?from=${from}&to=${to}` +
        (locationId ? `&branch_id=${locationId}` : ''),
    ),
};

export const franchiseApi = {
  kpis: (params?: { from?: string; to?: string }) =>
    api<{
      from: string;
      to: string;
      locations: FranchiseLocationKpi[];
      summary: FranchiseSummary;
    }>("/api/analytics/franchise" + qs(params || {})).then((r) =>
      r.data
        ? {
            data:
              typeof r.data === "object" && "summary" in r.data
                ? r.data
                : {
                    from: "",
                    to: "",
                    locations: listData(
                      r.data as unknown as FranchiseLocationKpi[],
                    ),
                    summary: {} as FranchiseSummary,
                  },
          }
        : { error: r.error },
    ),
};

export const publicApi = {
  salons: async (params?: {
    search?: string;
    page?: number;
    per_page?: number;
  }): Promise<{
    data?: { salons: Tenant[] };
    meta?: PaginationMeta;
    error?: string;
  }> => {
    const q = qs({
      search: params?.search,
      page: params?.page,
      per_page: params?.per_page,
    });
    const r = await publicRequest<Tenant[]>(`/api/public/salons${q}`);
    if (r.error) return { error: r.error };
    return {
      data: { salons: listData(r.data as Tenant[] | { data: Tenant[] }) },
      meta: r.meta,
    };
  },
  salon: (slug: string) =>
    publicRequest<{ salon: Tenant; branches: Location[]; services: Service[] }>(
      `/api/public/salons/${slug}`,
    ).then((r) => (r.data ? { data: r.data } : { error: r.error })),
  availability: (branchId: string, serviceId: string, date: string) =>
    publicRequest<{ slots: { start: string; end: string; staff_id: string }[] }>(
      `/api/public/availability?branch_id=${branchId}&service_id=${serviceId}&date=${date}`,
    ),
  book: async (body: {
    tenant_id: string;
    branch_id: string;
    service_id: string;
    staff_id?: string;
    start_at: string;
    client_name: string;
    client_phone?: string;
    client_email?: string;
  }): Promise<{
    data?: { appointment: PublicAppointment };
    error?: string;
  }> => {
    const r = await publicRequest<{ appointment: PublicAppointment }>(
      "/api/public/book",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
    if (r.error) return { error: r.error };
    const appt =
      (r.data as { appointment?: PublicAppointment })?.appointment ??
      (r.data as unknown as PublicAppointment);
    return { data: { appointment: appt } };
  },
};

export interface PublicAppointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  service: { name: string; duration_minutes: number; price: string | number };
  branch: { id: string; name: string; address?: string | null };
  staff: { id: string; name: string };
  customer: { name: string; email?: string | null; phone?: string | null };
}

export const customerApi = {
  myBookings: async () => {
    const res = await api<Appointment[] | { bookings: Appointment[] }>(
      "/api/customer/bookings",
    );
    const list = Array.isArray(
      (res.data as { bookings?: Appointment[] })?.bookings,
    )
      ? (res.data as { bookings: Appointment[] }).bookings
      : listData(res.data as Appointment[] | { data: Appointment[] });
    return res.error ? { error: res.error } : { data: { bookings: list } };
  },
  getBooking: (id: string) =>
    api<Appointment>(`/api/customer/bookings/${id}`).then((r) =>
      r.data
        ? {
            data: {
              booking: (r.data as { booking?: Appointment }).booking ?? r.data,
            },
          }
        : { error: r.error },
    ),
  cancelBooking: (id: string) =>
    api<Appointment>(`/api/customer/bookings/${id}/cancel`, {
      method: "PATCH",
    }).then((r) =>
      r.data ? { data: { booking: r.data } } : { error: r.error },
    ),
};

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  role: string;
  tenantId: string | null;
  fullName?: string | null;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  subscription_status?: string | null;
  plan?: string | null;
  domain?: string | null;
  phone?: string | null;
  address?: string | null;
  logo?: string | null;
  timezone?: string | null;
  currency?: string | null;
  branch_count?: number;
  service_count?: number;
  created_at?: string;
  updated_at?: string;
}

function normalizeTenant(t: Tenant): Tenant {
  const sub = (t as any).subscription_status ?? (t as any).subscriptionStatus ?? null;
  const status = (t as any).status ?? sub ?? null;
  return {
    ...t,
    subscription_status: sub,
    status: status ?? "active",
  };
}

export interface Location {
  id: string;
  tenant_id: string;
  name: string;
  phone?: string | null;
  contact_email?: string | null;
  address?: string | null;
  timezone?: string | null;
  working_hours?: string | null;
  is_active?: boolean;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface Client {
  id: string;
  tenant_id: string;
  user_id?: string | null;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  tags?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ClientPackage {
  id: string;
  name?: string | null;
  total_services: number;
  remaining_services: number;
  expires_at?: string | null;
  status?: string;
  membership_id?: string | null;
}

export interface ClientMembership {
  id: string;
  name?: string | null;
  plan?: string | null;
  start_date?: string | null;
  renewal_date?: string | null;
  interval_months: number;
  service_credits_per_renewal: number;
  remaining_services: number;
  status?: string;
}

export interface ClientStats {
  total_spent: number;
  invoice_count: number;
  avg_ticket: number;
}

export interface Service {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  duration_minutes: number;
  price: string | number;
  cost?: string | number | null;
  category?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  sku?: string | null;
  cost?: string | number | null;
  price?: string | number | null;
  stock_quantity?: number;
  low_stock_threshold?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Inventory {
  id: string;
  location_id: string;
  product_id: string;
  quantity: string | number;
  low_stock_threshold?: string | number | null;
  Product?: Product;
  Location?: Location;
}

export interface Appointment {
  id: string;
  tenant_id: string;
  // Column names differ between old dashboard API (start_at) and new model (starts_at)
  start_at?: string;
  end_at?: string;
  starts_at?: string;
  ends_at?: string;
  // FK names differ between old schema (location_id/client_id) and new (branch_id/customer_id)
  location_id?: string;
  branch_id?: string;
  client_id?: string;
  customer_id?: string;
  staff_id?: string;
  service_id?: string;
  status: string;
  source?: string;
  notes?: string | null;
  // Old dashboard relations (PascalCase)
  Client?: Client;
  Service?: Service;
  Staff?: AuthUser;
  Location?: Location;
  // New customer booking relations (snake_case, eagerly loaded)
  branch?: { id: string; name: string; address?: string | null };
  staff?: { id: string; name: string };
  services?: { service: { id: string; name: string; duration_minutes: number; price: number | string } }[];
}

export interface Transaction {
  id: string;
  tenant_id: string;
  location_id: string;
  appointment_id?: string | null;
  total: string | number;
  status: string;
  TransactionItems?: TransactionItem[];
  Payments?: Payment[];
  Location?: Location;
  created_at?: string;
}

export interface TransactionItem {
  id: string;
  type: string;
  quantity: string | number;
  unit_price: string | number;
  total: string | number;
  Service?: Service;
  Product?: Product;
}

export interface Payment {
  id: string;
  transaction_id: string;
  method: string;
  amount: string | number;
  reference?: string | null;
}

export interface Refund {
  id: string;
  transaction_id: string;
  amount: string | number;
  reason?: string | null;
}

export interface CashDrawerSession {
  id: string;
  location_id: string;
  opened_at: string;
  closed_at?: string | null;
  opening_balance: string | number;
  closing_balance?: string | number | null;
  expected_balance?: string | number | null;
  discrepancy?: string | number | null;
  status: string;
  approval_required?: boolean;
  approved_by?: string | null;
  approved_at?: string | null;
  approval_notes?: string | null;
  CashMovements?: CashMovement[];
}

export interface CashMovement {
  id: string;
  type: "in" | "out";
  amount: string | number;
  reason?: string | null;
}

export interface DebtLedgerEntry {
  id: string;
  type: string;
  amount: string | number;
  balance_after: string | number;
  created_at?: string;
}

export interface DebtWriteOffRequest {
  id: string;
  debt_id: string;
  amount: string | number;
  reason?: string | null;
  status: "pending" | "approved" | "rejected";
  requested_by?: string | number;
  approved_by?: string | number | null;
  created_at?: string;
}

export interface InventoryMovementRow {
  id: string;
  branch_id?: string | null;
  branch_name?: string | null;
  product_id?: string | null;
  product_name?: string | null;
  type: string;
  quantity: number;
  reason?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  created_at?: string;
}

export interface Expense {
  id: string;
  tenant_id: string;
  location_id?: string | null;
  category: string;
  amount: string | number;
  expense_date: string;
  description?: string | null;
}

export interface CommissionRule {
  id: string;
  tenant_id: string;
  name: string;
  rule_type: string;
  type: string;
  value: number;
  tier_threshold?: number | null;
  staff_id?: string | null;
  service_id?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface CommissionRecord {
  id: string;
  staff_id: string;
  amount: string | number;
  type: string;
  reversed_at?: string | null;
}

export interface GiftCard {
  id: string;
  tenant_id: string;
  code: string;
  initial_balance: string | number;
  remaining_balance: string | number;
  current_balance: string | number;
  currency: string;
  status: string;
  expires_at?: string | null;
  customer_id?: string | null;
  created_at?: string;
}

export interface GiftCardRedemption {
  id: string;
  gift_card_id: string;
  transaction_id: string;
  amount: string | number;
}

export interface FranchiseLocationKpi {
  id: string;
  name: string;
  status: string;
  revenue: number;
  transaction_count: number;
  booking_volume: number;
  completed_appointments: number;
  avg_ticket: number;
  utilization_rate: number;
  is_underperforming: boolean;
}

export interface FranchiseSummary {
  total_revenue: number;
  location_count: number;
  average_per_location: number;
  underperforming_count: number;
  underperforming: FranchiseLocationKpi[];
}

/* ─── Staff ─────────────────────────────────────────────────────────── */

export interface StaffMember {
  id: string;
  tenant_id?: string;
  branch_id?: string | null;
  user_id?: string | null;
  name: string;
  phone?: string | null;
  specialization?: string | null;
  is_active: boolean;
  branch?: { id: string; name: string } | null;
  schedules?: StaffScheduleRow[];
}

export interface StaffScheduleRow {
  id?: string;
  day_of_week: number; // 0=Sun … 6=Sat
  start_time: string;  // HH:mm
  end_time: string;
  is_day_off: boolean;
}

export interface StaffInput {
  branch_id: string;
  name: string;
  phone?: string;
  specialization?: string;
  is_active?: boolean;
  user_id?: string;
}

export interface ScheduleInput {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_day_off: boolean;
}

export const staffApi = {
  list: (params?: { branch_id?: string; include_inactive?: boolean }) =>
    api<StaffMember[]>('/api/staff' + qs(params ?? {})),

  get: (id: string) =>
    api<StaffMember>(`/api/staff/${id}`),

  create: (body: StaffInput) =>
    api<StaffMember>('/api/staff', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (id: string, body: Partial<StaffInput>) =>
    api<StaffMember>(`/api/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    api<null>(`/api/staff/${id}`, { method: 'DELETE' }),

  getSchedules: (staffId: string) =>
    api<StaffScheduleRow[]>(`/api/staff/${staffId}/schedules`),

  setSchedules: (staffId: string, schedules: ScheduleInput[]) =>
    api<StaffScheduleRow[]>(`/api/staff/${staffId}/schedules`, {
      method: 'POST',
      body: JSON.stringify({ schedules }),
    }),
};

export interface InvoiceData {
  id: string;
  invoice_number: string;
  branch_id?: string | null;
  customer_id?: string | null;
  appointment_id?: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid_amount: number;
  status: string;
  notes?: string | null;
  customer?: { id: string; name: string } | null;
  branch?: { id: string; name: string } | null;
  items?: unknown[];
  payments?: unknown[];
  created_at?: string;
}

export interface LedgerEntryRow {
  id: string;
  branch_id?: string | null;
  branch_name?: string | null;
  type: string;
  category: string;
  amount: number;
  tax_amount: number;
  reference_type?: string | null;
  reference_id?: string | null;
  description?: string | null;
  entry_date?: string | null;
  is_locked: boolean;
  created_at?: string;
}
