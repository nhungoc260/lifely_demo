const HINT_KEY = "lifely.session";
const listeners = new Set<() => void>();

/**
 * Access token CHỈ nằm trong bộ nhớ (biến module), không ghi vào localStorage nên mã JavaScript độc hại (XSS)
 * không đọc trộm được từ ổ lưu trữ. Phiên dài hạn do refresh token trong cookie httpOnly đảm nhiệm:
 * khi tải lại trang, ứng dụng gọi /api/auth/refresh để lấy lại access token.
 * "Gợi ý phiên" trong localStorage chỉ là cờ 1/0 (không phải bí mật) để biết có nên thử khôi phục hay không.
 */
let token: string | null = null;
let session = 0;
let restoring = typeof window !== "undefined" && readHint();

function readHint(): boolean {
  try {
    return window.localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
}

function writeHint(on: boolean) {
  try {
    if (on) window.localStorage.setItem(HINT_KEY, "1");
    else window.localStorage.removeItem(HINT_KEY);
  } catch {
    /* storage không khả dụng */
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export const tokenStore = {
  get: (): string | null => token,
  /** Tăng mỗi lần trạng thái đăng nhập đổi (đăng nhập/đăng xuất), KHÔNG tăng khi chỉ gia hạn token. */
  getSession: (): number => session,
  /** true khi đang thử khôi phục phiên từ refresh token sau khi tải lại trang. */
  isRestoring: (): boolean => restoring,
  set(next: string | null) {
    const flipped = (next === null) !== (token === null);
    token = next;
    if (flipped) session += 1;
    writeHint(next !== null);
    emit();
  },
  finishRestore() {
    if (!restoring) return;
    restoring = false;
    emit();
  },
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
};
