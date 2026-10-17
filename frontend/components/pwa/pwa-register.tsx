"use client";

import { useEffect } from "react";

import "@/lib/pwa-install"; // bắt sự kiện beforeinstallprompt sớm, các nút "Cài ứng dụng" dùng chung

/** Đăng ký service worker (nhận Web Push + trang ngoại tuyến). Không làm gì nếu trình duyệt không hỗ trợ. */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* không hỗ trợ (ví dụ http không phải localhost): ứng dụng vẫn dùng bình thường */
    });
  }, []);
  return null;
}
