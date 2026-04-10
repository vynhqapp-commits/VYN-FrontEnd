"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarCheck, UserCircle, LayoutDashboard, UserRound } from "lucide-react";
import { useAuth, ThemeToggle } from "@/lib/auth-context";
import { getRedirectForRole } from "@/lib/role-redirect";
import { APP_NAME } from "@/lib/app-name";
import { getPublicT } from "@/lib/i18n-public";
import { useLocale } from "@/components/LocaleProvider";
import { cn } from "@/lib/utils";

/**
 * Shared public-facing header.
 *
 * Used by:
 *  - /book  (the public booking flow)
 *  - (customer) layout  (my-bookings and other customer pages)
 *
 * Renders a different right-side action depending on the auth state:
 *  - Guest            → Register  |  Log in
 *  - Customer         → My Bookings pill  |  name  |  Log out
 *  - Staff/Owner/Admin→ Go to Dashboard  |  Log out
 */
export default function PublicHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { locale } = useLocale();
  const t = getPublicT(locale);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const isCustomer = user?.role === "customer";
  const isSalonRole =
    user && ["salon_owner", "manager", "staff", "super_admin"].includes(user.role);

  return (
    <header className="bg-background/90 backdrop-blur-sm border-b border-border shadow-sm sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">

        {/* ── Left: Logo + (customer) nav links ── */}
        <div className="flex items-center gap-6 min-w-0">
          <Link
            href="/"
            className="font-display text-base font-semibold text-foreground hover:text-primary transition-colors shrink-0"
          >
            {APP_NAME}
          </Link>

          {/* Customer navigation links */}
          {isCustomer && (
            <nav className="hidden sm:flex items-center gap-5">
              <NavLink href="/my-bookings" active={pathname === "/my-bookings"}>
                {t("myBookings")}
              </NavLink>
              <NavLink href="/favorites" active={pathname === "/favorites"}>
                {t("favorites")}
              </NavLink>
              <NavLink href="/book" active={pathname.startsWith("/book")}>
                {t("bookAVisit")}
              </NavLink>
              <NavLink href="/profile" active={pathname === "/profile"}>
                {t("profile")}
              </NavLink>
            </nav>
          )}
        </div>

        {/* ── Right: Auth state ── */}
        <div className="flex items-center gap-3 shrink-0">
          <ThemeToggle className="size-8 border-border/80" />

          {user ? (
            <>
              {/* User name */}
              <span className="hidden sm:flex items-center gap-1.5 text-sm text-foreground font-medium">
                <UserCircle className="w-4 h-4 text-primary" />
                {user.fullName ?? user.name ?? user.email}
              </span>

              {/* Role-specific action */}
              {isCustomer && (
                <>
                  <Link
                    href="/profile"
                    className="flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:bg-accent transition-colors"
                    title={t("profile")}
                  >
                    <UserRound className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/my-bookings"
                    className="flex items-center gap-1.5 text-sm font-medium text-primary-foreground
                      bg-primary hover:opacity-90 px-3 py-1.5 rounded-lg
                      transition-colors shadow-sm"
                  >
                    <CalendarCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t("myBookings")}</span>
                    <span className="sm:hidden">{t("myBookings")}</span>
                  </Link>
                </>
              )}

              {isSalonRole && (
                <Link
                  href={getRedirectForRole(user.role)}
                  className="flex items-center gap-1.5 text-sm font-medium text-primary-foreground
                    bg-primary hover:opacity-90 px-3 py-1.5 rounded-lg
                    transition-colors shadow-sm"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  {t("goToDashboard")}
                </Link>
              )}

              {/* Log out */}
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("logOut")}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/register"
                className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("register")}
              </Link>
              <Link
                href="/login"
                className="text-sm font-medium text-primary-foreground bg-primary
                  hover:opacity-90 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
              >
                {t("logIn")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "text-sm font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
