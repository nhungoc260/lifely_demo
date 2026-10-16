/** Tiện ích Web Push phía trình duyệt (thuần, kiểm thử được). */

/** applicationServerKey phải là Uint8Array; khóa VAPID từ server ở dạng base64url. */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function isIosDevice(userAgent: string): boolean {
  return /iPad|iPhone|iPod/.test(userAgent);
}

export type PushSupport =
  | { ok: true }
  | { ok: false; reason: "unsupported" | "ios-needs-install" | "denied" };

/**
 * Trên iPhone/iPad (iOS 16.4+) Web Push chỉ hoạt động khi ứng dụng đã được "Thêm vào MH chính" và mở từ biểu tượng đó.
 * Hàm nhận môi trường vào để dễ kiểm thử.
 */
export function pushSupport(env: {
  userAgent: string;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  standalone: boolean;
  permission: NotificationPermission | "unsupported";
}): PushSupport {
  if (isIosDevice(env.userAgent) && !env.standalone) return { ok: false, reason: "ios-needs-install" };
  if (!env.hasServiceWorker || !env.hasPushManager || !env.hasNotification) return { ok: false, reason: "unsupported" };
  if (env.permission === "denied") return { ok: false, reason: "denied" };
  return { ok: true };
}

export const PUSH_REASON_TEXT: Record<Exclude<PushSupport, { ok: true }>["reason"], string> = {
  "ios-needs-install": "Trên iPhone, hãy bấm Chia sẻ → Thêm vào MH chính, mở LIFELY từ biểu tượng vừa thêm rồi bật lại tại đây.",
  unsupported: "Trình duyệt này chưa hỗ trợ thông báo đẩy. Bạn vẫn nhận thông báo trong ứng dụng.",
  denied: "Bạn đã chặn thông báo cho trang này. Hãy mở cài đặt trình duyệt để cho phép lại.",
};
