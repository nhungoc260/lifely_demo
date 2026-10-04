const KEY = "lifely.token";
const listeners = new Set<() => void>();

/**
 * Lưu JWT trong localStorage (prototype). Rủi ro XSS được giảm nhờ React tự escape và backend sanitize;
 * khi lên production nên chuyển sang cookie httpOnly + SameSite và CSRF token.
 */
export const tokenStore = {
  get(): string | null {
    try {
      return window.localStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  set(token: string | null) {
    try {
      if (token) window.localStorage.setItem(KEY, token);
      else window.localStorage.removeItem(KEY);
    } catch {
      /* storage không khả dụng */
    }
    listeners.forEach((l) => l());
  },
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
};
