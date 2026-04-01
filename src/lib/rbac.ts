import { type AppRole } from "@/lib/role-redirect";

export type NavItem = { href: string; label: string };

const ownerMenu: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/appointments", label: "Calendar" },
  { href: "/dashboard/clients", label: "Clients" },
  { href: "/dashboard/staff", label: "Staff" },
  { href: "/dashboard/locations", label: "Locations" },
  { href: "/dashboard/services", label: "Services" },
  { href: "/dashboard/products", label: "Products" },
  { href: "/dashboard/inventory", label: "Inventory" },
  { href: "/dashboard/transactions", label: "POS / Sales" },
  { href: "/dashboard/pos", label: "New sale (POS)" },
  { href: "/dashboard/invoices", label: "Invoices" },
  { href: "/dashboard/cash-drawer", label: "Cash drawer" },
  { href: "/dashboard/debt-aging", label: "Debt aging" },
  { href: "/dashboard/commission", label: "Commission" },
  { href: "/dashboard/gift-cards", label: "Gift cards" },
  { href: "/dashboard/expenses", label: "Expenses" },
  { href: "/dashboard/ledger", label: "Ledger" },
  { href: "/dashboard/reports", label: "Reports" },
  { href: "/dashboard/franchise", label: "Franchise" },
  { href: "/dashboard/profile", label: "Salon Settings" },
];

const managerMenu: NavItem[] = ownerMenu.filter(
  (i) => i.href !== "/dashboard/franchise",
);

const staffMenu: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/appointments", label: "Calendar" },
  { href: "/dashboard/clients", label: "Clients" },
  { href: "/dashboard/services", label: "Services" },
  { href: "/dashboard/products", label: "Products" },
  { href: "/dashboard/inventory", label: "Inventory" },
  { href: "/dashboard/transactions", label: "POS / Sales" },
  { href: "/dashboard/pos", label: "New sale (POS)" },
  { href: "/dashboard/cash-drawer", label: "Cash drawer" },
  { href: "/dashboard/debt-aging", label: "Debt aging" },
  { href: "/dashboard/commission", label: "Commission" },
];

export const menuByRole: Record<AppRole, NavItem[]> = {
  super_admin: [],
  customer: [],
  salon_owner: ownerMenu,
  manager: managerMenu,
  staff: staffMenu,
};

// Keep prefixes broad but safe: any page not listed here is blocked by the guard.
export const allowedPrefixesByRole: Record<AppRole, string[]> = {
  super_admin: ["/admin"],
  customer: ["/my-bookings", "/profile"],
  salon_owner: ownerMenu.map((i) => i.href),
  manager: managerMenu.map((i) => i.href),
  staff: staffMenu.map((i) => i.href),
};

export function isRouteAllowed(role: string, pathname: string): boolean {
  // Profile is always accessible for any authenticated user
  if (pathname === "/dashboard/profile" || pathname === "/admin/profile") return true;

  const r = role as AppRole;
  const allowed = allowedPrefixesByRole[r];
  if (!allowed) return false;
  // Exact match or child routes (e.g. /dashboard/transactions/123)
  return allowed.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

