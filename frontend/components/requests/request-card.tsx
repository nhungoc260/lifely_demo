import { MapPin, Clock } from "lucide-react";
import Link from "next/link";

import { BloodChip, UrgencyBadge } from "@/components/ui/badges";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Countdown } from "@/components/ui/countdown";
import { cn } from "@/lib/utils";
import type { PublicRequest } from "@/types/domain";

export function RequestCard({ r, href, cta = "Xem yêu cầu" }: { r: PublicRequest; href: string; cta?: string }) {
  return (
    <Card className={cn("flex flex-col p-5 transition-shadow hover:shadow-md", r.urgency === "CRITICAL" && "border-critical/30")}>
      <div className="flex items-center justify-between">
        <UrgencyBadge urgency={r.urgency} />
        <BloodChip type={r.bloodType} />
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight">Cần {r.unitsNeeded} đơn vị</p>
      <p className="mt-1 text-sm text-muted-foreground">{r.unitsConfirmed} / {r.unitsRequired} đã xác nhận</p>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden /><dt className="sr-only">Địa điểm</dt><dd>{r.hospitalName}{r.distanceKm != null && <span className="text-muted-foreground"> · {r.distanceKm.toFixed(1)} km</span>}</dd></div>
        <div className="flex items-center gap-2"><Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden /><dt className="text-muted-foreground">Cần trong vòng</dt><dd className="font-medium"><Countdown deadline={r.deadline} /></dd></div>
      </dl>
      <Link href={href} className={cn(buttonVariants({ variant: r.urgency === "CRITICAL" ? "default" : "outline" }), "mt-5 w-full")}>{cta}</Link>
    </Card>
  );
}
