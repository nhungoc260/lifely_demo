"use client";

import { useNow } from "@/hooks/use-now";
import { formatCountdown } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Đếm ngược tới deadline, cập nhật mỗi giây. */
export function Countdown({ deadline, className }: { deadline: string; className?: string }) {
  const now = useNow();
  if (now === 0) return <span className={cn("tabular-nums", className)}>--:--:--</span>;
  const left = new Date(deadline).getTime() - now;
  if (left <= 0) return <span className={cn("font-medium text-muted-foreground", className)}>Deadline passed</span>;
  return <time dateTime={deadline} className={cn("tabular-nums", className)}>{formatCountdown(left)}</time>;
}
