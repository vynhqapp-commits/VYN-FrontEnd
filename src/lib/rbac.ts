import { type AppRole, SALON_ROLES } from "@/lib/role-redirect";

export type NavItem = { href: string; label: string };

/** Definition before i18n / icon mapping */
export type SidebarItemDef = {
  href: string;
  fallbackLabel: string;
  /** If set, user must have at least one of these permissions */
  anyPermission?: string[];
  /** If set, user role must be one of these */
  anyRole?: AppRole[];
};

export type SidebarGroupDef = {
  id: string;
  fallbackCategory: string;
  items: SidebarItemDef[];
};

const SALON_DASHBOARD_GROUPS: SidebarGroupDef[] = [
  {
    id: "overview",
    fallbackCategory: "Overview",
    items: [{ href: "/dashboard", fallbackLabel: "Dashboard" }],
  },
  {
    id: "scheduling",
    fallbackCategory: "Scheduling",
    items: [
      {
        href: "/dashboard/appointments",
        fallbackLabel: "Calendar",
        anyPermission: ["booking.view"],
      },
    ],
  },
  {
    id: "clients",
    fallbackCategory: "Client management",
    items: [
      {
        href: "/dashboard/clients",
        fallbackLabel: "Clients",
        anyPermission: ["clients.view"],
      },
    ],
  },
  {
    id: "staff",
    fallbackCategory: "Staff & HR",
    items: [
      {
        href: "/dashboard/staff",
        fallbackLabel: "Staff",
        anyPermission: ["staff.view"],
      },
      {
        href: "/dashboard/commission",
        fallbackLabel: "Commission",
        anyPermission: [
          "commission.view_own",
          "staff.manage",
          "reports.view",
        ],
      },
    ],
  },
  {
    id: "catalog",
    fallbackCategory: "Catalog",
    items: [
      {
        href: "/dashboard/services",
        fallbackLabel: "Services",
        anyPermission: ["booking.view"],
      },
      {
        href: "/dashboard/products",
        fallbackLabel: "Products",
        anyPermission: ["pos.view", "inventory.view"],
      },
      {
        href: "/dashboard/locations",
        fallbackLabel: "Locations",
        anyPermission: ["salon.photos.manage"],
      },
    ],
  },
  {
    id: "pos",
    fallbackCategory: "Point of sale",
    items: [
      {
        href: "/dashboard/transactions",
        fallbackLabel: "POS / Sales",
        anyPermission: ["pos.view"],
      },
      {
        href: "/dashboard/pos",
        fallbackLabel: "New sale",
        anyPermission: ["pos.view"],
      },
      {
        href: "/dashboard/cash-drawer",
        fallbackLabel: "Cash drawer",
        anyPermission: ["pos.view"],
      },
    ],
  },
  {
    id: "finance",
    fallbackCategory: "Finance",
    items: [
      {
        href: "/dashboard/invoices",
        fallbackLabel: "Invoices",
        anyPermission: ["erp.view"],
      },
      {
        href: "/dashboard/expenses",
        fallbackLabel: "Expenses",
        anyPermission: ["erp.view"],
      },
      {
        href: "/dashboard/debt-aging",
        fallbackLabel: "Debt aging",
        anyPermission: ["erp.view"],
      },
      {
        href: "/dashboard/gift-cards",
        fallbackLabel: "Gift cards",
        anyPermission: ["erp.view"],
      },
      {
        href: "/dashboard/ledger",
        fallbackLabel: "Ledger",
        anyPermission: ["erp.view"],
      },
    ],
  },
  {
    id: "inventory",
    fallbackCategory: "Inventory",
    items: [
      {
        href: "/dashboard/inventory",
        fallbackLabel: "Inventory",
        anyPermission: ["inventory.view"],
      },
    ],
  },
  {
    id: "reports",
    fallbackCategory: "Reports",
    items: [
      {
        href: "/dashboard/reports",
        fallbackLabel: "Reports",
        anyPermission: ["reports.view"],
      },
      {
        href: "/dashboard/franchise",
        fallbackLabel: "Franchise",
        anyRole: ["salon_owner"],
        anyPermission: ["reports.view"],
      },
    ],
  },
  {
    id: "settings",
    fallbackCategory: "Settings",
    items: [
      {
        href: "/dashboard/profile",
        fallbackLabel: "Salon settings",
        anyPermission: ["settings.manage", "salon.photos.manage"],
      },
    ],
  },
];

