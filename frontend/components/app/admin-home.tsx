"use client";

import { AlertOctagon, Building2, ClipboardList, HeartPulse, MessageSquare, ShieldAlert, Users } from "lucide-react";
import Link from "next/link";

import { ListGroup, ListRow } from "@/components/ui/mobile";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminDashboard } from "@/types/domain";

/** Trang chủ quản trị kiểu app: việc cần xử lý lên đầu, số liệu chính gọn. Biểu đồ và bảng dữ liệu nặng vẫn ở bản web. */
export function AdminAppHome({ kpi, loading, name }: { kpi?: AdminDashboard["kpi"]; loading: boolean; name?: string }) {
  const todo = kpi ? kpi.pendingVerification + kpi.organizationsUnderReview + kpi.openReports + kpi.newMessages : 0;
  const tiles = [
    { i: Users, v: kpi?.users, l: "Người dùng", href: "/admin/users" },
    { i: HeartPulse, v: kpi?.donors, l: "Người hiến", href: "/admin/users" },
    { i: ClipboardList, v: kpi?.activeRequests, l: "Đang hoạt động", href: "/admin/requests" },
    { i: AlertOctagon, v: kpi?.criticalRequests, l: "Nguy kịch", href: "/admin/requests" },
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
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><t.i className="size-5" aria-hidden /></span>
            <span>{loading ? <Skeleton className="h-6 w-10" /> : <span className="block text-xl font-extrabold leading-tight">{t.v ?? 0}</span>}<span className="block text-xs text-muted-foreground">{t.l}</span></span>
          </Link>
        ))}
      </section>

      {kpi && todo > 0 && (
        <ListGroup title="Cần bạn xử lý" className="mt-6">
          {kpi.pendingVerification > 0 && <ListRow icon={ClipboardList} tint="sky" href="/admin/requests" label={`${kpi.pendingVerification} yêu cầu`} hint="Đang chờ xác minh" />}
          {kpi.organizationsUnderReview > 0 && <ListRow icon={Building2} tint="violet" href="/admin/organizations" label={`${kpi.organizationsUnderReview} tổ chức`} hint="Đang được xem xét" />}
          {kpi.newMessages > 0 && <ListRow icon={MessageSquare} tint="emerald" href="/admin/messages" label={`${kpi.newMessages} tin nhắn mới`} hint="Từ người dùng" />}
          {kpi.openReports > 0 && <ListRow icon={ShieldAlert} tint="rose" href="/admin/reports" label={`${kpi.openReports} báo cáo`} hint="Đang mở" />}
        </ListGroup>
      )}
      <p className="mt-6 text-center text-xs text-muted-foreground">Biểu đồ và bảng dữ liệu chi tiết xem trên bản web.</p>
    </div>
  );
}
