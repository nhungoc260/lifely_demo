"use client";

import { useState } from "react";

import { PageHeader } from "@/components/shell/page-header";
import { Pill } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input, Select } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { actorLabel, describeAudit } from "@/lib/audit";
import { formatDateTime } from "@/lib/format";
import { AUDIT_LABEL } from "@/lib/labels";
import { adminApi } from "@/services";

const ACTIONS = ["LOGIN", "USER_REGISTERED", "REQUEST_CREATED", "REQUEST_VERIFIED", "REQUEST_REJECTED", "REQUEST_CANCELLED", "MATCH_ACCEPTED", "MATCH_REJECTED", "MATCH_COMPLETED", "ORGANIZATION_VERIFIED", "ORGANIZATION_REJECTED", "ORGANIZATION_SUSPENDED", "USER_SUSPENDED", "USER_ACTIVATED", "REPORT_CREATED", "REPORT_UPDATED", "PASSWORD_RESET", "MATCH_CONTACT_RESULT", "ACCOUNT_EXPORTED", "ACCOUNT_DELETED"];

export default function AdminAudit() {
  const [action, setAction] = useState("");
  const [person, setPerson] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState({ q: "", from: "", to: "" });
  const [page, setPage] = useState(0);
  const dateError = applied.from && applied.to && applied.from > applied.to ? "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc." : "";
  const res = useQuery(dateError ? null : `admin-audit:${action}:${applied.q}:${applied.from}:${applied.to}:${page}`,
    () => adminApi.auditLogs({ action: action || undefined, q: applied.q || undefined, from: applied.from || undefined, to: applied.to || undefined, page, size: 25 }));

  function apply(e: React.KeyboardEvent | React.MouseEvent) {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();
    setApplied({ q: person.trim(), from, to }); setPage(0);
  }
  function reset() { setAction(""); setPerson(""); setFrom(""); setTo(""); setApplied({ q: "", from: "", to: "" }); setPage(0); }
  const filtered = !!(action || applied.q || applied.from || applied.to);

  return (
    <>
      <PageHeader title="Nhật ký hoạt động" description="Ai đã làm gì và khi nào. Mật khẩu, token và thông tin bí mật không bao giờ được ghi lại." />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div><label htmlFor="audit-action" className="mb-1 block text-xs text-muted-foreground">Hành động</label>
          <Select id="audit-action" value={action} onChange={(e) => { setAction(e.target.value); setPage(0); }}><option value="">Tất cả hành động</option>{ACTIONS.map((a) => <option key={a} value={a}>{AUDIT_LABEL[a] ?? a}</option>)}</Select></div>
        <div><label htmlFor="audit-person" className="mb-1 block text-xs text-muted-foreground">Người thực hiện (tên hoặc email)</label>
          <Input id="audit-person" value={person} maxLength={80} placeholder="VD: admin@" onChange={(e) => setPerson(e.target.value)} onKeyDown={apply} /></div>
        <div><label htmlFor="audit-from" className="mb-1 block text-xs text-muted-foreground">Từ ngày</label>
          <Input id="audit-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><label htmlFor="audit-to" className="mb-1 block text-xs text-muted-foreground">Đến ngày</label>
          <Input id="audit-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div className="flex items-end gap-2">
          <Button type="button" onClick={apply}>Lọc</Button>
          {filtered && <Button type="button" variant="outline" onClick={reset}>Xóa lọc</Button>}
        </div>
      </div>
      {dateError && <p role="alert" className="mb-4 text-sm text-destructive">{dateError}</p>}
      {res.initialLoading ? <Skeleton className="h-96" />
        : res.error && !res.data ? <ErrorState message={res.error.message} onRetry={res.reload} />
        : res.data && res.data.items.length === 0 ? <EmptyState title={filtered ? "Không có nhật ký khớp bộ lọc" : "Chưa có nhật ký"} />
        : res.data && (
          <>
            <DataTable caption="Nhật ký hoạt động" rows={res.data.items} rowKey={(r) => r.id} columns={[
              { key: "when", header: "Thời gian", cell: (r) => formatDateTime(r.createdAt) },
              { key: "action", header: "Hành động", cell: (r) => <Pill t="blue">{AUDIT_LABEL[r.action] ?? r.action}</Pill> },
              { key: "user", header: "Người thực hiện", cell: (r) => { const a = actorLabel(r.userName, r.userEmail, r.userId); return <div><p className="font-medium">{a.primary}</p>{a.secondary && <p className="text-xs text-muted-foreground">{a.secondary}</p>}</div>; } },
              { key: "entity", header: "Đối tượng", cell: (r) => <span className="text-xs">{r.entityType ?? "–"}{r.entityId ? ` · ${r.entityId.slice(0, 8)}` : ""}</span> },
              { key: "meta", header: "Chi tiết", cell: (r) => <span className="text-sm text-muted-foreground">{describeAudit(r.metadata) || "–"}</span> },
            ]} />
            <Pagination page={res.data} onChange={setPage} />
          </>
        )}
    </>
  );
}
