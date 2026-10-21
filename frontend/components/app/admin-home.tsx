"use client";

import { AlertOctagon, BarChart3, Building2, CalendarDays, ClipboardList, Droplets, Handshake, HeartPulse, Mail, MessageSquare, ScrollText, ShieldAlert, Users } from "lucide-react";
import Link from "next/link";

import { BloodTypeChart, DonorGrowth, RequestsOverTime, ResponseChart, StatusChart } from "@/components/admin/charts";
import { ListGroup, ListRow } from "@/components/ui/mobile";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminDashboard } from "@/types/domain";

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl bg-card p-4 ring-1 ring-border/60"><h3 className="mb-3 text-sm font-semibold">{title}</h3>{children}</section>;
}

/** Trang chủ quản trị kiểu app: việc cần xử lý lên đầu, số liệu chính, lối tắt tới mọi mục quản lý và biểu đồ như bản web. */
export function AdminAppHome({ data, loading, name, onEmailReport, sending }: { data?: AdminDashboard; loading: boolean; name?: string; onEmailReport?: () => void; sending?: boolean }) {
  const kpi = data?.kpi;
  const todo = kpi ? kpi.pendingVerification + kpi.organizationsUnderReview + kpi.openReports + kpi.newMessages : 0;
  const tiles = [
    { i: Users, v: kpi?.users, l: "Người dùng", href: "/admin/users" },
    { i: HeartPulse, v: kpi?.donors, l: "Người hiến", href: "/admin/users" },
    { i: ClipboardList, v: kpi?.activeRequests, l: "Đang hoạt động", href: "/admin/requests" },
    { i: AlertOctagon, v: kpi?.criticalRequests, l: "Nguy kịch", href: "/admin/requests" },
    { i: Building2, v: kpi?.verifiedOrganizations, l: "Tổ chức đã xác minh", href: "/admin/organizations" },
    { i: Handshake, v: kpi?.completedMatches, l: "Lượt hiến hoàn tất", href: "/admin/requests" },
  ];
  return (
    <div>
      <section className="-mx-4 rounded-b-[28px] bg-primary px-4 pb-10 pt-1 text-primary-foreground">
        <p className="text-sm opacity-80">Khu vực quản trị</p>
        <h2 className="text-2xl font-bold leading-tight">{name}</h2>
        <p className="mt-2 text-sm opacity-90">{loading ? "Đang tải…" : todo > 0 ? `Có ${todo} việc đang chờ bạn xử lý` : "Không có việc nào đang chờ"}</p>
      </section>

      <section aria-label="Số liệu chính" className="-mt-6 grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <Link key={t.l} href={t.href} className="press flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><t.i className="size-5" aria-hidden /></span>
            <span className="min-w-0">{loading ? <Skeleton className="h-6 w-10" /> : <span className="block text-xl font-extrabold leading-tight">{t.v ?? 0}</span>}<span className="block truncate text-xs text-muted-foreground">{t.l}</span></span>
          </Link>
        ))}
      </section>
      {kpi && <p className="mt-2 px-1 text-xs text-muted-foreground">Tổng cộng {kpi.confirmedMatches} lượt hiến đã được xác nhận.</p>}

      {kpi && todo > 0 && (
        <ListGroup title="Cần bạn xử lý" className="mt-6">
          {kpi.pendingVerification > 0 && <ListRow icon={ClipboardList} tint="sky" href="/admin/requests" label={`${kpi.pendingVerification} yêu cầu`} hint="Đang chờ xác minh" />}
          {kpi.organizationsUnderReview > 0 && <ListRow icon={Building2} tint="violet" href="/admin/organizations" label={`${kpi.organizationsUnderReview} tổ chức`} hint="Đang được xem xét" />}
          {kpi.newMessages > 0 && <ListRow icon={MessageSquare} tint="emerald" href="/admin/messages" label={`${kpi.newMessages} tin nhắn mới`} hint="Từ người dùng" />}
          {kpi.openReports > 0 && <ListRow icon={ShieldAlert} tint="rose" href="/admin/reports" label={`${kpi.openReports} báo cáo`} hint="Đang mở" />}
        </ListGroup>
      )}

      <ListGroup title="Quản lý" className="mt-6">
        <ListRow icon={Droplets} tint="rose" href="/admin/inventory" label="Kho máu" hint="Tồn kho theo nhóm máu và tổ chức" />
        <ListRow icon={CalendarDays} tint="sky" href="/admin/appointments" label="Lịch hiến" />
        <ListRow icon={MessageSquare} tint="emerald" href="/admin/messages" label="Tin nhắn" />
        <ListRow icon={BarChart3} tint="amber" href="/admin/operations" label="Thống kê vận hành" />
        <ListRow icon={ScrollText} tint="slate" href="/admin/audit" label="Nhật ký hoạt động" />
      </ListGroup>

      <div className="mt-6 space-y-3">
        <h2 className="px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Biểu đồ</h2>
        <ChartCard title="Yêu cầu theo thời gian (14 ngày)">{data ? <RequestsOverTime data={data.requestsOverTime} /> : <Skeleton className="h-[260px]" />}</ChartCard>
        <ChartCard title="Tăng trưởng người hiến máu (6 tháng)">{data ? <DonorGrowth data={data.donorGrowth} /> : <Skeleton className="h-[260px]" />}</ChartCard>
        <ChartCard title="Phân bố nhóm máu">{data ? <BloodTypeChart data={data.bloodTypeDistribution} /> : <Skeleton className="h-[260px]" />}</ChartCard>
        <ChartCard title="Trạng thái yêu cầu">{data ? <StatusChart data={data.requestStatus} /> : <Skeleton className="h-[260px]" />}</ChartCard>
        <ChartCard title="Phản hồi khẩn cấp (phút trung bình)">{data ? (data.emergencyResponse.length ? <ResponseChart data={data.emergencyResponse} /> : <p className="py-10 text-center text-sm text-muted-foreground">Chưa ghi nhận phản hồi nào.</p>) : <Skeleton className="h-[260px]" />}</ChartCard>
      </div>

      {onEmailReport && (
        <ListGroup className="mt-6">
          <ListRow icon={Mail} tint="violet" label={sending ? "Đang gửi…" : "Gửi báo cáo này qua email"} hint="Tổng hợp gửi tới hộp thư của bạn" onClick={sending ? undefined : onEmailReport} />
        </ListGroup>
      )}
    </div>
  );
}
