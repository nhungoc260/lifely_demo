"use client";

import { Activity, AlertOctagon, CheckCircle2, Clock, Download, Droplets, Printer } from "lucide-react";
import { useMemo } from "react";

import { StatusChart } from "@/components/admin/charts";
import { BloodGroupRequestsChart, WeeklyRequestsChart } from "@/components/organization/stats-charts";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { downloadCsv } from "@/lib/csv";
import { formatDateTime, STATUS_LABEL } from "@/lib/format";
import { URGENCY_LABEL } from "@/lib/labels";
import { formatHours, summarize } from "@/lib/org-stats";
import { orgApi, requestApi } from "@/services";
import type { BloodRequest } from "@/types/domain";

/** Backend giới hạn 50 yêu cầu mỗi trang: lấy tối đa 4 trang (200 yêu cầu gần nhất). */
async function loadAll(): Promise<BloodRequest[]> {
  const all: BloodRequest[] = [];
  for (let page = 0; page < 4; page++) {
    const res = await requestApi.list({ page, size: 50 });
    all.push(...res.items);
    if (page + 1 >= res.totalPages) break;
  }
  return all;
}

export default function OrganizationStats() {
  const me = useQuery("org-me", orgApi.me);
  const res = useQuery("org-stats", loadAll);
  const requests = res.data;
  const s = useMemo(() => (requests ? summarize(requests) : null), [requests]);

  function exportCsv() {
    if (!requests) return;
    downloadCsv(
      `lifely-yeu-cau-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Mã yêu cầu", "Nhóm máu", "Số đơn vị cần", "Đã xác nhận", "Mức độ", "Trạng thái", "Hạn chót", "Ngày tạo"],
      requests.map((r) => [r.id, r.bloodType, r.unitsRequired, r.unitsConfirmed, URGENCY_LABEL[r.urgency], STATUS_LABEL[r.status] ?? r.status, formatDateTime(r.deadline), formatDateTime(r.createdAt)]),
    );
  }

  return (
    <>
      {requests && s && <PrintReport orgName={me.data?.name ?? "Tổ chức y tế"} requests={requests} s={s} />}
      <div className="print:hidden">
      <PageHeader
        title="Thống kê"
        description="Tình hình yêu cầu máu của cơ sở (tối đa 200 yêu cầu gần nhất)."
        actions={<><Button variant="outline" onClick={() => window.print()} disabled={!requests || requests.length === 0}><Printer /> In / Lưu PDF</Button><Button variant="outline" onClick={exportCsv} disabled={!requests || requests.length === 0}><Download /> Xuất CSV</Button></>}
      />
      {res.error && !res.data ? <ErrorState message={res.error.message} onRetry={res.reload} />
        : res.initialLoading || !s ? <Skeleton className="h-72" />
        : s.total === 0 ? <EmptyState title="Chưa có dữ liệu thống kê" description="Khi cơ sở tạo yêu cầu máu, biểu đồ và số liệu sẽ hiện ở đây." />
        : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <StatCard label="Tổng yêu cầu" value={s.total} icon={Activity} accent />
              <StatCard label="Yêu cầu nguy kịch" value={s.critical} icon={AlertOctagon} />
              <StatCard label="Tỷ lệ đủ người" value={s.fulfillRate === null ? "–" : `${s.fulfillRate}%`} icon={CheckCircle2} hint="Trong các yêu cầu đã đóng" />
              <StatCard label="Đơn vị máu đã có" value={`${s.unitsConfirmed}/${s.unitsRequired}`} icon={Droplets} hint={s.unitsRate === null ? undefined : `${s.unitsRate}% số đơn vị cần`} />
              <StatCard label="Thời gian đáp ứng TB" value={formatHours(s.avgHours)} icon={Clock} hint="Ước tính, với yêu cầu đã đủ người" />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Card><CardHeader><CardTitle>Yêu cầu theo tuần</CardTitle></CardHeader><div className="p-5"><WeeklyRequestsChart data={s.perWeek} /></div></Card>
              <Card><CardHeader><CardTitle>Yêu cầu theo nhóm máu</CardTitle></CardHeader><div className="p-5"><BloodGroupRequestsChart data={s.byBlood} /></div></Card>
              <Card className="lg:col-span-2"><CardHeader><CardTitle>Yêu cầu theo trạng thái</CardTitle></CardHeader><div className="p-5"><StatusChart data={s.byStatus} /></div></Card>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/** Bản in / lưu PDF: nền trắng, chữ đen, dạng bảng để đọc rõ trên giấy (chỉ hiện khi in). */
function PrintReport({ orgName, requests, s }: { orgName: string; requests: BloodRequest[]; s: ReturnType<typeof summarize> }) {
  const th = "border border-neutral-400 bg-neutral-100 px-2 py-1 text-left font-semibold";
  const td = "border border-neutral-400 px-2 py-1";
  return (
    <section className="hidden bg-white p-2 text-[12px] leading-snug text-black print:block">
      <h1 className="text-xl font-bold">Báo cáo yêu cầu máu</h1>
      <p className="mt-1">{orgName} · Ngày lập: {new Date().toLocaleDateString("vi-VN")} · Gồm {s.total} yêu cầu gần nhất</p>

      <h2 className="mt-4 text-sm font-semibold">Tổng hợp</h2>
      <table className="mt-1 w-full border-collapse"><tbody>
        <tr><td className={td}>Tổng yêu cầu</td><td className={td}>{s.total}</td><td className={td}>Yêu cầu nguy kịch</td><td className={td}>{s.critical}</td></tr>
        <tr><td className={td}>Tỷ lệ đủ người (yêu cầu đã đóng)</td><td className={td}>{s.fulfillRate === null ? "–" : `${s.fulfillRate}%`}</td><td className={td}>Đơn vị máu đã có / cần</td><td className={td}>{s.unitsConfirmed}/{s.unitsRequired}</td></tr>
        <tr><td className={td}>Thời gian đáp ứng TB (ước tính)</td><td className={td} colSpan={3}>{formatHours(s.avgHours)}</td></tr>
      </tbody></table>

      <h2 className="mt-4 text-sm font-semibold">Theo nhóm máu</h2>
      <table className="mt-1 w-full border-collapse">
        <thead><tr><th className={th}>Nhóm máu</th><th className={th}>Số yêu cầu</th></tr></thead>
        <tbody>{s.byBlood.map((b) => <tr key={b.bloodType}><td className={td}>{b.bloodType}</td><td className={td}>{b.requests}</td></tr>)}</tbody>
      </table>

      <h2 className="mt-4 text-sm font-semibold">Danh sách yêu cầu</h2>
      <table className="mt-1 w-full border-collapse">
        <thead><tr><th className={th}>Ngày tạo</th><th className={th}>Nhóm máu</th><th className={th}>Đơn vị (có/cần)</th><th className={th}>Mức độ</th><th className={th}>Trạng thái</th><th className={th}>Hạn chót</th></tr></thead>
        <tbody>{requests.map((r) => (
          <tr key={r.id} className="break-inside-avoid">
            <td className={td}>{formatDateTime(r.createdAt)}</td><td className={td}>{r.bloodType}</td><td className={td}>{r.unitsConfirmed}/{r.unitsRequired}</td>
            <td className={td}>{URGENCY_LABEL[r.urgency]}</td><td className={td}>{STATUS_LABEL[r.status] ?? r.status}</td><td className={td}>{formatDateTime(r.deadline)}</td>
          </tr>
        ))}</tbody>
      </table>
      <p className="mt-3 text-[10px] text-neutral-600">LIFELY chỉ hỗ trợ điều phối; quyết định điều kiện hiến máu và truyền máu thuộc về nhân viên y tế có chuyên môn.</p>
    </section>
  );
}
