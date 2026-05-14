"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarCheck, UserCircle, LayoutDashboard, UserRound, Globe, Menu, X, Package, CreditCard, Heart, User } from "lucide-react";
import { useAuth, ThemeToggle } from "@/lib/auth-context";
import { getRedirectForRole } from "@/lib/role-redirect";
import { APP_NAME } from "@/lib/app-name";
import { getPublicT, supportedPublicLocales, type PublicLocale } from "@/lib/i18n-public";
import { useLocale } from "@/components/LocaleProvider";
import { cn } from "@/lib/utils";

const LOCALE_LABELS: Record<PublicLocale, string> = { en: "EN", ar: "عربي", fr: "FR" };

export default function PublicHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale, setLocale } = useLocale();
  const t = getPublicT(locale);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/");
    setMobileMenuOpen(false);
  };

  const isCustomer = user?.role === "customer";
  const isSalonRole =
    user && ["salon_owner", "manager", "staff", "super_admin"].includes(user.role);

  const navLinks = [
    { href: "/my-bookings", label: t("myBookings"), icon: <CalendarCheck className="size-4" />, active: pathname === "/my-bookings" },
    { href: "/my-packages", label: t("myPackages"), icon: <Package className="size-4" />, active: pathname === "/my-packages" && !searchParams.get('tab') },
    { href: "/my-packages?tab=memberships", label: "My Memberships", icon: <CreditCard className="size-4" />, active: pathname === "/my-packages" && searchParams.get('tab') === 'memberships' },
    { href: "/favorites", label: t("favorites"), icon: <Heart className="size-4" />, active: pathname === "/favorites" },
    { href: "/book", label: t("bookAVisit"), icon: <CalendarCheck className="size-4" />, active: pathname.startsWith("/book") },
    { href: "/profile", label: t("profile"), icon: <User className="size-4" />, active: pathname === "/profile" },
  ];

  return (
    <>
    <header className={cn(
      "bg-background/95 backdrop-blur-md border-b border-border shadow-sm sticky top-0 transition-all",
      mobileMenuOpen ? "z-[10000]" : "z-50"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">

        {/* ── Left: Logo + Desktop Nav ── */}
        <div className="flex items-center gap-8 min-w-0">
          <Link
            href="/"
            className="font-display text-xl font-black tracking-tight text-foreground hover:text-primary transition-all shrink-0"
          >
            {APP_NAME}
          </Link>

          {isCustomer && (
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <NavLink key={link.href} href={link.href} active={link.active}>
                  {link.label}
                </NavLink>
              ))}
            </nav>
          )}
        </div>

        {/* ── Right: Actions ── */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <ThemeToggle className="size-9 border-border/50 rounded-xl" />
            <LocaleSwitcher locale={locale} setLocale={setLocale} />
          </div>

          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-accent/50 border border-border/50">
                <UserCircle className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground truncate max-w-[120px]">
                  {user.fullName ?? user.name ?? user.email}
                </span>
              </div>

              {isSalonRole && (
                <Link
                  href={getRedirectForRole(user.role)}
                  className="hidden sm:flex items-center gap-2 text-xs font-black text-primary-foreground
                    bg-primary hover:scale-[1.02] active:scale-[0.98] px-4 py-2.5 rounded-xl
                    transition-all shadow-md"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  {t("goToDashboard")}
                </Link>
              )}

              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl hover:bg-accent transition-colors"
              >
                {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="hidden lg:block text-xs font-bold text-muted-foreground hover:text-red-500 transition-colors px-2"
              >
                {t("logOut")}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-xs font-black text-primary-foreground bg-primary
                  hover:scale-[1.02] active:scale-[0.98] px-5 py-2.5 rounded-xl transition-all shadow-md"
              >
                {t("logIn")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>

    {/* ── Mobile Menu Overlay ── */}
    {mobileMenuOpen && (
      <div className="lg:hidden fixed inset-0 z-[10000] bg-background text-foreground flex flex-col">
        {/* Mobile Header Inside Menu */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <span className="font-display text-xl font-black tracking-tight">{APP_NAME}</span>
          <button onClick={() => setMobileMenuOpen(false)} className="p-2">
            <X className="size-8" />
          </button>
        </div>

        <nav className="flex flex-col p-4 gap-1 overflow-y-auto flex-1">
          {isCustomer && navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-4 p-5 rounded-2xl text-lg font-bold transition-all",
                link.active 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              <div className={cn("p-2 rounded-xl", link.active ? "bg-primary/20" : "bg-muted")}>
                {link.icon}
              </div>
              {link.label}
            </Link>
          ))}
          
          <div className="mt-auto pt-4 border-t border-border/50 flex flex-col gap-6">
            <div className="flex items-center justify-between px-4">
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Appearance & Language</span>
              <div className="flex gap-4">
                <ThemeToggle className="size-11 border-border/50 rounded-2xl bg-accent/50" />
                <LocaleSwitcher locale={locale} setLocale={setLocale} />
              </div>
            </div>

            {user && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-4 p-5 rounded-2xl text-lg font-bold text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-100 dark:hover:bg-red-500/10 dark:hover:border-red-500/20"
              >
                <div className="p-2 rounded-xl bg-red-50 dark:bg-red-500/10">
                  <X className="size-5" />
                </div>
                {t("logOut")}
              </button>
            )}
          </div>
        </nav>
      </div>
    )}
    </>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-xl",
        active 
          ? "text-orange-600 bg-orange-50/50 dark:text-orange-500 dark:bg-orange-500/10 shadow-sm" 
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
      )}
    >
      {children}
    </Link>
  );
}

function LocaleSwitcher({ locale, setLocale }: { locale: PublicLocale; setLocale: (l: PublicLocale) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center justify-center gap-1 size-9 rounded-xl border border-border/50 bg-background/80
          text-foreground text-xs font-bold shadow-sm transition-all hover:bg-accent"
      >
        <Globe className="size-4" />
        <span className="text-[10px]">{LOCALE_LABELS[locale]}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute end-0 top-full mt-2 z-40 min-w-[8rem] rounded-2xl border border-border bg-background/95 backdrop-blur-md shadow-xl py-2 animate-in zoom-in-95">
            {supportedPublicLocales.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => { setLocale(l); setOpen(false); }}
                className={cn(
                  "w-full px-4 py-2 text-start text-xs font-bold transition-colors",
                  l === locale ? "text-primary bg-accent/50" : "text-foreground hover:bg-accent"
                )}
              >
                {LOCALE_LABELS[l]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
