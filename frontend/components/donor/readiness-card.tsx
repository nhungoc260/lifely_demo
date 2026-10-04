"use client";

import { Award, CalendarCheck, CalendarClock } from "lucide-react";

import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useNow } from "@/hooks/use-now";
import { milestoneProgress, readiness } from "@/lib/donor";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ReadinessCard({ lastDonationDate, totalDonations }: { lastDonationDate: string | null; totalDonations: number }) {
  const now = useNow();
  const today = new Date(now || 0).toISOString().slice(0, 10);
  const r = readiness(lastDonationDate, today);
  const { earned, next } = milestoneProgress(totalDonations);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", r.ready ? "bg-success/12 text-success" : "bg-warning/12 text-warning")}>
            {r.ready ? <CalendarCheck className="size-5" aria-hidden /> : <CalendarClock className="size-5" aria-hidden />}
          </span>
          <div>
            <p className="font-semibold">{r.ready ? "Ready to be matched" : `Resting until ${formatDate(r.nextDate!)}`}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {r.ready ? "LIFELY can contact you when a verified request fits." : `LIFELY will not contact you for ${r.daysLeft} more day${r.daysLeft === 1 ? "" : "s"}.`}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">This is only a scheduling rule. Eligibility is always confirmed by healthcare professionals.</p>
          </div>
        </div>
      </Card>
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Award className="size-5" aria-hidden /></span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{earned.length > 0 ? earned[earned.length - 1].label : "Your journey starts here"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{next ? `${next.threshold - totalDonations} more donation${next.threshold - totalDonations === 1 ? "" : "s"} to reach "${next.label}"` : "You have earned every milestone. Thank you!"}</p>
            {next && <ProgressBar className="mt-3" value={totalDonations} max={next.threshold} label={`Progress to ${next.label}`} />}
            {earned.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Earned milestones">
                {earned.map((m) => <li key={m.id} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground" title={m.description}>{m.label}</li>)}
              </ul>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
