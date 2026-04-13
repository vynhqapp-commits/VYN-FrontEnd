/* eslint-disable react/no-array-index-key */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Command as CommandIcon,
  Dot,
  LogOut,
  Menu,
  Search,
  User,
  UserCircle2,
  X,
} from "lucide-react";

import { ThemeToggle } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ShellNavItem = { href: string; label: string; icon?: React.ReactNode };

// ── UserMenu ─────────────────────────────────────────────────────────────────

function UserMenu({
  userLabel,
  profileHref,
  onLogout,
}: {
  userLabel?: string;
  profileHref?: string;
  onLogout?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="User menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center justify-center w-9 h-9 rounded-full border transition-colors",
          open
            ? "bg-accent border-border text-foreground"
            : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <UserCircle2 className="size-5" />
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 top-full mt-2 w-56 z-50",
            "bg-background border border-border rounded-xl shadow-lg",
            "overflow-hidden",
          )}
        >
          {/* User info header */}
          <div className="px-4 py-3 border-b border-border bg-muted/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <UserCircle2 className="size-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {userLabel ?? "User"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  Signed in
                </p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            {profileHref && (
              <Link
                href={profileHref}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
              >
                <User className="size-4 text-muted-foreground shrink-0" />
                Profile
              </Link>
            )}

            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <LogOut className="size-4 shrink-0" />
                Log out
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── AppShell ──────────────────────────────────────────────────────────────────

export function AppShell({
  brand,
  userLabel,
  nav,
  onLogout,
  profileHref,
  children,
  onOpenCommandPalette,
}: {
  brand: string;
  userLabel?: string;
  nav: ShellNavItem[];
  onLogout?: () => void;
  profileHref?: string;
  children: React.ReactNode;
  onOpenCommandPalette?: () => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeHref = useMemo(() => {
    if (!pathname) return "";
    const matches = nav
      .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
      .sort((a, b) => b.href.length - a.href.length);
    return matches[0]?.href ?? "";
  }, [nav, pathname]);

  const isActive = (href: string) => href === activeHref;

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Global command palette hotkey (Ctrl+K / Cmd+K)
  useEffect(() => {
    if (!onOpenCommandPalette) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const lock = document.body.getAttribute("data-ui-lock") ?? "";
      if (lock.includes("combobox")) return;
      const isK = e.key?.toLowerCase?.() === "k";
      if (!isK) return;
      const isMod = (e.ctrlKey || e.metaKey) && !e.altKey;
      if (!isMod) return;
      e.preventDefault();
      onOpenCommandPalette();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenCommandPalette]);

  const renderNav = (mode: "desktop" | "mobile") => (
    <nav className={cn("elite-scrollbar flex-1 overflow-auto", mode === "desktop" ? "p-2" : "p-3")}>
      <div className="space-y-1">
        {nav.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive(i.href)
                ? "bg-[var(--elite-orange)] text-white border border-[var(--elite-orange)]"
                : "text-[color:var(--sidebar-nav-text)] hover:bg-accent hover:text-foreground",
              collapsed && mode === "desktop" ? "justify-center" : "",
            )}
            title={collapsed && mode === "desktop" ? i.label : undefined}
          >
            <span
              className={cn(
                isActive(i.href)
                  ? "text-white"
                  : "text-[color:var(--sidebar-nav-text)] group-hover:text-foreground",
              )}
            >
              {i.icon ?? <Dot className="size-5" />}
            </span>
            {!collapsed || mode === "mobile" ? <span>{i.label}</span> : null}
          </Link>
        ))}
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu overlay"
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar desktop */}
      <aside
        className={cn(
          "hidden lg:flex fixed inset-y-0 left-0 z-30 border-r bg-background/80 backdrop-blur-sm",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <div className="flex w-full flex-col">
          <div
            className={cn(
              "h-14 shrink-0 border-b px-3 flex items-center",
              collapsed ? "justify-center" : "justify-between",
            )}
          >
            {!collapsed ? (
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{brand}</div>
                {userLabel ? (
                  <div className="text-xs text-muted-foreground truncate">
                    {userLabel}
                  </div>
                ) : null}
              </div>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cn(collapsed ? "" : "ml-2")}
            >
              {collapsed ? <ChevronRight /> : <ChevronLeft />}
            </Button>
          </div>
          {renderNav("desktop")}
        </div>
      </aside>

      {/* Sidebar mobile */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] border-r bg-background lg:hidden flex flex-col transform transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!mobileOpen}
      >
        <div className="h-14 shrink-0 border-b px-4 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{brand}</div>
            {userLabel ? (
              <div className="text-xs text-muted-foreground truncate">
                {userLabel}
              </div>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="size-4" />
          </Button>
        </div>
        {renderNav("mobile")}
      </aside>

      {/* Main column */}
      <div className={cn("min-h-screen flex flex-col overflow-x-hidden", "lg:pl-64", collapsed ? "lg:pl-[72px]" : "")}>
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-14 border-b bg-background">
          <div className="h-full px-4 sm:px-6 flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu />
            </Button>

            <div className="flex-1">
              <div className="relative max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search… (Ctrl+K)"
                  className="pl-10 pr-24 h-9"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const lock = document.body.getAttribute("data-ui-lock") ?? "";
                    if (lock.includes("combobox")) return;
                    onOpenCommandPalette?.();
                  }}
                  readOnly
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1"
                  onClick={() => onOpenCommandPalette?.()}
                >
                  <CommandIcon className="size-3" />
                  K
                </button>
              </div>
            </div>

            <Button type="button" variant="ghost" size="icon" aria-label="Notifications">
              <Bell />
            </Button>

            <ThemeToggle className="size-9 shrink-0 border-transparent bg-transparent shadow-none hover:bg-accent" />

            {/* User menu dropdown */}
            <UserMenu
              userLabel={userLabel}
              profileHref={profileHref}
              onLogout={onLogout}
            />
          </div>
        </header>

        <main className="flex-1 bg-[var(--elite-bg)]">
          <div className="mx-auto w-full max-w-[96rem] px-3 sm:px-6 py-4 sm:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
