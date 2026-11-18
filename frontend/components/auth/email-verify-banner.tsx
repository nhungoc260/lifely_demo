"use client";

import { Loader2, MailWarning } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { toApiError } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { authApi } from "@/services";

/** Nhắc tài khoản chưa xác minh email (máy chủ có thể chặn tạo yêu cầu/nhận lời cho tới khi xác minh). */
export function EmailVerifyBanner() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  if (!user || user.emailVerified !== false) return null;

  async function resend() {
    if (!user) return;
    setBusy(true);
    try {
      await authApi.resendVerification(user.email);
      setSent(true);
      toast.success("Đã gửi lại liên kết xác minh. Hãy kiểm tra hộp thư.");
    } catch (e) { toast.error(toApiError(e).message); } finally { setBusy(false); }
  }

  return (
    <div role="status" className="flex flex-wrap items-center justify-center gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
      <MailWarning className="size-4 shrink-0" aria-hidden />
      <span>Email của bạn chưa được xác minh. Hãy mở liên kết trong email LIFELY đã gửi để dùng đầy đủ tính năng.</span>
      <Button size="sm" variant="outline" onClick={resend} disabled={busy || sent}>
        {busy && <Loader2 className="animate-spin" />} {sent ? "Đã gửi" : "Gửi lại liên kết"}
      </Button>
    </div>
  );
}
