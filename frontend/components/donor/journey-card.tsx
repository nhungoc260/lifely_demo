import { Award } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { milestoneProgress } from "@/lib/donor";

/** Mốc hiến máu tiếp theo, viết bằng lời thường (không lặp lại trạng thái sẵn sàng). */
export function JourneyCard({ totalDonations }: { totalDonations: number }) {
  const { earned, next } = milestoneProgress(totalDonations);
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Award className="size-5" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{next ? `Mốc tiếp theo: ${next.label}` : "Bạn đã đạt mọi cột mốc"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {next ? `Còn ${next.threshold - totalDonations} lần hiến nữa (${next.description.toLowerCase()}).` : "Cảm ơn bạn đã đồng hành cùng LIFELY."}
          </p>
          {next && <ProgressBar className="mt-3" value={totalDonations} max={next.threshold} label={`Tiến độ tới mốc ${next.label}`} />}
          {earned.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Cột mốc đã đạt">
              {earned.map((m) => <li key={m.id} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground" title={m.description}>{m.label}</li>)}
            </ul>
          )}
          <Link href="/donor/history" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">Xem lịch sử hiến máu</Link>
        </div>
      </div>
    </Card>
  );
}
