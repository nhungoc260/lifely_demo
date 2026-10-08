"use client";

import { Radar } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@/hooks/use-query";
import { SUPPORT } from "@/lib/support";
import { cn } from "@/lib/utils";
import { requestApi } from "@/services";
import type { CoverageRing } from "@/types/domain";

const LEVEL = {
  NONE: { label: "Không tìm thấy", bars: 0, tone: "bg-muted-foreground/40" },
  FEW: { label: "Một vài", bars: 1, tone: "bg-warning" },
  SOME: { label: "Một số", bars: 2, tone: "bg-primary/70" },
  MANY: { label: "Nhiều", bars: 3, tone: "bg-success" },
} as const;

function Row({ ring }: { ring: CoverageRing }) {
  const l = LEVEL[ring.level];
  return (
    <li className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 text-sm">
      <span className="text-muted-foreground">≤ {ring.radiusKm} km</span>
      <span className="flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => <span key={i} className={cn("h-2 flex-1 rounded-full", i < l.bars ? l.tone : "bg-muted")} />)}
      </span>
      <span className="min-w-24 text-right font-medium tabular-nums">{l.label}{ring.count != null ? ` (${ring.count})` : ""}</span>
    </li>
  );
}

/**
 * Ước lượng độ phủ donor trước khi gửi yêu cầu. Chỉ hiện mức độ (số cụ thể chỉ khi từ 3 người trở lên),
 * không bao giờ lộ danh tính hay vị trí của từng donor.
 */
export function CoveragePanel({ bloodType, latitude, longitude }: { bloodType: string; latitude: number | null; longitude: number | null }) {
  const ready = !!bloodType && latitude != null && longitude != null;
  const q = useQuery(ready ? `coverage:${bloodType}:${latitude!.toFixed(3)}:${longitude!.toFixed(3)}` : null, () => requestApi.coverage(bloodType, latitude!, longitude!));
  if (!ready) return null;
  const none = q.data?.every((r) => r.level === "NONE");

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Radar className="size-4 text-primary" aria-hidden /> Độ phủ người hiến máu quanh địa điểm này</CardTitle></CardHeader>
      <CardContent>
        {q.initialLoading ? <Skeleton className="h-24" /> : q.error && !q.data ? <p className="text-sm text-muted-foreground">Hiện chưa có dữ liệu độ phủ. Bạn vẫn có thể tạo yêu cầu.</p> : q.data && (
          <>
            <ul className="space-y-3">{q.data.map((r) => <Row key={r.radiusKm} ring={r} />)}</ul>
            {none ? (
              <p className="mt-4 rounded-xl bg-warning/10 p-3 text-sm">Chưa tìm thấy người hiến máu {bloodType} tương thích đang sẵn sàng trong vòng 50 km. Hãy liên hệ thêm ngân hàng máu của bệnh viện, hoặc gọi {SUPPORT.name} theo số <a className="font-medium underline" href={SUPPORT.telHref}>{SUPPORT.phoneDisplay}</a>.</p>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">Ước tính số người hiến máu tương thích đang sẵn sàng. Không đảm bảo sẽ có người phản hồi. Danh tính người hiến máu không bao giờ được tiết lộ.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
