"use client";

import { CheckCircle2, ClipboardList, MessageSquareReply, UsersRound } from "lucide-react";
import Link from "next/link";

import { HowItWorks } from "@/components/requests/how-it-works";
import { RequesterRequestCard } from "@/components/requests/requester-request-card";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { splitRequests } from "@/lib/request-progress";
import { requestApi } from "@/services";
import { useAuth } from "@/providers/auth-provider";
import { useNotifications } from "@/providers/notifications-provider";

export default function RequesterDashboard() {
  const { user } = useAuth();
  const { version } = useNotifications();
  const dash = useQuery(`req-dash:${version}`, requestApi.dashboard);
  const recent = useQuery(`req-recent:${version}`, () => requestApi.list({ size: 10 }));
  const { open, closed } = splitRequests(recent.data?.items ?? []);
  const active = dash.data?.activeRequests;

  return (
    <>
      <div className="mb-5 md:mb-8">
        <p className="text-sm text-muted-foreground md:hidden">Xin chào</p>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight md:text-3xl md:font-semibold"><span className="hidden md:inline">Xin chào, </span>{user?.fullName}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground md:text-base">
          {active === undefined ? "\u00a0"
            : active > 0 ? `Bạn có ${active} yêu cầu đang mở. Số người hiến nhận lời sẽ tự cập nhật.`
            : "Chưa có yêu cầu nào đang mở. Cần máu? Hãy tạo yêu cầu, LIFELY sẽ tìm người hiến gần bệnh viện."}
        </p>
        <Link href="/requester/requests/create" className={buttonVariants({ size: "lg", className: "press mt-4 w-full md:hidden" })}>Tạo yêu cầu máu</Link>
      </div>

      {recent.data && recent.data.items.length === 0 && <div className="mb-8"><HowItWorks /></div>}

      <section aria-labelledby="open-requests">
        <h2 id="open-requests" className="mb-3 text-lg font-bold tracking-tight md:mb-4 md:text-xl md:font-semibold">Yêu cầu đang mở</h2>
        {recent.initialLoading ? <Skeleton className="h-40" />
          : recent.error && !recent.data ? <ErrorState message={recent.error.message} onRetry={recent.reload} />
          : open.length === 0 ? <EmptyState
              title={closed.length > 0 ? "Hiện không có yêu cầu nào đang mở" : "Bạn chưa tạo yêu cầu nào"}
              description="Cần máu cho bệnh nhân? Hãy tạo yêu cầu, LIFELY sẽ tìm người hiến phù hợp gần bệnh viện."
              action={<Link href="/requester/requests/create" className={buttonVariants()}>Tạo yêu cầu máu</Link>} />
          : <ul className="space-y-3">{open.map((r) => <li key={r.id}><RequesterRequestCard r={r} /></li>)}</ul>}
      </section>

      {closed.length > 0 && (
        <details className="mt-8 rounded-2xl border border-border bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Yêu cầu đã đóng ({closed.length})</summary>
          <ul className="mt-4 space-y-3">{closed.map((r) => <li key={r.id}><RequesterRequestCard r={r} /></li>)}</ul>
        </details>
      )}

      <section className="mt-7 md:mt-10" aria-label="Tóm tắt">
        {dash.error && !dash.data ? <ErrorState message={dash.error.message} onRetry={dash.reload} /> : (
          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <StatCard label="Yêu cầu đang mở" value={dash.data?.activeRequests ?? 0} icon={ClipboardList} accent loading={dash.initialLoading} />
            <StatCard label="Người hiến đã nhận lời" value={dash.data?.confirmedDonors ?? 0} icon={UsersRound} loading={dash.initialLoading} hint="Trên tất cả yêu cầu của bạn" />
            <StatCard label="Người hiến đã trả lời" value={dash.data?.responses ?? 0} icon={MessageSquareReply} loading={dash.initialLoading} hint="Gồm cả nhận lời và từ chối" />
            <StatCard label="Yêu cầu đã đủ người" value={dash.data?.completedRequests ?? 0} icon={CheckCircle2} loading={dash.initialLoading} />
          </div>
        )}
        <div className="mt-6 text-sm"><Link href="/requester/requests" className="font-medium text-primary hover:underline">Xem tất cả yêu cầu của tôi</Link></div>
      </section>
    </>
  );
}
