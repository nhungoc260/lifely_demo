import { Clock, MapPin } from "lucide-react";
import Link from "next/link";

import { BloodChip, MatchBadge, UrgencyBadge } from "@/components/ui/badges";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Countdown } from "@/components/ui/countdown";
import { cn } from "@/lib/utils";
import type { DonorMatch } from "@/types/domain";

export function MatchScore({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("text-right", className)}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Match</p>
      <p className="text-2xl font-semibold tabular-nums leading-none text-primary">{Math.round(value)}%</p>
    </div>
  );
}

export function MatchCard({ m }: { m: DonorMatch }) {
  const open = m.status === "CONTACTED" || m.status === "PENDING";
  return (
    <Card className={cn("flex flex-col p-5", open && m.urgency === "CRITICAL" && "border-critical/30")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2"><UrgencyBadge urgency={m.urgency} />{!open && <MatchBadge status={m.status} />}</div>
        <MatchScore value={m.matchingScore} />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <BloodChip type={m.bloodType} className="text-lg" />
        <p className="font-semibold">{m.hospitalName}</p>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2"><MapPin className="size-4 text-muted-foreground" aria-hidden /><dt className="sr-only">Distance</dt><dd>{m.distanceKm.toFixed(1)} km</dd></div>
        <div><dt className="sr-only">Units</dt><dd>{m.unitsNeeded} unit{m.unitsNeeded === 1 ? "" : "s"} needed</dd></div>
        <div className="col-span-2 flex items-center gap-2"><Clock className="size-4 text-muted-foreground" aria-hidden /><dt className="text-muted-foreground">Remaining</dt><dd className="font-medium"><Countdown deadline={m.deadline} /></dd></div>
      </dl>
      <Link href={`/donor/requests/${m.matchId}`} className={cn(buttonVariants({ variant: open ? "default" : "outline" }), "mt-5 w-full")}>{open ? "View Request" : "View details"}</Link>
    </Card>
  );
}
