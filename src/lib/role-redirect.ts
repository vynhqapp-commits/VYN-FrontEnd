// Matches backend spatie/laravel-permission role names (lowercase)
export type AppRole = 'super_admin' | 'salon_owner' | 'manager' | 'staff' | 'customer';

/** Default path after login for each role */
export function getRedirectForRole(role: string): string {
  switch (role) {
    case 'super_admin':
      return '/admin';
    case 'salon_owner':
    case 'manager':
    case 'staff':
      return '/dashboard';
    case 'customer':
      return '/my-bookings';
    default:
      return '/dashboard';
  }
}

export const SALON_ROLES: AppRole[] = ['salon_owner', 'manager', 'staff'];
export const ADMIN_ROLE: AppRole = 'super_admin';
export const CUSTOMER_ROLE: AppRole = 'customer';

export function isAdmin(role: string): boolean {
  return role === 'super_admin';
}

export function isSalonRole(role: string): boolean {
  return SALON_ROLES.includes(role as AppRole);
}

export function isCustomer(role: string): boolean {
  return role === 'customer';
}
