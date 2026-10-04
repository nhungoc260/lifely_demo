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
import { adminApi } from "@/services";
import type { ReportStatus } from "@/types/domain";

export default function AdminReports() {
  const [status, setStatus] = useState<ReportStatus | "">("");
  const [page, setPage] = useState(0);
  const res = useQuery(`admin-reports:${status}:${page}`, () => adminApi.reports({ status: status || undefined, page, size: 15 }));

  async function update(id: string, next: ReportStatus) {
    try { await adminApi.updateReport(id, next); toast.success("Report updated"); res.reload(); }
    catch (e) { toast.error(toApiError(e).message); }
  }

  return (
    <>
      <PageHeader title="Reports" description="Reports from users about requests, accounts and organizations." />
      <div className="mb-5 max-w-xs"><label htmlFor="rep-status" className="sr-only">Status</label>
        <Select id="rep-status" value={status} onChange={(e) => { setStatus(e.target.value as ReportStatus | ""); setPage(0); }}><option value="">All</option><option value="OPEN">Open</option><option value="INVESTIGATING">Investigating</option><option value="RESOLVED">Resolved</option><option value="REJECTED">Rejected</option></Select></div>
      {res.initialLoading ? <Skeleton className="h-72" />
        : res.error && !res.data ? <ErrorState message={res.error.message} onRetry={res.reload} />
        : res.data && res.data.items.length === 0 ? <EmptyState title="No reports" description="Nothing to review right now." />
        : res.data && (
          <>
            <DataTable caption="Reports" rows={res.data.items} rowKey={(r) => r.id} columns={[
              { key: "when", header: "Reported", cell: (r) => formatDateTime(r.createdAt) },
              { key: "target", header: "Target", cell: (r) => <Pill t="slate">{r.targetType}</Pill> },
              { key: "reason", header: "Reason", cell: (r) => <div><p className="font-medium">{r.reason.replaceAll("_", " ").toLowerCase()}</p>{r.description && <p className="max-w-xs text-xs text-muted-foreground">{r.description}</p>}</div> },
              { key: "status", header: "Status", cell: (r) => <ReportBadge status={r.status} /> },
              { key: "act", header: "Update", align: "right", cell: (r) => (
                <label className="inline-block"><span className="sr-only">Update status</span>
                  <Select className="h-9 w-40" value={r.status} onChange={(e) => update(r.id, e.target.value as ReportStatus)}><option value="OPEN">Open</option><option value="INVESTIGATING">Investigating</option><option value="RESOLVED">Resolved</option><option value="REJECTED">Rejected</option></Select></label>
              ) },
            ]} />
            <Pagination page={res.data} onChange={setPage} />
          </>
        )}
    </>
  );
}
