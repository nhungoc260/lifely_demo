"use client";

import { AlertTriangle, BellRing } from "lucide-react";

import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill } from "@/components/ui/badges";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { CONTACT_LABEL } from "@/components/requests/call-donor";
import { adminApi } from "@/services";
import type { ContactResult } from "@/types/domain";

const CHANNEL: Record<string, string> = { SMS: "SMS (mô phỏng)", PUSH: "Thông báo đẩy", VOICE: "Kênh cũ (đã ngừng)" };
const DELIVERY: Record<string, { label: string; tone: "green" | "amber" | "red" | "slate" }> = {
  SENT: { label: "Đã gửi", tone: "green" }, PENDING: { label: "Đang chờ", tone: "amber" }, SENDING: { label: "Đang gửi", tone: "amber" },
  FAILED: { label: "Lỗi", tone: "red" }, CANCELLED: { label: "Đã hủy", tone: "slate" },
};
const REPORT: Record<string, string> = { OPEN: "Mới", INVESTIGATING: "Đang xem xét", RESOLVED: "Đã xử lý", DISMISSED: "Bác bỏ" };

export default function AdminOperations() {
  const q = useQuery("admin-operations", adminApi.operations);
  const d = q.data;
  const failed = d?.notificationDelivery7d.filter((x) => x.status === "FAILED").reduce((s, x) => s + x.total, 0) ?? 0;
  const openReports = d?.reportsByStatus.filter((x) => x.status === "OPEN").reduce((s, x) => s + x.total, 0) ?? 0;
  return (
    <>
      <PageHeader title="Thống kê vận hành" description="Sức khỏe của việc gửi thông báo, mức độ phản hồi của cơ sở và các việc tồn đọng. Số liệu 7 hoặc 30 ngày gần nhất nếu có ghi chú." />
      {q.initialLoading ? <Skeleton className="h-96" />
        : q.error && !d ? <ErrorState message={q.error.message} onRetry={q.reload} />
        : d && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Thông báo lỗi (7 ngày)" value={failed} icon={BellRing} accent={failed > 0} hint={failed > 0 ? "Cần kiểm tra cấu hình kênh gửi" : "Không có lỗi"} />
              <StatCard label="Báo cáo vi phạm đang mở" value={openReports} icon={AlertTriangle} accent={openReports > 0} />
              <StatCard label="Lượt hẹn không đến" value={d.appointmentNoShows} />
            </div>
            <Card className="mt-6"><CardHeader><CardTitle>Gửi thông báo ngoài ứng dụng (7 ngày)</CardTitle></CardHeader><CardContent>
              {d.notificationDelivery7d.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có tin nào được xếp hàng gửi qua SMS hoặc thông báo đẩy. Thông báo trong ứng dụng không tính ở đây.</p> : (
                <DataTable caption="Gửi thông báo" rows={d.notificationDelivery7d} rowKey={(r) => r.channel + r.status} columns={[
                  { key: "c", header: "Kênh", cell: (r) => CHANNEL[r.channel] ?? r.channel },
                  { key: "s", header: "Trạng thái", cell: (r) => { const m = DELIVERY[r.status] ?? { label: r.status, tone: "slate" as const }; return <Pill t={m.tone}>{m.label}</Pill>; } },
                  { key: "n", header: "Số tin", cell: (r) => r.total },
                ]} />
              )}
            </CardContent></Card>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Card><CardHeader><CardTitle>Cơ sở có nhiều yêu cầu nhất (30 ngày)</CardTitle></CardHeader><CardContent>
                {d.topOrganizations30d.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có yêu cầu nào gắn với cơ sở trong 30 ngày.</p> : (
                  <DataTable caption="Cơ sở nhiều yêu cầu" rows={d.topOrganizations30d} rowKey={(r) => r.name} columns={[
                    { key: "n", header: "Cơ sở", cell: (r) => r.name },
                    { key: "r", header: "Yêu cầu", cell: (r) => r.requests },
                    { key: "f", header: "Đủ máu", cell: (r) => r.fulfilled },
                    { key: "e", header: "Hết hạn", cell: (r) => r.expired > 0 ? <Pill t="amber">{r.expired}</Pill> : 0 },
                  ]} />
                )}
              </CardContent></Card>
              <Card><CardHeader><CardTitle>Kết quả liên hệ người hiến (do nhân viên ghi)</CardTitle></CardHeader><CardContent>
                {d.contactResults.length === 0 ? <p className="text-sm text-muted-foreground">Nhân viên chưa ghi nhận kết quả liên hệ nào.</p> : (
                  <ul className="space-y-2 text-sm">
                    {d.contactResults.map((c) => <li key={c.result} className="flex justify-between"><span>{CONTACT_LABEL[c.result as ContactResult] ?? c.result}</span><span className="font-semibold tabular-nums">{c.total}</span></li>)}
                  </ul>
                )}
                <p className="mt-3 text-xs text-muted-foreground">Số liệu do nhân viên tự khai, hệ thống không biết cuộc gọi có thành công hay không.</p>
              </CardContent></Card>
            </div>
            <Card className="mt-6"><CardHeader><CardTitle>Báo cáo vi phạm theo trạng thái</CardTitle></CardHeader><CardContent>
              {d.reportsByStatus.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có báo cáo nào.</p> : (
                <div className="flex flex-wrap gap-3">{d.reportsByStatus.map((r) => <Pill key={r.status} t={r.status === "OPEN" ? "red" : "slate"}>{REPORT[r.status] ?? r.status}: {r.total}</Pill>)}</div>
              )}
            </CardContent></Card>
          </>
        )}
    </>
  );
}
