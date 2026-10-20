"use client";
import { useSyncExternalStore } from "react";

const KEY = "lifely-app-mode";

/** Giao diện app riêng: bật khi chạy như app đã cài (standalone) hoặc mở với ?app=1 (tắt bằng ?app=0). Web desktop không bị ảnh hưởng. */
function snapshot(): boolean {
  try {
    const q = new URLSearchParams(location.search).get("app");
    if (q === "1") return true;
    if (q === "0") return false;
    return matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true || localStorage.getItem(KEY) === "1";
  } catch { return false; }
}

function subscribe(cb: () => void) {
  try {
    const q = new URLSearchParams(location.search).get("app");
    if (q === "1") localStorage.setItem(KEY, "1");
    if (q === "0") localStorage.removeItem(KEY);
  } catch { /* bộ nhớ bị chặn: bỏ qua */ }
  const mq = matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function useAppMode(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
