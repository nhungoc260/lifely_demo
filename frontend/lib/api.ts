import { tokenStore } from "@/lib/auth-store";
import { msUntilExpiry } from "@/lib/jwt";
import type { ApiResponse } from "@/types/api";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8080";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function toApiError(e: unknown): ApiError {
  return e instanceof ApiError ? e : new ApiError("Đã xảy ra sự cố.", "UNKNOWN", 0);
}

/** Header bắt buộc cho /refresh và /logout: trình duyệt không cho site lạ gửi header tùy chỉnh này. */
const CLIENT_HEADER = { "X-Lifely-Client": "web" };
/** Gia hạn trước khi access token hết hạn khoảng này để tránh một request thất bại rồi mới thử lại. */
const REFRESH_AHEAD_MS = 30_000;

let inflightRefresh: Promise<boolean> | null = null;

/** Hai tab cùng gia hạn một lúc sẽ được xếp hàng, tránh dùng chung một refresh token cũ. */
function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  return locks ? (locks.request("lifely-refresh", fn) as Promise<T>) : fn();
}

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: CLIENT_HEADER,
      cache: "no-store",
    });
    let json: { success?: boolean; data?: { token?: string } } | null = null;
    try {
      json = await res.json();
    } catch {
      /* body không phải JSON */
    }
    if (res.ok && json?.success && json.data?.token) {
      tokenStore.set(json.data.token);
      return true;
    }
    if (res.status === 401 || res.status === 403) tokenStore.set(null); // phiên thật sự đã hết/bị thu hồi
    return false;
  } catch {
    return false; // lỗi mạng: chưa kết luận phiên hỏng, giữ nguyên trạng thái
  }
}

/** Đổi refresh token (cookie httpOnly) lấy access token mới. Nhiều lời gọi đồng thời dùng chung một request. */
export function refreshSession(): Promise<boolean> {
  if (!inflightRefresh) {
    inflightRefresh = withRefreshLock(doRefresh).finally(() => {
      inflightRefresh = null;
    });
  }
  return inflightRefresh;
}

/** Gia hạn sớm nếu access token sắp hết hạn. */
export async function ensureFreshToken(): Promise<void> {
  const t = tokenStore.get();
  if (!t) return;
  const left = msUntilExpiry(t);
  if (left !== null && left < REFRESH_AHEAD_MS) await refreshSession();
}

/** Thu hồi refresh token ở server và xóa cookie. Không bao giờ ném lỗi: đăng xuất phía client luôn thành công. */
export async function logoutRequest(): Promise<void> {
  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: CLIENT_HEADER,
      cache: "no-store",
    });
  } catch {
    /* mạng lỗi: cookie sẽ tự hết hạn ở server */
  }
}

/** fetch có gắn JWT, tự gia hạn khi hết hạn. Dùng cho tải file/blob (không bóc ApiResponse). */
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  await ensureFreshToken();
  const send = () => {
    const t = tokenStore.get();
    return fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: { ...(init.headers as Record<string, string> | undefined), ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    });
  };
  let res = await send();
  if (res.status === 401 && tokenStore.get() && (await refreshSession())) res = await send();
  return res;
}

interface Options extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
}

/** Gọi REST API của Spring Boot, tự gắn JWT và bóc lớp ApiResponse. */
export async function apiFetch<T>(path: string, options: Options = {}, retried = false): Promise<T> {
  const { body, auth = true, headers, ...rest } = options;
  if (auth) await ensureFreshToken();
  const token = auth ? tokenStore.get() : null;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      credentials: "include", // gửi/nhận cookie refresh token
      headers: {
        ...(isForm ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Không kết nối được máy chủ. Hãy kiểm tra kết nối mạng và xem backend đã chạy chưa.",
      "NETWORK_ERROR",
      0,
    );
  }

  let json: (ApiResponse<T> & { errors?: Record<string, string> }) | null = null;
  try {
    json = await res.json();
  } catch {
    /* body không phải JSON */
  }

  if (!res.ok || !json || !json.success) {
    const failure = json && !json.success ? json : null;
    if (res.status === 401 && token && failure?.code === "UNAUTHORIZED") {
      // Access token hết hạn: thử gia hạn bằng refresh token rồi gọi lại đúng một lần.
      if (!retried && (await refreshSession())) return apiFetch<T>(path, options, true);
      if (retried) tokenStore.set(null);
    }
    throw new ApiError(
      failure?.message ?? "Phản hồi từ máy chủ không như mong đợi.",
      failure?.code ?? "UNKNOWN",
      res.status,
      failure?.errors,
    );
  }
  return json.data;
}

export const get = <T>(path: string, auth = true) => apiFetch<T>(path, { auth });
export const post = <T>(path: string, body?: unknown, auth = true) =>
  apiFetch<T>(path, { method: "POST", body, auth });
export const put = <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PUT", body });

export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}
