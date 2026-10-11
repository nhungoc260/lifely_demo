"use client";

import { Radio } from "lucide-react";

import { useRealtimeStatus } from "@/hooks/use-realtime";
import { cn } from "@/lib/utils";

export function UnreadBadge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-5 text-primary-foreground" aria-label={`${n} chưa đọc`}>
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function LiveDot({ labelFrom = "xl" }: { labelFrom?: "xl" | "2xl" }) {
  const status = useRealtimeStatus();
  const label = status === "live" ? "Đang cập nhật trực tiếp" : status === "connecting" ? "Đang kết nối lại…" : "Chưa cập nhật trực tiếp";
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground" title={label}>
      <Radio className={cn("size-3.5", status === "live" ? "text-success" : "text-muted-foreground")} aria-hidden />
      <span className={labelFrom === "2xl" ? "hidden whitespace-nowrap 2xl:inline" : "hidden whitespace-nowrap xl:inline"}>{label}</span>
    </span>
  );
}
