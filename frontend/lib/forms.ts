import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import { ApiError } from "@/lib/api";

/** Đưa lỗi validation từ backend về đúng ô nhập; trả true nếu có ít nhất một ô được gán lỗi. */
export function applyServerErrors<T extends FieldValues>(e: unknown, setError: UseFormSetError<T>): boolean {
  if (!(e instanceof ApiError) || !e.fieldErrors) return false;
  let any = false;
  Object.entries(e.fieldErrors).forEach(([field, message]) => {
    setError(field as Path<T>, { type: "server", message });
    any = true;
  });
  return any;
}

/** Chỉ cho phép chuyển hướng nội bộ để tránh open redirect. */
export function safeNext(next: string | null): string | null {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}
