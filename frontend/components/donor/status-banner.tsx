"use client";

import { CalendarClock, CheckCircle2, PauseCircle, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { DonorStatus, DonorStatusKind } from "@/lib/donor-status";
import { cn } from "@/lib/utils";

const ICON = { READY: CheckCircle2, RESTING: CalendarClock, OFF: PauseCircle, INCOMPLETE: ShieldAlert } satisfies Record<DonorStatusKind, typeof CheckCircle2>;
const TONE = {
  success: "bg-success/12 text-success",
  warning: "bg-warning/12 text-warning",
  muted: "bg-muted text-muted-foreground",
} as const;

/** MỘT khối trạng thái duy nhất cho người hiến máu, kèm công tắc nhận yêu cầu. */
export function DonorStatusBanner({
  status, available, saving, onToggle,
}: { status: DonorStatus | null; available: boolean; saving: boolean; onToggle: (next: boolean) => void }) {
  if (!status) return <Skeleton className="h-28 w-full rounded-2xl" />;
  const Icon = ICON[status.kind];
  return (
    <Card className="grid items-center gap-5 p-5 md:grid-cols-[1fr_auto] md:p-6" aria-live="polite">
      <div className="flex min-w-0 items-start gap-4">
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", TONE[status.tone])}><Icon className="size-5" aria-hidden /></span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">{status.title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{status.description}</p>
          {status.action && <Link href={status.action.href} className={cn(buttonVariants({ size: "sm" }), "mt-3")}>{status.action.label}</Link>}
        </div>
      </div>
      <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium md:justify-start">
        Nhận yêu cầu hiến máu
        <Switch checked={available} disabled={saving} onCheckedChange={onToggle} aria-label="Nhận yêu cầu hiến máu" />
      </label>
    </Card>
  );
}
