'use client';

import dynamic from 'next/dynamic';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, authApi, setTenantId, type AuthUser } from './api';

const Toaster = dynamic(
  () => import('sonner').then((mod) => mod.Toaster),
  { ssr: false },
);

export type AppTheme = 'light' | 'dark';

const THEME_KEY = 'salon_theme';
const THEME_COOKIE = 'salon_theme';
const THEME_MAX_AGE = 60 * 60 * 24 * 365;

function writeThemeCookie(value: AppTheme) {
  if (typeof document === 'undefined') return;
  document.cookie = `${THEME_COOKIE}=${encodeURIComponent(value)};path=/;max-age=${THEME_MAX_AGE};SameSite=Lax`;
}

function applyThemeToDocument(theme: AppTheme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
  toggleTheme: () => void;
  login: (email: string, password: string) => Promise<{ user: AuthUser } | { error: string }>;
  loginWithOtp: (email: string, code: string) => Promise<{ user: AuthUser } | { error: string }>;
  loginWithGoogle: (credential: string) => Promise<{ user: AuthUser } | { error: string }>;
  sendOtp: (email: string, locale?: string) => Promise<string | null>;
  registerCustomer: (body: { email: string; password: string; full_name?: string; phone?: string }) => Promise<{ user: AuthUser } | { error: string }>;
  registerSalonOwner: (body: { salon_name: string; salon_address?: string; email: string; password: string; full_name?: string; phone?: string }) => Promise<{ user: AuthUser } | { error: string }>;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredTheme(): AppTheme {
  if (typeof window === 'undefined') return 'dark';
  const s = localStorage.getItem(THEME_KEY);
  return s === 'light' ? 'light' : 'dark';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState<AppTheme>('dark');

  const setTheme = useCallback((t: AppTheme) => {
    setThemeState(t);
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_KEY, t);
      writeThemeCookie(t);
      applyThemeToDocument(t);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev: AppTheme) => {
      const next: AppTheme = prev === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem(THEME_KEY, next);
        writeThemeCookie(next);
        applyThemeToDocument(next);
      }
      return next;
    });
  }, []);

  const setToken = (t: string | null) => {
    setTokenState(t);
    if (typeof window !== 'undefined') {
      if (t) localStorage.setItem('salon_token', t);
      else localStorage.removeItem('salon_token');
    }
  };

  useEffect(() => {
    const t = readStoredTheme();
    setThemeState(t);
    applyThemeToDocument(t);
    writeThemeCookie(t);
  }, []);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('salon_token') : null;
    if (!t) {
      setLoading(false);
      return;
    }
    setTokenState(t);

    const AUTH_ME_MS = 9000;
    let done = false;
    const timeoutId = window.setTimeout(() => {
      if (done) return;
      done = true;
      setToken(null);
      setUser(null);
      setTenantId(null);
      setLoading(false);
    }, AUTH_ME_MS);

    authApi
      .me()
      .then(({ data }) => {
        if (done) return;
        done = true;
        window.clearTimeout(timeoutId);
        if (data?.user) {
          setUser(data.user);
          setTenantId(data.user.tenantId != null ? String(data.user.tenantId) : null);
        } else setToken(null);
        setLoading(false);
      })
      .catch(() => {
        if (done) return;
        done = true;
        window.clearTimeout(timeoutId);
        setToken(null);
        setLoading(false);
      });

    return () => {
      done = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await authApi.login(email, password);
    if (error || !data) return { error: error || 'Login failed' };
    setUser(data.user);
    setToken(data.token);
    setTenantId(data.user.tenantId != null ? String(data.user.tenantId) : null);
    return { user: data.user };
  };

  const sendOtp = async (email: string, locale?: string) => {
    const { error } = await authApi.otpSend(email, undefined, locale);
    return error || null;
  };

  const loginWithOtp = async (email: string, code: string) => {
    const { data, error } = await authApi.otpVerify(email, code);
    if (error || !data) return { error: error || 'Verification failed' };
    if (!('user' in data) || !data.user || !('token' in data) || !data.token) {
      return { error: 'OTP verified, but no account exists for this email. Please register first.' };
    }
    setUser(data.user);
    setToken(data.token);
    setTenantId(data.user.tenantId != null ? String(data.user.tenantId) : null);
    return { user: data.user };
  };

  const loginWithGoogle = async (credential: string) => {
    const { data, error } = await authApi.googleAuth(credential);
    if (error || !data) return { error: error || 'Google login failed' };
    setUser(data.user);
    setToken(data.token);
    setTenantId(data.user.tenantId != null ? String(data.user.tenantId) : null);
    return { user: data.user };
  };

  const logout = () => {
    api('/api/logout', { method: 'POST' }).catch(() => {});
    setToken(null);
    setTenantId(null);
    setUser(null);
  };

  const registerCustomer = async (body: { email: string; password: string; full_name?: string; phone?: string }) => {
    const { data, error } = await authApi.registerCustomer(body);
    if (error || !data) return { error: error || 'Registration failed' };
    setUser(data.user);
    setToken(data.token);
    setTenantId(null);
    return { user: data.user };
  };

  const registerSalonOwner = async (body: {
    salon_name: string;
    salon_address?: string;
    email: string;
    password: string;
    full_name?: string;
    phone?: string;
  }) => {
    const { data, error } = await authApi.registerSalonOwner(body);
    if (error || !data) return { error: error || 'Registration failed' };
    setUser(data.user);
    setToken(data.token);
    setTenantId(data.user.tenantId != null ? String(data.user.tenantId) : null);
    return { user: data.user };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        theme,
        setTheme,
        toggleTheme,
        login,
        sendOtp,
        loginWithOtp,
        loginWithGoogle,
        registerCustomer,
        registerSalonOwner,
        logout,
        setUser,
        setToken,
      }}
    >
      {children}
      <Toaster richColors position="top-right" theme={theme === 'dark' ? 'dark' : 'light'} />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Use inside AuthProvider only. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useAuth();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'inline-flex items-center justify-center size-9 rounded-lg border border-border bg-background/80 text-foreground shadow-sm transition-colors hover:bg-accent',
        className,
      )}
    >
      {isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  );
}
