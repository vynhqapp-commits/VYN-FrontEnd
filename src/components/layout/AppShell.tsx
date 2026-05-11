/* eslint-disable react/no-array-index-key */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
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

export type ShellNavGroup = {
  id: string;
  label: string;
  items: ShellNavItem[];
};

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

function flattenNavGroups(nav: ShellNavGroup[]): ShellNavItem[] {
  return nav.flatMap((g) => g.items);
}

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
  nav: ShellNavGroup[];
  onLogout?: () => void;
  profileHref?: string;
  children: React.ReactNode;
  onOpenCommandPalette?: () => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  /** Category sections folded closed (desktop expanded sidebar only) */
  const [foldedGroupIds, setFoldedGroupIds] = useState<Set<string>>(() => new Set());

  const flatNav = useMemo(() => flattenNavGroups(nav), [nav]);

  const activeHref = useMemo(() => {
    if (!pathname) return "";
    const matches = flatNav
      .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
      .sort((a, b) => b.href.length - a.href.length);
    return matches[0]?.href ?? "";
  }, [flatNav, pathname]);

  const isActive = (href: string) => href === activeHref;

  const toggleGroupFold = (id: string) => {
    setFoldedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  const renderNavLink = (i: ShellNavItem, mode: "desktop" | "mobile") => (
    <Link
      key={i.href}
      href={i.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium transition-all duration-200 ease-out",
        isActive(i.href)
          ? "bg-[var(--elite-orange)]/10 text-[var(--elite-orange)]"
          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100",
        collapsed && mode === "desktop" ? "justify-center" : "",
      )}
      title={collapsed && mode === "desktop" ? i.label : undefined}
    >
      {/* Active Indicator Bar */}
      {isActive(i.href) && mode === "desktop" && !collapsed && (
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-[var(--elite-orange)] shadow-[2px_0_8px_rgba(249,115,22,0.3)] animate-in slide-in-from-left-2 duration-300" />
      )}

      <span
        className={cn(
          "shrink-0 transition-colors duration-200",
          isActive(i.href)
            ? "text-[var(--elite-orange)]"
            : "text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200",
        )}
      >
        {i.icon ? (
          <span className={cn("[&>svg]:size-[18px]")}>{i.icon}</span>
        ) : (
          <Dot className="size-5" />
        )}
      </span>
      {!collapsed || mode === "mobile" ? (
        <span className={cn(
          "truncate",
          isActive(i.href) ? "font-semibold" : ""
        )}>
          {i.label}
        </span>
      ) : null}
    </Link>
  );

  const renderNav = (mode: "desktop" | "mobile") => {
    const narrowSidebar = mode === "desktop" && collapsed;
    const showCategoryHeaders = !narrowSidebar;

    return (
      <nav
        className={cn(
          "elite-scrollbar flex-1 overflow-auto",
          mode === "desktop" ? "p-2" : "p-3",
        )}
      >
        {narrowSidebar ? (
          <div className="space-y-1">
            {flatNav.map((i) => renderNavLink(i, mode))}
          </div>
        ) : (
          <div className="space-y-3">
            {nav.map((group) => {
              const folded = foldedGroupIds.has(group.id);
              return (
                <div key={group.id} className="space-y-1">
                  {showCategoryHeaders && group.items.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => toggleGroupFold(group.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-[10px] font-bold uppercase tracking-[0.08em]",
                        "text-zinc-400 dark:text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 hover:text-zinc-600 transition-colors",
                      )}
                      aria-expanded={!folded}
                    >
                      <ChevronDown
                        className={cn(
                          "size-3.5 shrink-0 transition-transform",
                          folded ? "-rotate-90" : "",
                        )}
                      />
                      <span className="truncate">{group.label}</span>
                    </button>
                  ) : null}
                  {!folded ? (
                    <div className="space-y-1 pl-0.5">
                      {group.items.map((i) => renderNavLink(i, mode))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </nav>
    );
  };

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
          "hidden lg:flex fixed inset-y-0 left-0 z-30 border-r border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-950 shadow-[4px_0_24px_rgba(0,0,0,0.02)]",
          collapsed ? "w-[72px]" : "w-[270px]",
        )}
      >
        <div className="flex w-full flex-col px-3 py-4">
          <div
            className={cn(
              "h-16 shrink-0 px-3 mb-4 flex items-center bg-zinc-50/50 dark:bg-zinc-900/30 rounded-2xl border border-zinc-100 dark:border-zinc-800/50",
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
      <div className={cn("min-h-screen flex flex-col overflow-x-hidden", "lg:pl-[270px]", collapsed ? "lg:pl-[72px]" : "")}>
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-16 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl shadow-sm">
          <div className="h-full px-4 sm:px-8 flex items-center gap-4">
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

            <div className="flex-1 flex justify-center lg:justify-start">
              <div className="relative w-full max-w-md group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400 group-focus-within:text-[var(--elite-orange)] transition-colors" />
                <Input
                  placeholder="Quick search… (Ctrl+K)"
                  className="pl-10 pr-24 h-10 rounded-xl bg-zinc-100/50 dark:bg-zinc-900/50 border-transparent focus:bg-white dark:focus:bg-zinc-950 focus:ring-[var(--elite-orange)]/20 focus:border-[var(--elite-orange)]/30 transition-all placeholder:text-zinc-400"
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
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium tracking-wider uppercase text-zinc-400 inline-flex items-center gap-1 rounded-lg border border-zinc-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 px-2 py-1 shadow-sm"
                  onClick={() => onOpenCommandPalette?.()}
                >
                  <span className="text-xs opacity-70">⌘</span>
                  <span>K</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="icon" className="size-9 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-zinc-500 hover:text-zinc-900" aria-label="Notifications">
                <Bell className="size-5" />
              </Button>

              <ThemeToggle className="size-9 shrink-0 border-transparent bg-transparent shadow-none rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 hover:text-zinc-900" />
            </div>

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
