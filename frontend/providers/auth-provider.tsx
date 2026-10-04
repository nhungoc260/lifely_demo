"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

import { useQuery } from "@/hooks/use-query";
import { get } from "@/lib/api";
import { tokenStore } from "@/lib/auth-store";
import { realtime } from "@/lib/realtime";
import type { AuthResponse, Role, UserSummary } from "@/types/domain";

type Status = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  status: Status;
  user: UserSummary | null;
  token: string | null;
  role: Role | null;
  signIn: (res: AuthResponse) => void;
  signOut: () => void;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const noopSubscribe = () => () => {};

export function homeFor(role: Role | null): string {
  switch (role) {
    case "DONOR": return "/donor/dashboard";
    case "REQUESTER": return "/requester/dashboard";
    case "ORGANIZATION": return "/organization/dashboard";
    case "ADMIN": return "/admin/dashboard";
    default: return "/login";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const token = useSyncExternalStore(tokenStore.subscribe, tokenStore.get, () => null);
  const me = useQuery<UserSummary>(token ? `me:${token.slice(-12)}` : null, () => get<UserSummary>("/api/users/me"));

  useEffect(() => {
    realtime.setToken(token);
  }, [token]);

  // Token bị từ chối (hết hạn, tài khoản bị khóa) thì xóa để người dùng đăng nhập lại.
  useEffect(() => {
    if (me.error && (me.error.status === 401 || me.error.status === 403)) tokenStore.set(null);
  }, [me.error]);

  const signIn = useCallback((res: AuthResponse) => tokenStore.set(res.token), []);
  const signOut = useCallback(() => tokenStore.set(null), []);

  const value = useMemo<AuthContextValue>(() => {
    const user = token ? (me.data ?? null) : null;
    const status: Status = !hydrated ? "loading" : !token ? "anonymous" : user ? "authenticated" : me.error ? "anonymous" : "loading";
    return { status, user, token, role: user?.roles[0] ?? null, signIn, signOut, refresh: me.reload };
  }, [hydrated, token, me.data, me.error, me.reload, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
