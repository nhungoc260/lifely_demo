"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { GoogleButton } from "@/components/auth/google-button";
import { toApiError } from "@/lib/api";
import { safeNext } from "@/lib/forms";
import { googleEnabled, savePendingGoogle } from "@/lib/google";
import { authApi } from "@/services";
import { homeFor, useAuth } from "@/providers/auth-provider";

/**
 * Khối "hoặc tiếp tục với Google" dùng cho trang đăng nhập và đăng ký.
 * Email đã có tài khoản thì đăng nhập luôn; email mới thì chuyển sang bước chọn vai trò và nhập số điện thoại.
 * Không cấu hình NEXT_PUBLIC_GOOGLE_CLIENT_ID thì khối này không hiển thị.
 */
export function GoogleAuthSection({ next, role, text }: { next?: string | null; role?: string; text: "signin_with" | "signup_with" }) {
  const router = useRouter();
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleCredential = useCallback(
    async (credential: string) => {
      setError(null);
      setBusy(true);
      try {
        const res = await authApi.google(credential);
        if (res.needsProfile || !res.auth) {
          savePendingGoogle({ credential, email: res.email ?? "", fullName: res.fullName ?? "", role });
          router.push("/register/google");
          return;
        }
        signIn(res.auth);
        toast.success(`Chào mừng trở lại, ${res.auth.user.fullName}`);
        const r = res.auth.user.roles[0];
        router.replace(safeNext(next ?? null) ?? (r === "DONOR" && !res.auth.user.onboardingCompleted ? "/onboarding" : homeFor(r)));
      } catch (e) {
        setError(toApiError(e).message);
        setBusy(false);
      }
    },
    [next, role, router, signIn],
  );

  if (!googleEnabled) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        hoặc
        <span className="h-px flex-1 bg-border" />
      </div>
      {error && <p role="alert" className="rounded-xl border border-critical/30 bg-critical/5 px-4 py-3 text-sm text-critical">{error}</p>}
      <div className="relative">
        <div className={busy ? "pointer-events-none opacity-40" : undefined}>
          <GoogleButton text={text} onCredential={handleCredential} />
        </div>
        {busy && <Loader2 className="absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 animate-spin text-muted-foreground" aria-label="Đang xác thực" />}
      </div>
    </div>
  );
}
