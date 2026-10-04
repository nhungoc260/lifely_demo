"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let current = 0;

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    timer = setInterval(() => {
      current = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** Đồng hồ dùng chung (cập nhật mỗi giây) cho mọi bộ đếm ngược. 0 ở lần render đầu trên server. */
export function useNow(): number {
  return useSyncExternalStore(
    subscribe,
    () => {
      if (current === 0) current = Date.now();
      return current;
    },
    () => 0,
  );
}
