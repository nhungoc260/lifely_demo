"use client";

import { useState } from "react";

import { PageHeader } from "@/components/shell/page-header";
import { Pill } from "@/components/ui/badges";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { formatDateTime } from "@/lib/format";
import { adminApi } from "@/services";

const ACTIONS = ["LOGIN", "USER_REGISTERED", "REQUEST_CREATED", "REQUEST_VERIFIED", "REQUEST_REJECTED", "REQUEST_CANCELLED", "MATCH_ACCEPTED", "MATCH_REJECTED", "MATCH_COMPLETED", "ORGANIZATION_VERIFIED", "ORGANIZATION_REJECTED", "ORGANIZATION_SUSPENDED", "USER_SUSPENDED", "USER_ACTIVATED", "REPORT_CREATED", "REPORT_UPDATED", "PASSWORD_RESET"];

export default function AdminAudit() {
  const [action, setAction] = useState("");
  const [page, setPage] = useState(0);
  const res = useQuery(`admin-audit:${action}:${page}`, () => adminApi.auditLogs({ action: action || undefined, page, size: 25 }));
  return (
    <>
      <PageHeader title="Audit log" description="Who did what, and when. Passwords, tokens and secrets are never recorded." />
      <div className="mb-5 max-w-xs"><label htmlFor="audit-action" className="sr-only">Action</label>
        <Select id="audit-action" value={action} onChange={(e) => { setAction(e.target.value); setPage(0); }}><option value="">All actions</option>{ACTIONS.map((a) => <option key={a}>{a}</option>)}</Select></div>
      {res.initialLoading ? <Skeleton className="h-96" />
        : res.error && !res.data ? <ErrorState message={res.error.message} onRetry={res.reload} />
        : res.data && res.data.items.length === 0 ? <EmptyState title="No audit entries" />
        : res.data && (
          <>
            <DataTable caption="Audit log" rows={res.data.items} rowKey={(r) => r.id} columns={[
              { key: "when", header: "Time", cell: (r) => formatDateTime(r.createdAt) },
              { key: "action", header: "Action", cell: (r) => <Pill t="blue">{r.action}</Pill> },
              { key: "entity", header: "Entity", cell: (r) => <span className="text-xs">{r.entityType ?? "–"}{r.entityId ? ` · ${r.entityId.slice(0, 8)}` : ""}</span> },
              { key: "user", header: "User", cell: (r) => <span className="font-mono text-xs">{r.userId ? r.userId.slice(0, 8) : "system"}</span> },
              { key: "meta", header: "Details", cell: (r) => <span className="max-w-xs truncate font-mono text-xs text-muted-foreground">{r.metadata ? JSON.stringify(r.metadata) : ""}</span> },
            ]} />
            <Pagination page={res.data} onChange={setPage} />
          </>
        )}
    </>
  );
}
