'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi, setTenantId, type AuthUser } from './api';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ user: AuthUser } | { error: string }>;
  loginWithOtp: (email: string, code: string) => Promise<{ user: AuthUser } | { error: string }>;
  sendOtp: (email: string) => Promise<string | null>;
  registerCustomer: (body: { email: string; password: string; full_name?: string; phone?: string }) => Promise<{ user: AuthUser } | { error: string }>;
  registerSalonOwner: (body: { salon_name: string; salon_address?: string; email: string; password: string; full_name?: string; phone?: string }) => Promise<{ user: AuthUser } | { error: string }>;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setToken = (t: string | null) => {
    setTokenState(t);
    if (typeof window !== 'undefined') {
      if (t) localStorage.setItem('salon_token', t);
      else localStorage.removeItem('salon_token');
    }
  };

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('salon_token') : null;
    if (!t) {
      setLoading(false);
      return;
    }
    setTokenState(t);
    authApi.me().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
        setTenantId(data.user.tenantId != null ? String(data.user.tenantId) : null);
      } else setToken(null);
      setLoading(false);
    }).catch(() => {
      setToken(null);
      setLoading(false);
    });
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await authApi.login(email, password);
    if (error || !data) return { error: error || 'Login failed' };
    setUser(data.user);
    setToken(data.token);
    setTenantId(data.user.tenantId != null ? String(data.user.tenantId) : null);
    return { user: data.user };
  };

  const sendOtp = async (email: string) => {
    const { error } = await authApi.otpSend(email);
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

  const logout = () => {
    setUser(null);
    setToken(null);
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
        login,
        sendOtp,
        loginWithOtp,
        registerCustomer,
        registerSalonOwner,
        logout,
        setUser,
        setToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
