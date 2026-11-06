import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TONES, type Tone } from "@/components/ui/tones";
import { cn } from "@/lib/utils";

export function StatCard({
  label, value, icon: Icon, loading, accent, hint, href, tone,
}: { label: string; value: React.ReactNode; icon?: LucideIcon; loading?: boolean; accent?: boolean; hint?: string; href?: string; tone?: Tone }) {
  const card = (
    <Card className={cn("card-lift relative overflow-hidden p-4 md:p-5", accent && "border-primary/20", href && "press")}>
      <div className="flex items-center justify-between">
        <p className="text-[13px] leading-tight text-muted-foreground md:text-sm">{label}</p>
        {Icon && <span className={cn("grid size-9 place-items-center rounded-xl", (tone ? TONES[tone] : "bg-secondary text-primary"))}><Icon className="size-[18px]" aria-hidden /></span>}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-9 w-20" />
      ) : (
        <p className={cn("mt-2 text-[26px] font-bold tabular-nums tracking-tight md:text-3xl md:font-semibold", accent ? "text-brand-gradient" : "text-foreground", "md:text-4xl md:font-extrabold")}>{value}</p>
      )}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {href && <p className="mt-2 text-xs font-medium text-primary">Xem chi tiết →</p>}
    </Card>
  );
  return href ? <Link href={href} aria-label={`${label}: mở trang chi tiết`} className="block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{card}</Link> : card;
}
