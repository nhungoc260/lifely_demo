"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

import { realtime, type RealtimeStatus } from "@/lib/realtime";

/** Đăng ký nhận sự kiện từ một destination STOMP; destination = null thì không đăng ký. */
export function useRealtime<T>(destination: string | null, onMessage: (body: T) => void) {
  const ref = useRef(onMessage);
  useEffect(() => {
    ref.current = onMessage;
  });
  useEffect(() => {
    if (!destination) return;
    return realtime.subscribe(destination, (body) => ref.current(body as T));
  }, [destination]);
}

export function useRealtimeStatus(): RealtimeStatus {
  return useSyncExternalStore(realtime.onStatus, realtime.getStatus, () => "offline" as RealtimeStatus);
}
