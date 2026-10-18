"use client";

import { Activity, AlertOctagon, BadgeCheck, CheckCircle2, Percent } from "lucide-react";
import Link from "next/link";

import { RequesterRequestCard } from "@/components/requests/requester-request-card";
import { PageHeader } from "@/components/shell/page-header";
import { OrgStatusBadge } from "@/components/ui/badges";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { splitRequests } from "@/lib/request-progress";
import { orgApi, requestApi } from "@/services";
import { useNotifications } from "@/providers/notifications-provider";

export default function OrganizationDashboard() {
  const { version } = useNotifications();
  const me = useQuery("org-me", orgApi.me);
  const dash = useQuery(me.data ? `org-dash:${version}` : null, orgApi.dashboard);
  const verified = me.data?.verificationStatus === "VERIFIED";
  const recent = useQuery(me.data ? `org-recent:${version}` : null, () => requestApi.list({ size: 10 }));
  const { open, closed } = splitRequests(recent.data?.items ?? []);

  return (
    <>
      <PageHeader title="Tổng quan tổ chức" description={me.data?.name ?? "Thiết lập tổ chức của bạn để bắt đầu điều phối."} actions={verified ? <Link href="/organization/requests/create" className={buttonVariants()}>Yêu cầu mới</Link> : undefined} />
      {me.error && !me.data ? <ErrorState message={me.error.message} onRetry={me.reload} /> : me.data === null ? (
        <Card className="p-8 text-center"><p className="text-lg font-semibold">Hoàn tất hồ sơ tổ chức</p><p className="mt-1 text-sm text-muted-foreground">Thêm thông tin và giấy tờ xác minh để đội ngũ của chúng tôi xác minh cho bạn.</p><Link href="/organization/profile" className={buttonVariants({ className: "mt-5" })}>Thiết lập tổ chức</Link></Card>
      ) : (
        <>
          {me.data && !verified && (
            <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 p-4 md:mb-6 md:p-5">
              <div><p className="flex items-center gap-2 font-medium">Xác minh <OrgStatusBadge status={me.data.verificationStatus} /></p><p className="mt-1 text-sm text-muted-foreground">{me.data.verificationStatus === "REJECTED" ? (me.data.verificationNote ?? "Vui lòng cập nhật thông tin và nộp lại.") : "Khi chưa được xác minh, yêu cầu của bạn sẽ được admin xem xét trước khi liên hệ người hiến máu."}</p></div>
              <Link href="/organization/profile" className={buttonVariants({ size: "sm", variant: "outline" })}>Quản lý xác minh</Link>
            </Card>
          )}
          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
            <StatCard label="Xác minh" value={me.data ? <OrgStatusBadge status={me.data.verificationStatus} /> : "–"} icon={BadgeCheck} loading={me.initialLoading} />
            <StatCard label="Yêu cầu đang hoạt động" value={dash.data?.activeRequests ?? 0} icon={Activity} accent loading={dash.initialLoading} />
            <StatCard label="Yêu cầu nguy kịch" value={dash.data?.criticalRequests ?? 0} icon={AlertOctagon} loading={dash.initialLoading} />
            <StatCard label="Yêu cầu đã hoàn tất" value={dash.data?.completedRequests ?? 0} icon={CheckCircle2} loading={dash.initialLoading} />
            <StatCard label="Tỷ lệ phản hồi" value={`${dash.data?.responseRate ?? 0}%`} icon={Percent} loading={dash.initialLoading} hint="Người hiến máu được liên hệ đã trả lời" />
          </div>

          <section className="mt-7 md:mt-10" aria-labelledby="org-open">
            <h2 id="org-open" className="mb-3 text-lg font-bold tracking-tight md:mb-4 md:text-xl md:font-semibold">Yêu cầu đang mở</h2>
            {recent.initialLoading ? <Skeleton className="h-40" />
              : recent.error && !recent.data ? <ErrorState message={recent.error.message} onRetry={recent.reload} />
              : open.length === 0 ? <EmptyState
                  title={closed.length > 0 ? "Hiện không có yêu cầu nào đang mở" : "Cơ sở của bạn chưa có yêu cầu nào"}
                  description="Khi cơ sở cần máu, hãy tạo yêu cầu: LIFELY sẽ tìm người hiến phù hợp gần cơ sở của bạn."
                  action={verified ? <Link href="/organization/requests/create" className={buttonVariants()}>Tạo yêu cầu máu</Link> : undefined} />
              : <ul className="space-y-3">{open.map((r) => <li key={r.id}><RequesterRequestCard r={r} basePath="/organization" /></li>)}</ul>}
          </section>

          {closed.length > 0 && (
            <details className="mt-8 rounded-2xl border border-border bg-card p-4">
              <summary className="cursor-pointer text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Yêu cầu đã đóng ({closed.length})</summary>
              <ul className="mt-4 space-y-3">{closed.map((r) => <li key={r.id}><RequesterRequestCard r={r} basePath="/organization" /></li>)}</ul>
            </details>
          )}
        </>
      )}
    </>
  );
}
