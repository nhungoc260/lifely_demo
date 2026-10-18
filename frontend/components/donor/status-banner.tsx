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
  success: "bg-primary/10 text-primary",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  muted: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
} as const;

/** MỘT khối trạng thái duy nhất cho người hiến máu, kèm công tắc nhận yêu cầu. */
export function DonorStatusBanner({
  status, available, saving, onToggle,
}: { status: DonorStatus | null; available: boolean; saving: boolean; onToggle: (next: boolean) => void }) {
  if (!status) return <Skeleton className="h-44 w-full rounded-3xl" />;
  const Icon = ICON[status.kind];
  return (
    <div className="rounded-3xl bg-card p-5 ring-1 ring-border/60 md:p-6" aria-live="polite">
      <div className="flex items-start gap-3.5">
        <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", TONE[status.tone])}><Icon className="size-6" aria-hidden /></span>
        <div className="min-w-0">
          <h2 className="text-xl font-bold leading-tight tracking-tight">{status.title}</h2>
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted-foreground md:line-clamp-none md:max-w-2xl">{status.description}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex min-h-12 flex-1 items-center justify-between gap-3 rounded-2xl bg-muted/60 px-4 text-sm font-semibold md:max-w-xs">
          Nhận yêu cầu hiến máu
          <Switch checked={available} disabled={saving} onCheckedChange={onToggle} aria-label="Nhận yêu cầu hiến máu" className="data-[state=checked]:bg-primary" />
        </label>
        {status.action && <Link href={status.action.href} className="press inline-flex min-h-12 items-center rounded-2xl px-2 text-sm font-semibold text-primary hover:underline">{status.action.label}</Link>}
      </div>
    </div>
  );
}
