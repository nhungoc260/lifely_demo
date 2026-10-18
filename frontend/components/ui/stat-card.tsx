import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function StatCard({
  label, value, icon: Icon, loading, accent, hint, href,
}: { label: string; value: React.ReactNode; icon?: LucideIcon; loading?: boolean; accent?: boolean; hint?: string; href?: string }) {
  const card = (
    <Card className={cn("p-4 md:p-5", href && "press transition hover:ring-2 hover:ring-primary/40")}>
      <div className="flex items-center justify-between">
        <p className="text-[13px] leading-tight text-muted-foreground md:text-sm">{label}</p>
        {Icon && <Icon className={cn("size-4", accent ? "text-primary" : "text-muted-foreground")} aria-hidden />}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-9 w-20" />
      ) : (
        <p className={cn("mt-2 text-[26px] font-bold tabular-nums tracking-tight md:text-3xl md:font-semibold", accent && "text-primary")}>{value}</p>
      )}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {href && <p className="mt-2 text-xs font-medium text-primary">Xem chi tiết →</p>}
    </Card>
  );
  return href ? <Link href={href} aria-label={`${label}: mở trang chi tiết`} className="block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{card}</Link> : card;
}
