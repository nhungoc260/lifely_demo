"use client";

import { CalendarClock, CheckCircle2, PauseCircle, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { DonorStatus, DonorStatusKind } from "@/lib/donor-status";
import { cn } from "@/lib/utils";

const ICON = { READY: CheckCircle2, RESTING: CalendarClock, OFF: PauseCircle, INCOMPLETE: ShieldAlert } satisfies Record<DonorStatusKind, typeof CheckCircle2>;
// Thẻ nền trung tính như mọi thẻ khác; trạng thái chỉ thể hiện ở ô icon (nhẹ, đọc tốt ở cả chế độ sáng và tối).
const TONE = {
  success: "bg-white/20 text-white ring-1 ring-white/30",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  muted: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
} as const;

/** MỘT khối trạng thái duy nhất cho người hiến máu, kèm công tắc nhận yêu cầu. */
export function DonorStatusBanner({
  status, available, saving, onToggle,
}: { status: DonorStatus | null; available: boolean; saving: boolean; onToggle: (next: boolean) => void }) {
  if (!status) return <Skeleton className="h-44 w-full rounded-3xl" />;
  const Icon = ICON[status.kind];
  const ready = status.kind === "READY";
  return (
    <div className={cn("rounded-3xl p-5 md:p-7", ready ? "hero-brand shadow-brand" : "bg-card ring-1 ring-border/60")} aria-live="polite">
      <div className="flex items-start gap-3.5">
        <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", TONE[status.tone])}><Icon className={cn("size-6", false)} aria-hidden /></span>
        <div className="min-w-0">
          <h2 className="text-2xl font-extrabold leading-tight tracking-tight">{status.title}</h2>
          <p className={cn("mt-1 line-clamp-2 text-sm leading-snug md:line-clamp-none md:max-w-2xl", ready ? "text-white/85" : "text-muted-foreground")}>{status.description}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className={cn("flex min-h-12 flex-1 items-center justify-between gap-3 rounded-2xl px-4 text-sm font-semibold md:max-w-xs", ready ? "glass" : "bg-muted/60")}>
          Nhận yêu cầu hiến máu
          <Switch checked={available} disabled={saving} onCheckedChange={onToggle} aria-label="Nhận yêu cầu hiến máu" className={ready ? "data-[state=checked]:bg-white [&>span]:data-[state=checked]:bg-primary" : "data-[state=checked]:bg-primary"} />
        </label>
        {status.action && <Link href={status.action.href} className={cn("press inline-flex min-h-12 items-center rounded-2xl px-2 text-sm font-semibold hover:underline", ready ? "text-white" : "text-primary")}>{status.action.label}</Link>}
      </div>
    </div>
  );
}
