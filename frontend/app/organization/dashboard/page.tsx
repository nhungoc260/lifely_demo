"use client";

import { Activity, AlertOctagon, BadgeCheck, CheckCircle2, Percent } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { OrgStatusBadge } from "@/components/ui/badges";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { orgApi } from "@/services";
import { useNotifications } from "@/providers/notifications-provider";

export default function OrganizationDashboard() {
  const { version } = useNotifications();
  const me = useQuery("org-me", orgApi.me);
  const dash = useQuery(me.data ? `org-dash:${version}` : null, orgApi.dashboard);
  const verified = me.data?.verificationStatus === "VERIFIED";

  return (
    <>
      <PageHeader title="Tổng quan tổ chức" description={me.data?.name ?? "Thiết lập tổ chức của bạn để bắt đầu điều phối."} actions={verified ? <Link href="/organization/requests/create" className={buttonVariants()}>Yêu cầu mới</Link> : undefined} />
      {me.error && !me.data ? <ErrorState message={me.error.message} onRetry={me.reload} /> : me.data === null ? (
        <Card className="p-8 text-center"><p className="text-lg font-semibold">Hoàn tất hồ sơ tổ chức</p><p className="mt-1 text-sm text-muted-foreground">Thêm thông tin và giấy tờ xác minh để đội ngũ của chúng tôi xác minh cho bạn.</p><Link href="/organization/profile" className={buttonVariants({ className: "mt-5" })}>Thiết lập tổ chức</Link></Card>
      ) : (
        <>
          {me.data && !verified && (
            <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 border-warning/40 bg-warning/5 p-5">
              <div><p className="flex items-center gap-2 font-medium">Xác minh <OrgStatusBadge status={me.data.verificationStatus} /></p><p className="mt-1 text-sm text-muted-foreground">{me.data.verificationStatus === "REJECTED" ? (me.data.verificationNote ?? "Vui lòng cập nhật thông tin và nộp lại.") : "Khi chưa được xác minh, yêu cầu của bạn sẽ được admin xem xét trước khi liên hệ người hiến máu."}</p></div>
              <Link href="/organization/profile" className={buttonVariants({ size: "sm", variant: "outline" })}>Quản lý xác minh</Link>
            </Card>
          )}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard label="Xác minh" value={me.data ? <OrgStatusBadge status={me.data.verificationStatus} /> : "–"} icon={BadgeCheck} loading={me.initialLoading} />
            <StatCard label="Yêu cầu đang hoạt động" value={dash.data?.activeRequests ?? 0} icon={Activity} accent loading={dash.initialLoading} />
            <StatCard label="Yêu cầu nguy kịch" value={dash.data?.criticalRequests ?? 0} icon={AlertOctagon} loading={dash.initialLoading} />
            <StatCard label="Yêu cầu đã hoàn tất" value={dash.data?.completedRequests ?? 0} icon={CheckCircle2} loading={dash.initialLoading} />
            <StatCard label="Tỷ lệ phản hồi" value={`${dash.data?.responseRate ?? 0}%`} icon={Percent} loading={dash.initialLoading} hint="Người hiến máu được liên hệ đã trả lời" />
          </div>
        </>
      )}
    </>
  );
}
