"use client";

import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/page-header";
import { Pill, ReportBadge } from "@/components/ui/badges";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { toApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { REPORT_REASON_LABEL, TARGET_LABEL } from "@/lib/labels";
import { adminApi } from "@/services";
import type { ReportStatus } from "@/types/domain";

export default function AdminReports() {
  const [status, setStatus] = useState<ReportStatus | "">("");
  const [page, setPage] = useState(0);
  const res = useQuery(`admin-reports:${status}:${page}`, () => adminApi.reports({ status: status || undefined, page, size: 15 }));

  async function update(id: string, next: ReportStatus) {
    try { await adminApi.updateReport(id, next); toast.success("Đã cập nhật báo cáo"); res.reload(); }
    catch (e) { toast.error(toApiError(e).message); }
  }

  return (
    <>
      <PageHeader title="Báo cáo vi phạm" description="Báo cáo của người dùng về yêu cầu, tài khoản và tổ chức." />
      <div className="mb-5 max-w-xs"><label htmlFor="rep-status" className="sr-only">Trạng thái</label>
        <Select id="rep-status" value={status} onChange={(e) => { setStatus(e.target.value as ReportStatus | ""); setPage(0); }}><option value="">Tất cả</option><option value="OPEN">Đang mở</option><option value="INVESTIGATING">Đang điều tra</option><option value="RESOLVED">Đã xử lý</option><option value="REJECTED">Đã từ chối</option></Select></div>
      {res.initialLoading ? <Skeleton className="h-72" />
        : res.error && !res.data ? <ErrorState message={res.error.message} onRetry={res.reload} />
        : res.data && res.data.items.length === 0 ? <EmptyState title="Chưa có báo cáo" description="Hiện không có gì cần xem xét." />
        : res.data && (
          <>
            <DataTable caption="Báo cáo vi phạm" rows={res.data.items} rowKey={(r) => r.id} columns={[
              { key: "when", header: "Thời gian báo cáo", cell: (r) => formatDateTime(r.createdAt) },
              { key: "target", header: "Đối tượng", cell: (r) => <Pill t="slate">{TARGET_LABEL[r.targetType]}</Pill> },
              { key: "reason", header: "Lý do", cell: (r) => <div><p className="font-medium">{REPORT_REASON_LABEL[r.reason]}</p>{r.description && <p className="max-w-xs text-xs text-muted-foreground">{r.description}</p>}</div> },
              { key: "status", header: "Trạng thái", cell: (r) => <ReportBadge status={r.status} /> },
              { key: "act", header: "Cập nhật", align: "right", cell: (r) => (
                <label className="inline-block"><span className="sr-only">Cập nhật trạng thái</span>
                  <Select className="h-9 w-40" value={r.status} onChange={(e) => update(r.id, e.target.value as ReportStatus)}><option value="OPEN">Đang mở</option><option value="INVESTIGATING">Đang điều tra</option><option value="RESOLVED">Đã xử lý</option><option value="REJECTED">Đã từ chối</option></Select></label>
              ) },
            ]} />
            <Pagination page={res.data} onChange={setPage} />
          </>
        )}
    </>
  );
}
