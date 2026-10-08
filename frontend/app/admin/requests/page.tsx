"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/page-header";
import { BloodChip, StatusBadge, UrgencyBadge } from "@/components/ui/badges";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Countdown } from "@/components/ui/countdown";
import { DataTable } from "@/components/ui/data-table";
import { Input, Select } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { toApiError } from "@/lib/api";
import { STATUS_LABEL } from "@/lib/format";
import { adminApi } from "@/services";
import { BLOOD_TYPES, type AdminRequestRow } from "@/types/domain";

type Action = { row: AdminRequestRow; kind: "verify" | "reject" | "cancel" } | null;

export default function AdminRequests() {
  const [urgency, setUrgency] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [page, setPage] = useState(0);
  const [action, setAction] = useState<Action>(null);
  const res = useQuery(`admin-req:${urgency}:${bloodType}:${status}:${city}:${page}`, () => adminApi.requests({ urgency: urgency || undefined, bloodType: bloodType || undefined, status: status || undefined, city: city || undefined, page, size: 15 }));

  async function run(note: string) {
    if (!action) return;
    try { await adminApi.requestAction(action.row.request.id, action.kind, note || undefined); toast.success(action.kind === "verify" ? "Đã xác minh yêu cầu. Hệ thống bắt đầu tìm người hiến máu." : action.kind === "reject" ? "Đã từ chối yêu cầu" : "Đã hủy yêu cầu"); res.reload(); }
    catch (e) { toast.error(toApiError(e).message); throw e; }
  }
  const reset = (fn: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => { fn(e.target.value); setPage(0); };

  return (
    <>
      <PageHeader title="Yêu cầu" description="Xác minh yêu cầu mới và theo dõi việc điều phối." />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select aria-label="Mức độ khẩn cấp" value={urgency} onChange={reset(setUrgency)}><option value="">Mọi mức độ</option><option value="CRITICAL">NGUY KỊCH</option><option value="URGENT">KHẨN</option><option value="NORMAL">BÌNH THƯỜNG</option></Select>
        <Select aria-label="Nhóm máu" value={bloodType} onChange={reset(setBloodType)}><option value="">Tất cả nhóm máu</option>{BLOOD_TYPES.map((b) => <option key={b}>{b}</option>)}</Select>
        <Select aria-label="Trạng thái" value={status} onChange={reset(setStatus)}><option value="">Tất cả trạng thái</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <Input aria-label="Thành phố" placeholder="Thành phố" value={city} onChange={reset(setCity)} />
      </div>
      {res.initialLoading ? <Skeleton className="h-96" />
        : res.error && !res.data ? <ErrorState message={res.error.message} onRetry={res.reload} />
        : res.data && res.data.items.length === 0 ? <EmptyState title="Không có yêu cầu phù hợp" description="Thử bỏ bớt bộ lọc." />
        : res.data && (
          <>
            <DataTable caption="Yêu cầu máu" rows={res.data.items} rowKey={(r) => r.request.id} columns={[
              { key: "bt", header: "Nhóm máu", cell: (r) => <BloodChip type={r.request.bloodType} /> },
              { key: "urg", header: "Mức độ khẩn cấp", cell: (r) => <UrgencyBadge urgency={r.request.urgency} /> },
              { key: "hos", header: "Địa điểm", cell: (r) => <div><p className="font-medium">{r.request.hospitalName}</p><p className="text-xs text-muted-foreground">bởi {r.requesterName ?? "–"}</p></div> },
              { key: "units", header: "Đã xác nhận", align: "right", cell: (r) => <span className="tabular-nums">{r.request.unitsConfirmed} / {r.request.unitsRequired}</span> },
              { key: "left", header: "Còn lại", cell: (r) => ["FULFILLED", "CANCELLED", "EXPIRED"].includes(r.request.status) ? "–" : <Countdown deadline={r.request.deadline} /> },
              { key: "st", header: "Trạng thái", cell: (r) => <StatusBadge status={r.request.status} /> },
              { key: "act", header: "Thao tác", align: "right", cell: (r) => (
                <div className="flex justify-end gap-2">
                  <Link href={`/admin/requests/${r.request.id}`} className={buttonVariants({ size: "sm", variant: "ghost" })}>Xem</Link>
                  {r.request.status === "PENDING_VERIFICATION" && <><Button size="sm" onClick={() => setAction({ row: r, kind: "verify" })}>Xác minh</Button><Button size="sm" variant="outline" onClick={() => setAction({ row: r, kind: "reject" })}>Từ chối</Button></>}
                  {["VERIFIED", "MATCHING", "DONORS_CONTACTED", "PARTIALLY_FULFILLED"].includes(r.request.status) && <Button size="sm" variant="outline" onClick={() => setAction({ row: r, kind: "cancel" })}>Hủy</Button>}
                </div>
              ) },
            ]} />
            <Pagination page={res.data} onChange={setPage} />
          </>
        )}
      <ConfirmDialog
        open={!!action} onOpenChange={(o) => !o && setAction(null)}
        title={action?.kind === "verify" ? "Xác minh yêu cầu này?" : action?.kind === "reject" ? "Từ chối yêu cầu này?" : "Hủy yêu cầu này?"}
        description={action?.kind === "verify" ? "Hệ thống sẽ bắt đầu tìm ngay và liên hệ những người hiến máu ở gần." : action?.kind === "reject" ? "Người tạo yêu cầu sẽ được báo là yêu cầu không được chấp thuận." : "Những người hiến máu đã được liên hệ hoặc đã nhận lời sẽ được thông báo."}
        confirmLabel={action?.kind === "verify" ? "Xác minh và bắt đầu tìm người hiến" : action?.kind === "reject" ? "Từ chối" : "Hủy yêu cầu"}
        destructive={action?.kind !== "verify"}
        reasonLabel={action?.kind === "verify" ? undefined : "Lý do"} reasonRequired={action?.kind === "reject"}
        onConfirm={run}
      />
    </>
  );
}
