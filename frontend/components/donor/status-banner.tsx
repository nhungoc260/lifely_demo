"use client";

import { CalendarClock, CheckCircle2, PauseCircle, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { DonorStatus, DonorStatusKind } from "@/lib/donor-status";
import { cn } from "@/lib/utils";

const ICON = { READY: CheckCircle2, RESTING: CalendarClock, OFF: PauseCircle, INCOMPLETE: ShieldAlert } satisfies Record<DonorStatusKind, typeof CheckCircle2>;
// Thẻ trạng thái là điểm nhấn của trang chủ: một màu đậm cho mỗi trạng thái.
const TONE = {
  success: "from-emerald-500 to-emerald-700",
  warning: "from-amber-500 to-orange-600",
  muted: "from-slate-500 to-slate-700",
} as const;

/** MỘT khối trạng thái duy nhất cho người hiến máu, kèm công tắc nhận yêu cầu. */
export function DonorStatusBanner({
  status, available, saving, onToggle,
}: { status: DonorStatus | null; available: boolean; saving: boolean; onToggle: (next: boolean) => void }) {
  if (!status) return <Skeleton className="h-44 w-full rounded-3xl" />;
  const Icon = ICON[status.kind];
  return (
    <div className={cn("relative overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white shadow-lg md:p-6", TONE[status.tone])} aria-live="polite">
      <Icon className="pointer-events-none absolute -right-4 -top-4 size-32 text-white/10" aria-hidden />
      <div className="relative flex items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/20"><Icon className="size-6" aria-hidden /></span>
        <div className="min-w-0">
          <h2 className="text-xl font-bold leading-tight tracking-tight">{status.title}</h2>
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-white/85 md:line-clamp-none md:max-w-2xl">{status.description}</p>
        </div>
      </div>
      <div className="relative mt-4 flex flex-wrap items-center gap-3">
        <label className="flex min-h-12 flex-1 items-center justify-between gap-3 rounded-2xl bg-white px-4 text-sm font-semibold text-slate-900 md:max-w-xs">
          Nhận yêu cầu hiến máu
          <Switch checked={available} disabled={saving} onCheckedChange={onToggle} aria-label="Nhận yêu cầu hiến máu" />
        </label>
        {status.action && <Link href={status.action.href} className="press inline-flex min-h-12 items-center rounded-2xl bg-white/20 px-4 text-sm font-semibold hover:bg-white/30">{status.action.label}</Link>}
      </div>
    </div>
  );
}
