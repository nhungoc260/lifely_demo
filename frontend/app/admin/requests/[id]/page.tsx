"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/page-header";
import { BloodChip, MatchBadge, StatusBadge, UrgencyBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Countdown } from "@/components/ui/countdown";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { toApiError } from "@/lib/api";
import { formatDateTime, STATUS_LABEL } from "@/lib/format";
import { adminApi, requestApi } from "@/services";

export default function AdminRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const q = useQuery(`admin-req:${id}`, () => adminApi.request(id));
  const hist = useQuery(`admin-req-hist:${id}`, () => adminApi.requestHistory(id));
  const matches = useQuery(`admin-req-matches:${id}`, () => requestApi.matches(id));
  const [action, setAction] = useState<"verify" | "reject" | "cancel" | null>(null);
  const row = q.data;
  const r = row?.request;

  async function run(note: string) {
    if (!action) return;
    try {
      await adminApi.requestAction(id, action, note || undefined);
      toast.success(action === "verify" ? "Đã xác minh yêu cầu. Hệ thống bắt đầu tìm người hiến máu." : action === "reject" ? "Đã từ chối yêu cầu" : "Đã hủy yêu cầu");
      q.reload(); hist.reload(); matches.reload();
    } catch (e) { toast.error(toApiError(e).message); throw e; }
  }

  return (
    <>
      <Link href="/admin/requests" className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Yêu cầu</Link>
      {q.initialLoading ? <Skeleton className="h-96" />
        : q.error && !r ? <ErrorState message={q.error.message} onRetry={q.reload} />
        : r && row ? (
          <div className="space-y-6">
            <PageHeader title={`${r.bloodType} · ${r.unitsRequired} đơn vị`} description={r.hospitalName}
              actions={<>
                {r.status === "PENDING_VERIFICATION" && <><Button onClick={() => setAction("verify")}>Xác minh</Button><Button variant="outline" onClick={() => setAction("reject")}>Từ chối</Button></>}
                {["VERIFIED", "MATCHING", "DONORS_CONTACTED", "PARTIALLY_FULFILLED"].includes(r.status) && <Button variant="outline" onClick={() => setAction("cancel")}>Hủy yêu cầu</Button>}
              </>} />
            <Card className="p-6">
              <div className="flex flex-wrap items-center gap-2"><BloodChip type={r.bloodType} /><UrgencyBadge urgency={r.urgency} /><StatusBadge status={r.status} /></div>
              <div className="mt-5 flex items-center gap-4"><ProgressBar className="flex-1" value={r.unitsConfirmed} max={r.unitsRequired} label="Người hiến máu đã xác nhận" /><span className="tabular-nums">{r.unitsConfirmed} / {r.unitsRequired}</span></div>
              <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div><dt className="text-muted-foreground">Người tạo yêu cầu</dt><dd className="font-medium">{row.requesterName ?? "–"}</dd><dd className="text-muted-foreground">{row.requesterEmail}</dd></div>
                <div><dt className="text-muted-foreground">Địa điểm</dt><dd className="font-medium">{r.hospitalName}</dd><dd className="text-muted-foreground">{[r.district, r.city].filter(Boolean).join(", ")}</dd></div>
                <div><dt className="text-muted-foreground">Hạn chót</dt><dd className="font-medium">{formatDateTime(r.deadline)}</dd>{!["FULFILLED", "CANCELLED", "EXPIRED"].includes(r.status) && <dd><Countdown deadline={r.deadline} /></dd>}</div>
                <div><dt className="text-muted-foreground">SĐT liên hệ</dt><dd className="font-medium">{r.contactPhone}</dd></div>
                <div><dt className="text-muted-foreground">Đã xác minh</dt><dd className="font-medium">{r.verified ? "Có" : "Không"}{r.organizationId ? "· liên kết với tổ chức đã xác minh" : ""}</dd></div>
                <div><dt className="text-muted-foreground">Cấp tìm kiếm</dt><dd className="font-medium">{r.escalationLevel} trên 5</dd></div>
                {r.description && <div className="sm:col-span-2 lg:col-span-3"><dt className="text-muted-foreground">Mô tả</dt><dd className="whitespace-pre-wrap">{r.description}</dd></div>}
                {r.cancelReason && <div className="sm:col-span-2 lg:col-span-3"><dt className="text-muted-foreground">Lý do hủy / từ chối</dt><dd>{r.cancelReason}</dd></div>}
              </dl>
            </Card>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Người hiến máu được kết nối ({matches.data?.length ?? 0})</CardTitle></CardHeader>
                <CardContent>
                  {matches.data && matches.data.length > 0 ? (
                    <ul className="divide-y divide-border text-sm">{matches.data.map((m) => (
                      <li key={m.matchId} className="flex items-center justify-between gap-3 py-2.5"><span><span className="font-medium">{m.donorName ?? m.label}</span><span className="block text-xs text-muted-foreground">{m.distanceKm.toFixed(1)} km · {Math.round(m.matchingScore)}%</span></span><MatchBadge status={m.status} /></li>
                    ))}</ul>
                  ) : <p className="text-sm text-muted-foreground">Chưa liên hệ người hiến máu nào.</p>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Hoạt động</CardTitle></CardHeader>
                <CardContent>
                  {hist.data && hist.data.length > 0 ? (
                    <ol className="relative space-y-4 border-l border-border pl-6">{[...hist.data].reverse().map((h, i) => (
                      <li key={`${h.createdAt}-${i}`} className="relative"><span className="absolute -left-[29px] top-1.5 size-2.5 rounded-full bg-primary" aria-hidden /><p className="text-sm font-medium">{h.note ?? STATUS_LABEL[h.toStatus]}</p><time dateTime={h.createdAt} className="text-xs text-muted-foreground">{formatDateTime(h.createdAt)}</time></li>
                    ))}</ol>
                  ) : <p className="text-sm text-muted-foreground">Chưa có hoạt động.</p>}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      <ConfirmDialog open={!!action} onOpenChange={(o) => !o && setAction(null)}
        title={action === "verify" ? "Xác minh yêu cầu này?" : action === "reject" ? "Từ chối yêu cầu này?" : "Hủy yêu cầu này?"}
        description={action === "verify" ? "Hệ thống sẽ bắt đầu tìm ngay và liên hệ những người hiến máu ở gần." : action === "reject" ? "Người tạo yêu cầu sẽ được báo là yêu cầu không được chấp thuận." : "Những người hiến máu đã được liên hệ hoặc đã nhận lời sẽ được thông báo."}
        confirmLabel={action === "verify" ? "Xác minh và bắt đầu tìm người hiến" : action === "reject" ? "Từ chối" : "Hủy yêu cầu"} destructive={action !== "verify"}
        reasonLabel={action === "verify" ? undefined : "Lý do"} reasonRequired={action === "reject"} onConfirm={run} />
    </>
  );
}
