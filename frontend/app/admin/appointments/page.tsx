"use client";

import { CalendarDays, Users } from "lucide-react";

import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill } from "@/components/ui/badges";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { formatDateTime } from "@/lib/format";
import { adminApi } from "@/services";

const STATUS: Record<string, { label: string; tone: "green" | "amber" | "red" | "slate" | "blue" }> = {
  BOOKED: { label: "Đã đặt", tone: "blue" }, CHECKED_IN: { label: "Đã đến", tone: "blue" }, SCREENED: { label: "Đã sàng lọc", tone: "blue" },
  DONATED: { label: "Đã hiến", tone: "green" }, DEFERRED: { label: "Hoãn hiến", tone: "amber" },
  NO_SHOW: { label: "Không đến", tone: "red" }, CANCELLED: { label: "Đã hủy", tone: "slate" },
};

export default function AdminAppointments() {
  const q = useQuery("admin-appointments", adminApi.appointments);
  const d = q.data;
  return (
    <>
      <PageHeader title="Lịch hiến máu toàn hệ thống" description="Tổng hợp lịch hẹn của các cơ sở. Admin chỉ xem; việc xác nhận và xử lý lịch do từng cơ sở thực hiện." />
      {q.initialLoading ? <Skeleton className="h-96" />
        : q.error && !d ? <ErrorState message={q.error.message} onRetry={q.reload} />
        : d && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Khung giờ sắp tới" value={d.upcomingSlots.activeSlots} icon={CalendarDays} accent />
              <StatCard label="Đã đặt / sức chứa" value={`${d.upcomingSlots.booked}/${d.upcomingSlots.capacity}`} icon={Users} />
            </div>
            <Card className="mt-6"><CardHeader><CardTitle>Lịch hẹn theo trạng thái</CardTitle></CardHeader><CardContent>
              {d.statusCounts.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có lịch hẹn nào.</p> : (
                <div className="flex flex-wrap gap-3">
                  {d.statusCounts.map((s) => { const m = STATUS[s.status] ?? { label: s.status, tone: "slate" as const }; return <Pill key={s.status} t={m.tone}>{m.label}: {s.total}</Pill>; })}
                </div>
              )}
            </CardContent></Card>
            <Card className="mt-6"><CardHeader><CardTitle>Lịch hẹn sắp tới (tối đa 30)</CardTitle></CardHeader><CardContent>
              {d.upcoming.length === 0 ? <EmptyState title="Không có lịch hẹn sắp tới" /> : (
                <DataTable caption="Lịch hẹn sắp tới" rows={d.upcoming} rowKey={(r) => r.id} columns={[
                  { key: "t", header: "Thời gian", cell: (r) => formatDateTime(r.startsAt) },
                  { key: "o", header: "Cơ sở", cell: (r) => r.organizationName },
                  { key: "d", header: "Người hiến", cell: (r) => r.donorName },
                  { key: "s", header: "Trạng thái", cell: (r) => { const m = STATUS[r.status] ?? { label: r.status, tone: "slate" as const }; return <Pill t={m.tone}>{m.label}</Pill>; } },
                ]} />
              )}
            </CardContent></Card>
          </>
        )}
    </>
  );
}
