"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Logo } from "@/components/layout/logo";
import { homeFor, useAuth } from "@/providers/auth-provider";

/**
 * Cửa vào của ứng dụng đã cài (PWA và APK cùng dùng start_url này).
 * Đã đăng nhập: vào thẳng trang của vai trò. Chưa đăng nhập: vào trang đăng nhập.
 */
export default function OpenApp() {
  const { status, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace(homeFor(role));
    else if (status === "anonymous") router.replace("/login");
  }, [status, role, router]);

  return (
    <main className="grid min-h-dvh place-items-center bg-background" aria-busy="true">
      <div className="flex flex-col items-center gap-6">
        <Logo href="/open" />
        <span className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" aria-label="Đang mở LIFELY" />
      </div>
    </main>
  );
}
