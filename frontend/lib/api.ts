import type { ApiResponse } from "@/types/api";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8080";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Gọi REST API của Spring Boot và bóc lớp ApiResponse. */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Cannot reach the server. Check that the backend is running.",
      "NETWORK_ERROR",
      0,
    );
  }

  let body: ApiResponse<T> | null = null;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    /* body không phải JSON */
  }

  if (!res.ok || !body || !body.success) {
    throw new ApiError(
      body && !body.success ? body.message : "Unexpected server response.",
      body && !body.success ? body.code : "UNKNOWN",
      res.status,
    );
  }
  return body.data;
}
