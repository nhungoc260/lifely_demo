"use client";

import { AlertOctagon, Building2, CheckCheck, ClipboardList, Handshake, Users, HeartPulse } from "lucide-react";
import Link from "next/link";

import { BloodTypeChart, DonorGrowth, RequestsOverTime, ResponseChart, StatusChart } from "@/components/admin/charts";
import { Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { Button } from "@/components/ui/button";
import { toApiError } from "@/lib/api";
import { adminApi } from "@/services";

export default function AdminDashboard() {
  const q = useQuery("admin-dash", adminApi.dashboard);
  const [sending, setSending] = useState(false);

  async function emailReport() {
    setSending(true);
    try { await adminApi.emailSummary(); toast.success("Báo cáo tổng hợp đang được gửi tới hộp thư của bạn"); }
    catch (e) { toast.error(toApiError(e).message); } finally { setSending(false); }
  }
  const d = q.data;
  const k = d?.kpi;
  const L = q.initialLoading;

  return (
    <>
      <PageHeader title="Tổng quan quản trị" description="Tình trạng hệ thống và hoạt động điều phối." actions={<Button variant="outline" size="sm" onClick={emailReport} disabled={sending}><Mail /> Gửi báo cáo này qua email</Button>} />
      {q.error && !d ? <ErrorState message={q.error.message} onRetry={q.reload} /> : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard label="Người dùng" value={k?.users ?? 0} icon={Users} loading={L} href="/admin/users" />
            <StatCard label="Người hiến máu" value={k?.donors ?? 0} icon={HeartPulse} loading={L} href="/admin/users" />
            <StatCard label="Yêu cầu đang hoạt động" value={k?.activeRequests ?? 0} icon={ClipboardList} accent loading={L} href="/admin/requests" />
            <StatCard label="Yêu cầu nguy kịch" value={k?.criticalRequests ?? 0} icon={AlertOctagon} loading={L} href="/admin/requests" />
            <StatCard label="Tổ chức đã xác minh" value={k?.verifiedOrganizations ?? 0} icon={Building2} loading={L} href="/admin/organizations" />
            <StatCard label="Lượt hiến máu hoàn tất" value={k?.completedMatches ?? 0} icon={Handshake} loading={L} href="/admin/requests" hint={`Tổng cộng ${k?.confirmedMatches ?? 0} lượt đã xác nhận`} />
          </div>
          {k && (k.pendingVerification > 0 || k.organizationsUnderReview > 0 || k.openReports > 0 || k.newMessages > 0) && (
            <Card className="mt-6 border-warning/40 bg-warning/5 p-5">
              <p className="flex items-center gap-2 font-medium"><CheckCheck className="size-4" aria-hidden />Cần bạn xử lý</p>
              <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                {k.pendingVerification > 0 && <li><Link className="font-medium text-primary hover:underline" href="/admin/requests">{k.pendingVerification} yêu cầu</Link> đang chờ xác minh</li>}
                {k.organizationsUnderReview > 0 && <li><Link className="font-medium text-primary hover:underline" href="/admin/organizations">{k.organizationsUnderReview} tổ chức</Link> đang được xem xét</li>}
                {k.newMessages > 0 && <li><Link className="font-medium text-primary hover:underline" href="/admin/messages">{k.newMessages} tin nhắn mới</Link></li>}
                {k.openReports > 0 && <li><Link className="font-medium text-primary hover:underline" href="/admin/reports">{k.openReports} báo cáo đang mở</Link></li>}
              </ul>
            </Card>
          )}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card><CardHeader><CardTitle>Yêu cầu theo thời gian (14 ngày)</CardTitle></CardHeader><CardContent>{d ? <RequestsOverTime data={d.requestsOverTime} /> : <Skeleton className="h-[260px]" />}</CardContent></Card>
            <Card><CardHeader><CardTitle>Tăng trưởng người hiến máu (6 tháng)</CardTitle></CardHeader><CardContent>{d ? <DonorGrowth data={d.donorGrowth} /> : <Skeleton className="h-[260px]" />}</CardContent></Card>
            <Card><CardHeader><CardTitle>Phân bố nhóm máu</CardTitle></CardHeader><CardContent>{d ? <BloodTypeChart data={d.bloodTypeDistribution} /> : <Skeleton className="h-[260px]" />}</CardContent></Card>
            <Card><CardHeader><CardTitle>Trạng thái yêu cầu</CardTitle></CardHeader><CardContent>{d ? <StatusChart data={d.requestStatus} /> : <Skeleton className="h-[260px]" />}</CardContent></Card>
            <Card className="lg:col-span-2"><CardHeader><CardTitle>Phản hồi khẩn cấp: số phút trung bình từ lúc liên hệ đến lúc trả lời</CardTitle></CardHeader><CardContent>{d ? (d.emergencyResponse.length ? <ResponseChart data={d.emergencyResponse} /> : <p className="py-10 text-center text-sm text-muted-foreground">Chưa ghi nhận phản hồi nào.</p>) : <Skeleton className="h-[260px]" />}</CardContent></Card>
          </div>
        </>
      )}
    </>
  );
}
