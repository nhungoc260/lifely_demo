"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

import { GOOGLE_CLIENT_ID, loadGoogleScript } from "@/lib/google";

type ButtonText = "signin_with" | "signup_with" | "continue_with";

/** Nút "Đăng nhập bằng Google" do Google vẽ. Khi người dùng chọn tài khoản, trả về ID token (credential). */
export function GoogleButton({ onCredential, text = "continue_with" }: { onCredential: (credential: string) => void; text?: ButtonText }) {
  const holder = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  const { resolvedTheme } = useTheme();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    callback.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        const el = holder.current;
        const api = window.google?.accounts.id;
        if (cancelled || !el || !api) return;
        api.initialize({ client_id: GOOGLE_CLIENT_ID, callback: (r) => callback.current(r.credential), ux_mode: "popup" });
        el.replaceChildren();
        api.renderButton(el, {
          type: "standard",
          theme: resolvedTheme === "dark" ? "filled_black" : "outline",
          size: "large",
          text,
          shape: "rectangular",
          logo_alignment: "left",
          width: Math.min(400, Math.max(200, Math.floor(el.clientWidth))),
          locale: "vi",
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedTheme, text]);

  if (failed) {
    return <p className="text-center text-sm text-muted-foreground">Không tải được đăng nhập Google. Hãy kiểm tra kết nối mạng rồi tải lại trang.</p>;
  }
  return <div ref={holder} className="flex min-h-11 w-full justify-center" />;
}
