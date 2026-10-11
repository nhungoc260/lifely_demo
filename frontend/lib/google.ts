/** Đăng nhập bằng Google (Google Identity Services). Tắt bằng cách đặt NEXT_PUBLIC_GOOGLE_CLIENT_ID rỗng. */

/** Client ID là thông tin công khai (có trong mọi trang web dùng Google). Biến môi trường, nếu có, sẽ được ưu tiên; đặt rỗng để tắt. */
const DEFAULT_GOOGLE_CLIENT_ID = "1097555342952-i6h01m6bt4k5j06s4kts2t24tuavk9g0.apps.googleusercontent.com";
export const GOOGLE_CLIENT_ID = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? DEFAULT_GOOGLE_CLIENT_ID).trim();
export const googleEnabled = GOOGLE_CLIENT_ID.length > 0;

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleButtonOptions {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill";
  logo_alignment?: "left" | "center";
  width?: number;
  locale?: string;
}

interface GoogleIdApi {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    ux_mode?: "popup" | "redirect";
    auto_select?: boolean;
  }): void;
  renderButton(parent: HTMLElement, options: GoogleButtonOptions): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } };
  }
}

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";
let loading: Promise<void> | null = null;

/** Tải script của Google một lần duy nhất. */
export function loadGoogleScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Chỉ chạy trên trình duyệt"));
  if (window.google?.accounts?.id) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error("Không tải được Google"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** Thông tin giữ tạm giữa bước xác thực Google và bước chọn vai trò. */
export interface PendingGoogle {
  credential: string;
  email: string;
  fullName: string;
  role?: string;
}

const PENDING_KEY = "lifely.google.pending";

export function savePendingGoogle(pending: PendingGoogle): void {
  try {
    window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    /* sessionStorage bị chặn: bỏ qua, người dùng sẽ phải đăng nhập lại */
  }
}

/** Chuỗi thô, dùng làm snapshot ổn định cho useSyncExternalStore. */
export function readPendingGoogleRaw(): string | null {
  try {
    return window.sessionStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

export function parsePendingGoogle(raw: string | null): PendingGoogle | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<PendingGoogle>;
    if (typeof v.credential !== "string" || !v.credential) return null;
    return {
      credential: v.credential,
      email: typeof v.email === "string" ? v.email : "",
      fullName: typeof v.fullName === "string" ? v.fullName : "",
      role: typeof v.role === "string" ? v.role : undefined,
    };
  } catch {
    return null;
  }
}

export function clearPendingGoogle(): void {
  try {
    window.sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* bỏ qua */
  }
}