export type FilteredSidebarGroup = {
  id: string;
  categoryLabel: string;
  items: NavItem[];
};

function matchesRole(role: AppRole, required?: AppRole[]): boolean {
  if (!required?.length) return true;
  return required.includes(role);
}

function hasAnyPermission(
  permissions: string[],
  required?: string[],
): boolean {
  if (!required?.length) return true;
  return required.some((p) => permissions.includes(p));
}

function itemVisible(
  item: SidebarItemDef,
  permissions: string[],
  role: AppRole,
): boolean {
  if (!matchesRole(role, item.anyRole)) return false;
  return hasAnyPermission(permissions, item.anyPermission);
}

/**
 * Build grouped sidebar items for salon dashboard roles using Spatie permissions.
 */
export function getFilteredSidebarGroups(
  permissions: string[],
  role: AppRole,
): FilteredSidebarGroup[] {
  const out: FilteredSidebarGroup[] = [];
  for (const group of SALON_DASHBOARD_GROUPS) {
    const items = group.items
      .filter((i) => itemVisible(i, permissions, role))
      .map((i) => ({ href: i.href, label: i.fallbackLabel }));
    if (items.length > 0) {
      out.push({
        id: group.id,
        categoryLabel: group.fallbackCategory,
        items,
      });
    }
  }
  return out;
}

/** Flat list of hrefs the user may access (for route guard), including profile and POS checkout. */
export function getAllowedHrefPrefixes(
  permissions: string[],
  role: AppRole,
): string[] {
  const fromMenu = getFilteredSidebarGroups(permissions, role).flatMap((g) =>
    g.items.map((i) => i.href),
  );
  const extra = new Set<string>(["/dashboard/profile"]);
  if (permissions.includes("pos.view")) {
    extra.add("/dashboard/pos");
  }
  return [...new Set([...fromMenu, ...extra])];
}

// Legacy flat menus (e.g. tests / fallbacks)
const ownerMenu: NavItem[] = SALON_DASHBOARD_GROUPS.flatMap((g) =>
  g.items.map((i) => ({ href: i.href, label: i.fallbackLabel })),
);

const managerMenu: NavItem[] = ownerMenu.filter(
  (i) => i.href !== "/dashboard/franchise",
);

const receptionistMenu: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/appointments", label: "Calendar" },
  { href: "/dashboard/clients", label: "Clients" },
  { href: "/dashboard/services", label: "Services" },
  { href: "/dashboard/products", label: "Products" },
  { href: "/dashboard/transactions", label: "POS / Sales" },
  { href: "/dashboard/cash-drawer", label: "Cash drawer" },
];

const staffMenu: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/appointments", label: "My Calendar" },
  { href: "/dashboard/commission", label: "My Earnings" },
];

export const menuByRole: Record<AppRole, NavItem[]> = {
  super_admin: [],
  customer: [],
  salon_owner: ownerMenu,
  manager: managerMenu,
  receptionist: receptionistMenu,
  staff: staffMenu,
};

export const allowedPrefixesByRole: Record<AppRole, string[]> = {
  super_admin: ["/admin"],
  customer: ["/my-bookings", "/profile"],
  salon_owner: [...ownerMenu.map((i) => i.href), "/dashboard/pos"],
  manager: [...managerMenu.map((i) => i.href), "/dashboard/pos"],
  receptionist: [...receptionistMenu.map((i) => i.href), "/dashboard/pos"],
  staff: staffMenu.map((i) => i.href),
};

export function isRouteAllowed(
  role: string,
  pathname: string,
  permissions?: string[] | null,
): boolean {
  if (pathname === "/dashboard/profile" || pathname === "/admin/profile")
    return true;

  const r = role as AppRole;
  if (r === "super_admin" || r === "customer") {
    const allowed = allowedPrefixesByRole[r];
    if (!allowed) return false;
    return allowed.some((p) => pathname === p || pathname.startsWith(p + "/"));
  }

  if (
    SALON_ROLES.includes(r) &&
    permissions &&
    permissions.length > 0
  ) {
    const allowed = getAllowedHrefPrefixes(permissions, r);
    return allowed.some(
      (p) => pathname === p || pathname.startsWith(p + "/"),
    );
  }

  const allowed = allowedPrefixesByRole[r];
  if (!allowed) return false;
  return allowed.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
