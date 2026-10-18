"use client";

import { AlertTriangle, BellRing } from "lucide-react";

import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill } from "@/components/ui/badges";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { CONTACT_LABEL, CONTACT_TONE } from "@/components/requests/call-donor";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { adminApi } from "@/services";
import type { ContactResult } from "@/types/domain";

const CHANNEL: Record<string, string> = { SMS: "SMS (mô phỏng)", PUSH: "Thông báo đẩy", VOICE: "Kênh cũ (đã ngừng)" };
const DELIVERY: Record<string, { label: string; tone: "green" | "amber" | "red" | "slate" }> = {
  SENT: { label: "Đã gửi", tone: "green" }, PENDING: { label: "Đang chờ", tone: "amber" }, SENDING: { label: "Đang gửi", tone: "amber" },
  FAILED: { label: "Lỗi", tone: "red" }, CANCELLED: { label: "Đã hủy", tone: "slate" },
};
const PURPOSE: Record<string, string> = { REQUEST_INVITE: "Lời mời hiến máu", STAFF_ALERT: "Báo nhân viên bệnh viện", APPT_CONFIRM: "Xác nhận lịch hẹn", APPT_REMINDER: "Nhắc lịch hẹn", REJOIN_REMINDER: "Nhắc hiến lại" };
const REPORT: Record<string, string> = { OPEN: "Mới", INVESTIGATING: "Đang xem xét", RESOLVED: "Đã xử lý", DISMISSED: "Bác bỏ" };

