"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/components/shell/page-header";
import { BloodChip, StatusBadge, UrgencyBadge } from "@/components/ui/badges";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Countdown } from "@/components/ui/countdown";
import { Pagination } from "@/components/ui/pagination";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { STATUS_LABEL } from "@/lib/format";
import { requestApi, orgApi } from "@/services";
import type { RequestStatus } from "@/types/domain";

export function RequestsListView({ basePath }: { basePath: "/requester" | "/organization" }) {
  const [status, setStatus] = useState<RequestStatus | "">("");
  const [page, setPage] = useState(0);
  const fetcher = basePath === "/organization" ? orgApi.requests : requestApi.list;
  const q = useQuery(`${basePath}:requests:${status}:${page}`, () => fetcher({ status: status || undefined, page, size: 10 }));

  return (
    <>
      <PageHeader title="Yêu cầu của tôi" description="Theo dõi mọi yêu cầu bạn đã tạo." actions={<Link href={`${basePath}/requests/create`} className={buttonVariants()}><Plus /> Yêu cầu mới</Link>} />
      <div className="mb-5 max-w-xs">
        <label htmlFor="status-filter" className="sr-only">Lọc theo trạng thái</label>
        <Select id="status-filter" value={status} onChange={(e) => { setStatus(e.target.value as RequestStatus | ""); setPage(0); }}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>
      {q.initialLoading ? <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
        : q.error && !q.data ? <ErrorState message={q.error.message} onRetry={q.reload} />
        : q.data && q.data.items.length === 0 ? <EmptyState title="Chưa có yêu cầu nào" description="Hãy tạo yêu cầu, LIFELY sẽ bắt đầu tìm người hiến máu ngay khi yêu cầu được xác minh." action={<Link href={`${basePath}/requests/create`} className={buttonVariants()}>Tạo yêu cầu</Link>} />
        : (
          <>
            <ul className="space-y-3">
              {q.data?.items.map((r) => (
                <li key={r.id}>
                  <Link href={`${basePath}/requests/${r.id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl">
                    <Card className="p-5 transition-shadow hover:shadow-md">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3"><BloodChip type={r.bloodType} /><UrgencyBadge urgency={r.urgency} /><StatusBadge status={r.status} /></div>
                        <span className="text-sm text-muted-foreground">{["FULFILLED", "CANCELLED", "EXPIRED"].includes(r.status) ? "Đã đóng" : <>Còn lại <Countdown deadline={r.deadline} className="font-medium text-foreground" /></>}</span>
                      </div>
                      <p className="mt-3 font-medium">{r.hospitalName}</p>
                      <div className="mt-3 flex items-center gap-3"><ProgressBar className="flex-1" value={r.unitsConfirmed} max={r.unitsRequired} label="Người hiến máu đã xác nhận" /><span className="text-sm tabular-nums text-muted-foreground">{r.unitsConfirmed} / {r.unitsRequired}</span></div>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
            {q.data && <Pagination page={q.data} onChange={setPage} />}
          </>
        )}
    </>
  );
}
