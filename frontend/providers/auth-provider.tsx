"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

import { useQuery } from "@/hooks/use-query";
import { get, logoutRequest, post, put, refreshSession } from "@/lib/api";
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
  /** Chọn không gian làm việc (người hiến / người cần máu) cho tài khoản có nhiều vai trò. */
  switchMode: (role: Role) => void;
  /** Bật thêm một vai trò cho tài khoản (backend: POST /api/users/me/roles) rồi chuyển sang đó. */
  enableRole: (role: Role) => Promise<void>;
  /** Đổi hoặc xóa (null) ảnh đại diện của chính mình. */
  setAvatar: (dataUrl: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const noopSubscribe = () => () => {};

const MODE_KEY = "lifely-mode";
const modeListeners = new Set<() => void>();
const modeStore = {
  get: (): string | null => { try { return localStorage.getItem(MODE_KEY); } catch { return null; } },
  set: (r: Role | null) => {
    try { if (r) localStorage.setItem(MODE_KEY, r); else localStorage.removeItem(MODE_KEY); } catch { /* bộ nhớ bị chặn */ }
    modeListeners.forEach((f) => f());
  },
  subscribe: (cb: () => void) => {
    modeListeners.add(cb);
    window.addEventListener("storage", cb);
    return () => { modeListeners.delete(cb); window.removeEventListener("storage", cb); };
  },
};

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
  // Khóa theo "phiên" (đổi khi đăng nhập/đăng xuất) chứ không theo token, để gia hạn token không làm tải lại hồ sơ.
  const session = useSyncExternalStore(tokenStore.subscribe, tokenStore.getSession, () => 0);
  const restoring = useSyncExternalStore(tokenStore.subscribe, tokenStore.isRestoring, () => false);
  const mode = useSyncExternalStore(modeStore.subscribe, modeStore.get, () => null);
  const me = useQuery<UserSummary>(token ? `me:${session}` : null, () => get<UserSummary>("/api/users/me"));

  // Tải lại trang: access token (chỉ nằm trong bộ nhớ) đã mất, khôi phục từ refresh token trong cookie httpOnly.
  useEffect(() => {
    if (!tokenStore.isRestoring()) return;
    void refreshSession().finally(() => tokenStore.finishRestore());
  }, []);

  useEffect(() => {
    realtime.setToken(token);
  }, [token]);

  // Token bị từ chối (hết hạn, tài khoản bị khóa) thì xóa để người dùng đăng nhập lại.
  useEffect(() => {
    if (me.error && (me.error.status === 401 || me.error.status === 403)) tokenStore.set(null);
  }, [me.error]);

  const signIn = useCallback((res: AuthResponse) => tokenStore.set(res.token), []);
  const signOut = useCallback(() => {
    void logoutRequest(); // thu hồi refresh token ở server (không chặn giao diện)
    modeStore.set(null);
    tokenStore.set(null);
  }, []);
  const switchMode = useCallback((r: Role) => modeStore.set(r), []);
  const mutateMe = me.mutate;
  const enableRole = useCallback(async (r: Role) => {
    const updated = await post<UserSummary>("/api/users/me/roles", { role: r });
    mutateMe(() => updated);
    modeStore.set(r);
  }, [mutateMe]);
  const setAvatar = useCallback(async (dataUrl: string | null) => {
    const updated = await put<UserSummary>("/api/users/me/avatar", { avatarUrl: dataUrl });
    mutateMe(() => updated);
  }, [mutateMe]);

  const value = useMemo<AuthContextValue>(() => {
    const user = token ? (me.data ?? null) : null;
    const status: Status = !hydrated || restoring ? "loading" : !token ? "anonymous" : user ? "authenticated" : me.error ? "anonymous" : "loading";
    const role = user ? (mode && user.roles.includes(mode as Role) ? (mode as Role) : user.roles[0] ?? null) : null;
    return { status, user, token, role, signIn, signOut, refresh: me.reload, switchMode, enableRole, setAvatar };
  }, [hydrated, restoring, token, me.data, me.error, me.reload, mode, signIn, signOut, switchMode, enableRole, setAvatar]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Như useAuth nhưng trả về null (không ném lỗi) khi đứng ngoài AuthProvider. */
export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