export default function AdminOperations() {
  const q = useQuery("admin-operations", adminApi.operations);
  const [result, setResult] = useState<string | null>(null);
  const d = q.data;
  const logRows = d ? d.contactLog.filter((r) => !result || r.result === result) : [];
  const failed = d?.notificationDelivery7d.filter((x) => x.status === "FAILED").reduce((s, x) => s + x.total, 0) ?? 0;
  const openReports = d?.reportsByStatus.filter((x) => x.status === "OPEN").reduce((s, x) => s + x.total, 0) ?? 0;
  return (
    <>
      <PageHeader title="Thống kê vận hành" description="Sức khỏe của việc gửi thông báo, mức độ phản hồi của cơ sở và các việc tồn đọng. Bấm vào thẻ hoặc tên cơ sở để chuyển tới trang xử lý. Số liệu 7 hoặc 30 ngày gần nhất nếu có ghi chú." />
      {q.initialLoading ? <Skeleton className="h-96" />
        : q.error && !d ? <ErrorState message={q.error.message} onRetry={q.reload} />
        : d && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Thông báo lỗi (7 ngày)" value={failed} icon={BellRing} accent={failed > 0} hint={failed > 0 ? "Chi tiết ở bảng bên dưới" : "Không có lỗi"} />
              <Link href="/admin/reports" aria-label="Mở trang Báo cáo vi phạm" className="block rounded-2xl transition hover:ring-2 hover:ring-primary/40 focus-visible:outline focus-visible:outline-2"><StatCard label="Báo cáo vi phạm đang mở" value={openReports} icon={AlertTriangle} accent={openReports > 0} hint="Bấm để xử lý" /></Link>
              <StatCard label="Lượt hẹn không đến" value={d.appointmentNoShows} href="/admin/appointments" />
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
            {d.failedDeliveries.length > 0 && (
              <Card className="mt-6 border-critical/40"><CardHeader><CardTitle>Thông báo gửi lỗi (7 ngày gần nhất, tối đa 20)</CardTitle></CardHeader><CardContent>
                <DataTable caption="Thông báo gửi lỗi" rows={d.failedDeliveries} rowKey={(r) => r.channel + r.purpose + r.at} columns={[
                  { key: "t", header: "Thời gian", cell: (r) => formatDateTime(r.at) },
                  { key: "c", header: "Kênh", cell: (r) => CHANNEL[r.channel] ?? r.channel },
                  { key: "p", header: "Loại tin", cell: (r) => PURPOSE[r.purpose] ?? r.purpose },
                  { key: "e", header: "Mã lỗi", cell: (r) => <code className="text-xs">{r.errorCode ?? "không rõ"}</code> },
                  { key: "a", header: "Số lần thử", cell: (r) => r.attempts },
                ]} />
                <p className="mt-3 text-xs text-muted-foreground">Không hiển thị nội dung tin và số điện thoại. Mã lỗi giúp kỹ thuật viên xác định nguyên nhân (ví dụ NO_PROVIDER là chưa cấu hình nhà cung cấp cho kênh đó).</p>
              </CardContent></Card>
            )}
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Card><CardHeader><CardTitle>Cơ sở có nhiều yêu cầu nhất (30 ngày)</CardTitle></CardHeader><CardContent>
                {d.topOrganizations30d.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có yêu cầu nào gắn với cơ sở trong 30 ngày.</p> : (
                  <DataTable caption="Cơ sở nhiều yêu cầu" rows={d.topOrganizations30d} rowKey={(r) => r.name} columns={[
                    { key: "n", header: "Cơ sở", cell: (r) => <Link href="/admin/organizations" className="font-medium text-primary hover:underline">{r.name}</Link> },
                    { key: "r", header: "Yêu cầu", cell: (r) => r.requests },
                    { key: "f", header: "Đủ máu", cell: (r) => r.fulfilled },
                    { key: "e", header: "Hết hạn", cell: (r) => r.expired > 0 ? <Pill t="amber">{r.expired}</Pill> : 0 },
                  ]} />
                )}
              </CardContent></Card>
              <Card><CardHeader><CardTitle>Tổng hợp kết quả liên hệ</CardTitle></CardHeader><CardContent>
                {d.contactResults.length === 0 ? <p className="text-sm text-muted-foreground">Nhân viên chưa ghi nhận kết quả liên hệ nào.</p> : (
                  <ul className="space-y-2 text-sm">
                    {d.contactResults.map((c) => <li key={c.result} className="flex items-center justify-between"><button type="button" aria-pressed={result === c.result} onClick={() => setResult(result === c.result ? null : c.result)} className={cn("rounded-full", result === c.result && "ring-2 ring-primary")}><Pill t={CONTACT_TONE[c.result as ContactResult] ?? "slate"}>{CONTACT_LABEL[c.result as ContactResult] ?? c.result}</Pill></button><span className="font-semibold tabular-nums">{c.total}</span></li>)}
                  </ul>
                )}
                <p className="mt-3 text-xs text-muted-foreground">Bấm vào một kết quả để lọc bảng nhật ký bên dưới (bấm lại để bỏ lọc).</p>
              </CardContent></Card>
            </div>
            <Card className="mt-6"><CardHeader><CardTitle>{`Nhật ký liên hệ người hiến (30 lần gần nhất)${result ? ` · đang lọc: ${CONTACT_LABEL[result as ContactResult] ?? result}` : ""}`}</CardTitle></CardHeader><CardContent>
              {logRows.length === 0 ? <p className="text-sm text-muted-foreground">{result ? "Không có lần nào khớp bộ lọc trong 30 lần gần nhất." : "Chưa có lần liên hệ nào được ghi nhận. Khi nhân viên bệnh viện bấm “Gọi người hiến” và chọn kết quả, từng lần sẽ hiện ở đây."}</p> : (
                <DataTable caption="Nhật ký liên hệ người hiến" rows={logRows} rowKey={(r) => r.matchId} columns={[
                  { key: "t", header: "Thời gian", cell: (r) => r.at ? formatDateTime(r.at) : "–" },
                  { key: "h", header: "Cơ sở / yêu cầu", cell: (r) => <div><p className="font-medium">{r.hospital}</p><p className="text-xs text-muted-foreground">Cần máu nhóm {r.bloodType}</p></div> },
                  { key: "d", header: "Người hiến được liên hệ", cell: (r) => r.donorName },
                  { key: "r", header: "Kết quả", cell: (r) => <Pill t={CONTACT_TONE[r.result as ContactResult] ?? "slate"}>{CONTACT_LABEL[r.result as ContactResult] ?? r.result}</Pill> },
                  { key: "s", header: "Người ghi nhận", cell: (r) => r.staffName ?? "–" },
                ]} />
              )}
              <p className="mt-3 text-xs text-muted-foreground">Do nhân viên tự khai. Hệ thống không biết cuộc gọi có thành công hay không, và không hiển thị số điện thoại ở trang này.</p>
            </CardContent></Card>
            <Card className="mt-6"><CardHeader><CardTitle>Báo cáo vi phạm theo trạng thái</CardTitle></CardHeader><CardContent>
              {d.reportsByStatus.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có báo cáo nào.</p> : (
                <div className="flex flex-wrap gap-3">{d.reportsByStatus.map((r) => <Link key={r.status} href="/admin/reports" aria-label={`Mở Báo cáo vi phạm, trạng thái ${REPORT[r.status] ?? r.status}`}><Pill t={r.status === "OPEN" ? "red" : "slate"}>{REPORT[r.status] ?? r.status}: {r.total}</Pill></Link>)}</div>
              )}
            </CardContent></Card>
          </>
        )}
    </>
  );
}
