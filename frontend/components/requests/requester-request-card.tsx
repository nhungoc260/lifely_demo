import Link from "next/link";

import { BloodChip, StatusBadge, UrgencyBadge } from "@/components/ui/badges";
import { Card } from "@/components/ui/card";
import { Countdown } from "@/components/ui/countdown";
import { ProgressBar } from "@/components/ui/progress-bar";
import { isClosed, requestProgressText } from "@/lib/request-progress";
import type { BloodRequest } from "@/types/domain";

/** Thẻ yêu cầu của người cần máu: nói rõ đang ở bước nào và có cần làm gì không. */
export function RequesterRequestCard({ r, basePath = "/requester" }: { r: BloodRequest; basePath?: string }) {
  const closed = isClosed(r.status);
  return (
    <Link href={`${basePath}/requests/${r.id}`} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card className="p-5 transition-shadow hover:shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3"><BloodChip type={r.bloodType} /><UrgencyBadge urgency={r.urgency} /><StatusBadge status={r.status} /></div>
          <span className="text-sm text-muted-foreground">{closed ? "Đã đóng" : <>Còn lại <Countdown deadline={r.deadline} className="font-medium text-foreground" /></>}</span>
        </div>
        <p className="mt-3 font-medium">{r.hospitalName}</p>
        <p className="mt-1 text-sm text-muted-foreground">{requestProgressText(r.status, r.unitsConfirmed, r.unitsRequired)}</p>
        <div className="mt-3 flex items-center gap-3">
          <ProgressBar className="flex-1" value={r.unitsConfirmed} max={r.unitsRequired} label="Người hiến máu đã nhận lời" />
          <span className="text-sm tabular-nums text-muted-foreground">{r.unitsConfirmed}/{r.unitsRequired} người đã nhận lời</span>
        </div>
      </Card>
    </Link>
  );
}
