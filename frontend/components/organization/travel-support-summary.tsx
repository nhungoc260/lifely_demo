"use client";

import { CalendarDays, HandCoins, Users } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { formatVnd } from "@/lib/travel-cost";
import { orgApi } from "@/services";

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `Tháng ${Number(m)}/${y}`;
}

/** Theo dõi chi phí hỗ trợ đi lại của cơ sở: số lượt đã chi, tổng tiền, theo tháng, số lượt chưa ghi nhận. */
export function TravelSupportSummary({ onStats = false }: { onStats?: boolean } = {}) {
  const q = useQuery("org-travel-support", orgApi.travelSupport);
  const d = q.data;
  const maxTotal = d ? Math.max(1, ...d.months.map((m) => m.totalVnd)) : 1;

  return (
    <section className="mt-8" aria-label="Chi phí hỗ trợ đi lại">
      <h2 className="mb-3 text-lg font-semibold">Chi phí hỗ trợ người hiến đi lại</h2>
      {q.initialLoading ? <Skeleton className="h-40" />
        : q.error && !d ? <ErrorState message={q.error.message} onRetry={q.reload} />
        : d && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Lượt hiến đã xác nhận" value={d.donated} icon={Users} href="/organization/donations" />
              <StatCard label="Đã chi hỗ trợ" value={d.paid} icon={HandCoins} accent hint={d.policyVnd > 0 ? `Mức công bố ${formatVnd(d.policyVnd)}/lần` : "Chưa công bố mức hỗ trợ"} href="/organization/appointments" />
              <StatCard label="Tổng tiền đã chi" value={formatVnd(d.paidTotalVnd)} icon={HandCoins} hint="Do cơ sở tự ghi nhận" href={onStats ? undefined : "/organization/stats"} />
              <StatCard label="Chưa ghi nhận" value={d.unpaid} icon={CalendarDays} hint={d.unpaid > 0 && d.policyVnd > 0 ? "Vào Lịch hiến để ghi nhận" : undefined} href="/organization/appointments" />
            </div>
            <Card className="mt-4">
              <CardHeader><CardTitle>Tiền hỗ trợ đã chi theo tháng (6 tháng gần nhất)</CardTitle></CardHeader>
              <CardContent>
                {d.months.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có khoản hỗ trợ nào được ghi nhận.</p> : (
                  <ul className="space-y-3">
                    {d.months.map((m) => (
                      <li key={m.month} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 text-sm">
                        <span className="text-muted-foreground">{monthLabel(m.month)}</span>
                        <span className="h-3 overflow-hidden rounded-full bg-muted" role="presentation"><span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(4, (m.totalVnd / maxTotal) * 100)}%` }} /></span>
                        <span className="tabular-nums font-medium">{formatVnd(m.totalVnd)} <span className="text-xs font-normal text-muted-foreground">({m.paid} lượt)</span></span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-4 text-sm text-muted-foreground">Khẩn cấp: <span className="font-semibold text-foreground">{d.donatedUrgent}</span> lượt hiến, <span className="font-semibold text-foreground">{d.paidUrgent}</span> đã chi hỗ trợ.</p>
                <p className="mt-2 text-xs text-muted-foreground">Gửi xe máy: {d.parkingFeeVnd == null ? "chưa cập nhật" : d.parkingFeeVnd === 0 ? "miễn phí" : formatVnd(d.parkingFeeVnd)} · <Link href="/organization/profile" className="font-medium text-primary underline">Chỉnh ở Hồ sơ</Link></p>
              </CardContent>
            </Card>
          </>
        )}
    </section>
  );
}
