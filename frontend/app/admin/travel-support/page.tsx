"use client";

import { CalendarDays, HandCoins, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { FuelPriceCard } from "@/components/admin/fuel-price-card";
import { PageHeader } from "@/components/shell/page-header";
import { Pill } from "@/components/ui/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { formatDateTime } from "@/lib/format";
import { formatVnd } from "@/lib/travel-cost";
import { cn } from "@/lib/utils";
import { adminApi } from "@/services";

const TABS = [
  { id: "UNPAID", label: "Chưa ghi nhận" }, { id: "PAID", label: "Đã ghi nhận" }, { id: "ALL", label: "Tất cả" },
] as const;

export default function AdminTravelSupport() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("UNPAID");
  const sum = useQuery("admin-travel-support", adminApi.travelSupport);
  const q = useQuery(`admin-ts-items-${tab}`, () => adminApi.travelSupportItems(tab));
  const s = sum.data;

  return (
    <>
      <PageHeader title="Hỗ trợ đi lại" description="Theo dõi hỗ trợ đi lại cho người hiến ở mọi cơ sở, gồm lịch đặt trước và yêu cầu khẩn cấp." />

      <FuelPriceCard />

      <div className="mt-6" />
      {sum.initialLoading ? <Skeleton className="h-32" />
        : sum.error && !s ? <ErrorState message={sum.error.message} onRetry={sum.reload} />
        : s && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Lượt hiến đã xác nhận" value={s.donated} icon={Users} hint={`Khẩn cấp: ${s.donatedUrgent}`} />
            <StatCard label="Đã ghi nhận hỗ trợ" value={s.paid} icon={HandCoins} accent hint={`Khẩn cấp: ${s.paidUrgent}`} />
            <StatCard label="Chưa ghi nhận" value={s.unpaid} icon={CalendarDays} />
            <StatCard label="Tổng tiền đã ghi nhận" value={formatVnd(s.paidTotalVnd)} icon={HandCoins} href="/admin/abuse" hint="Xem giám sát bất thường" />
          </div>
        )}

      <div role="tablist" aria-label="Lọc theo trạng thái" className="mt-8 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={cn("min-h-10 rounded-full border px-4 text-sm font-medium", tab === t.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted")}>{t.label}</button>
        ))}
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>Lượt hiến đã xác nhận (200 lượt gần nhất)</CardTitle></CardHeader>
        <CardContent>
          {q.initialLoading ? <Skeleton className="h-40" />
            : q.error && !q.data ? <ErrorState message={q.error.message} onRetry={q.reload} />
            : !q.data || q.data.length === 0 ? <EmptyState title="Không có lượt nào" description="Chưa có lượt hiến nào ở mục này." />
            : (
              <DataTable caption="Lượt hiến và hỗ trợ đi lại" rows={q.data} rowKey={(r) => `${r.kind}-${r.id}`} columns={[
                { key: "o", header: "Cơ sở", cell: (r) => r.organizationName },
                { key: "k", header: "Loại", cell: (r) => <Pill t={r.kind === "URGENT" ? "red" : "slate"}>{r.kind === "URGENT" ? "Khẩn cấp" : "Lịch hiến"}</Pill> },
                { key: "d", header: "Người hiến", cell: (r) => <div><p>{r.donorName}</p><p className="text-xs text-muted-foreground">{r.bloodType ?? ""}</p></div> },
                { key: "t", header: "Ngày hiến", cell: (r) => r.donatedAt ? formatDateTime(r.donatedAt) : "" },
                { key: "p", header: "Nơi hiến", cell: (r) => r.place },
                { key: "s", header: "Hỗ trợ đi lại", cell: (r) => r.paidVnd != null ? `Đã ghi nhận ${formatVnd(r.paidVnd)}` : r.policyVnd > 0 ? <Pill t="amber">Chưa ghi nhận ({formatVnd(r.policyVnd)})</Pill> : "Cơ sở không hỗ trợ" },
              ]} />
            )}
          <p className="mt-4 text-xs text-muted-foreground">Cơ sở đáng ngờ xem ở <Link href="/admin/abuse" className="font-medium text-primary underline">Giám sát bất thường</Link>.</p>
        </CardContent>
      </Card>
    </>
  );
}
