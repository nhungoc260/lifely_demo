"use client";

import { CalendarDays, HandCoins, Users } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill } from "@/components/ui/badges";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { formatDateTime } from "@/lib/format";
import { formatVnd } from "@/lib/travel-cost";
import { cn } from "@/lib/utils";
import { adminApi } from "@/services";

const STATUS: Record<string, { label: string; tone: "green" | "amber" | "red" | "slate" | "blue" }> = {
  BOOKED: { label: "Đã đặt", tone: "blue" }, CHECKED_IN: { label: "Đã đến", tone: "blue" }, SCREENED: { label: "Đã sàng lọc", tone: "blue" },
  DONATED: { label: "Đã hiến", tone: "green" }, DEFERRED: { label: "Hoãn hiến", tone: "amber" },
  NO_SHOW: { label: "Không đến", tone: "red" }, CANCELLED: { label: "Đã hủy", tone: "slate" },
};

export default function AdminAppointments() {
  const q = useQuery("admin-appointments", adminApi.appointments);
  const ts = useQuery("admin-travel-support", adminApi.travelSupport);
  const [status, setStatus] = useState<string | null>(null);
  const d = q.data;
  const rows = d ? d.recent.filter((r) => !status || r.status === status) : [];
  return (
    <>
      <PageHeader title="Lịch hiến máu toàn hệ thống" description="Bấm vào một trạng thái để lọc danh sách lịch hẹn bên dưới. Admin chỉ xem; việc xác nhận và xử lý lịch do từng cơ sở thực hiện." />
      {q.initialLoading ? <Skeleton className="h-96" />
        : q.error && !d ? <ErrorState message={q.error.message} onRetry={q.reload} />
        : d && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Khung giờ sắp tới" value={d.upcomingSlots.activeSlots} icon={CalendarDays} accent />
              <StatCard label="Đã đặt / sức chứa" value={`${d.upcomingSlots.booked}/${d.upcomingSlots.capacity}`} icon={Users} />
            </div>
            <Card className="mt-6"><CardHeader><CardTitle>Lịch hẹn theo trạng thái (tất cả thời gian)</CardTitle></CardHeader><CardContent>
              {d.statusCounts.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có lịch hẹn nào.</p> : (
                <div className="flex flex-wrap gap-3" role="group" aria-label="Lọc theo trạng thái">
                  <button type="button" aria-pressed={status === null} onClick={() => setStatus(null)} className={cn("rounded-full", status === null && "ring-2 ring-primary")}><Pill t="slate">Tất cả</Pill></button>
                  {d.statusCounts.map((s2) => { const m = STATUS[s2.status] ?? { label: s2.status, tone: "slate" as const }; return <button key={s2.status} type="button" aria-pressed={status === s2.status} onClick={() => setStatus(status === s2.status ? null : s2.status)} className={cn("rounded-full", status === s2.status && "ring-2 ring-primary")}><Pill t={m.tone}>{m.label}: {s2.total}</Pill></button>; })}
                </div>
              )}
            </CardContent></Card>
            <Card className="mt-6"><CardHeader><CardTitle>Lịch hẹn từ 30 ngày trước đến 60 ngày tới (tối đa 100){status ? ` · đang lọc: ${(STATUS[status]?.label ?? status)}` : ""}</CardTitle></CardHeader><CardContent>
              {rows.length === 0 ? <EmptyState title={status ? "Không có lịch hẹn trạng thái này trong khoảng thời gian trên" : "Không có lịch hẹn trong khoảng thời gian này"} description={status ? "Số trong nhãn trạng thái tính trên toàn bộ thời gian, nên có thể lớn hơn danh sách này." : undefined} /> : (
                <DataTable caption="Lịch hẹn" rows={rows} rowKey={(r) => r.id} columns={[
                  { key: "t", header: "Thời gian", cell: (r) => <div><p>{formatDateTime(r.startsAt)}</p><p className="text-xs text-muted-foreground">{new Date(r.startsAt) > new Date() ? "Sắp tới" : "Đã qua"}</p></div> },
                  { key: "o", header: "Cơ sở", cell: (r) => r.organizationName },
                  { key: "d", header: "Người hiến", cell: (r) => r.donorName },
                  { key: "s", header: "Trạng thái", cell: (r) => { const m = STATUS[r.status] ?? { label: r.status, tone: "slate" as const }; return <Pill t={m.tone}>{m.label}</Pill>; } },
                ]} />
              )}
            </CardContent></Card>
            <Card className="mt-6">
              <CardHeader><CardTitle>Hỗ trợ đi lại cho người hiến, theo từng cơ sở</CardTitle></CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">Mỗi cơ sở tự công bố mức hỗ trợ (quy định tối đa 50.000đ/lần hiến) và tự ghi nhận khi đã chi tiền mặt cho người hiến. Đây là sổ đối chiếu do cơ sở khai; LIFELY không thu hay chuyển tiền. Cơ sở có nhiều lần hiến chưa ghi nhận là nơi cần nhắc.</p>
                {ts.initialLoading ? <Skeleton className="h-40" />
                  : ts.error && !ts.data ? <ErrorState message={ts.error.message} onRetry={ts.reload} />
                  : ts.data && (
                    <>
                      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <StatCard label="Lượt hiến đã xác nhận" value={ts.data.donated} icon={Users} />
                        <StatCard label="Đã ghi nhận hỗ trợ" value={ts.data.paid} icon={HandCoins} accent />
                        <StatCard label="Chưa ghi nhận" value={ts.data.unpaid} icon={CalendarDays} />
                        <StatCard label="Tổng tiền đã ghi nhận" value={formatVnd(ts.data.paidTotalVnd)} icon={HandCoins} />
                      </div>
                      {ts.data.rows.length === 0 ? <EmptyState title="Chưa có cơ sở được xác minh" /> : (
                        <DataTable caption="Hỗ trợ đi lại theo cơ sở" rows={ts.data.rows} rowKey={(r) => r.organizationId} columns={[
                          { key: "o", header: "Cơ sở", cell: (r) => <div><p>{r.organizationName}</p><p className="text-xs text-muted-foreground">{r.city ?? ""}</p></div> },
                          { key: "p", header: "Mức công bố", cell: (r) => r.policyVnd > 0 ? formatVnd(r.policyVnd) : "Không hỗ trợ" },
                          { key: "k", header: "Gửi xe máy", cell: (r) => r.parkingFeeVnd == null ? "Chưa cập nhật" : r.parkingFeeVnd === 0 ? "Miễn phí" : formatVnd(r.parkingFeeVnd) },
                          { key: "d", header: "Đã hiến", cell: (r) => r.donated },
                          { key: "g", header: "Đã ghi nhận", cell: (r) => `${r.paid} (${formatVnd(r.paidTotalVnd)})` },
                          { key: "u", header: "Chưa ghi nhận", cell: (r) => r.unpaid > 0 && r.policyVnd > 0 ? <Pill t="amber">{r.unpaid}</Pill> : r.unpaid },
                        ]} />
                      )}
                    </>
                  )}
              </CardContent>
            </Card>
          </>
        )}
    </>
  );
}
