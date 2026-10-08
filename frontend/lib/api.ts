import { tokenStore } from "@/lib/auth-store";
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

interface Options extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
}

/** Gọi REST API của Spring Boot, tự gắn JWT và bóc lớp ApiResponse. */
export async function apiFetch<T>(path: string, options: Options = {}): Promise<T> {
  const { body, auth = true, headers, ...rest } = options;
  const token = auth ? tokenStore.get() : null;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
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
      tokenStore.set(null); // phiên hết hạn: đưa người dùng về trạng thái chưa đăng nhập
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
