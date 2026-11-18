"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { AuthLayout } from "@/components/auth/auth-layout";
import { toApiError } from "@/lib/api";
import { authApi } from "@/services";

type State = { kind: "loading" } | { kind: "ok" } | { kind: "error"; message: string };

function VerifyEmail() {
  const token = useSearchParams().get("token");
  const [state, setState] = useState<State>(token ? { kind: "loading" } : { kind: "error", message: "Thiếu liên kết xác minh." });
  const started = useRef(false);   // liên kết dùng một lần: tránh gọi hai lần khi React chạy lại effect ở chế độ dev

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    authApi.verifyEmail(token)
      .then(() => setState({ kind: "ok" }))
      .catch((e) => setState({ kind: "error", message: toApiError(e).message }));
  }, [token]);

  if (state.kind === "loading") {
    return (
      <AuthLayout title="Đang xác minh email" subtitle="Vui lòng chờ trong giây lát.">
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin" aria-hidden />Đang xử lý…</p>
      </AuthLayout>
    );
  }
  if (state.kind === "ok") {
    return (
      <AuthLayout title="Đã xác minh email" subtitle="Cảm ơn bạn. Tài khoản của bạn đã sẵn sàng sử dụng đầy đủ.">
        <p role="status" className="mb-4 flex items-center gap-2 text-sm text-success"><CheckCircle2 className="size-4" aria-hidden />Email đã được xác minh.</p>
        <Link href="/login" className="font-medium text-primary hover:underline">Tiếp tục đăng nhập</Link>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout title="Không xác minh được email" subtitle="Liên kết có thể đã hết hạn hoặc đã được dùng.">
      <p role="alert" className="mb-4 flex items-center gap-2 rounded-xl border border-critical/30 bg-critical/5 px-4 py-3 text-sm text-critical"><XCircle className="size-4 shrink-0" aria-hidden />{state.message}</p>
      <p className="text-sm text-muted-foreground">Hãy đăng nhập và bấm "Gửi lại liên kết" ở thanh nhắc phía trên để nhận liên kết mới.</p>
      <Link href="/login" className="mt-3 inline-block font-medium text-primary hover:underline">Đến trang đăng nhập</Link>
    </AuthLayout>
  );
}

export default function VerifyEmailPage() {
  return <Suspense><VerifyEmail /></Suspense>;
}
