"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/page-header";
import { Pill } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { toApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { REPORT_REASON_LABEL, REPORT_STATUS_LABEL, ROLE_LABEL, URGENCY_LABEL } from "@/lib/labels";
import { adminApi } from "@/services";

/** Chi tiết người dùng cho admin: thông tin tài khoản, trạng thái, báo cáo vi phạm nhắm vào người này và các yêu cầu họ đã tạo. */
export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const user = useQuery(`admin-user:${id}`, () => adminApi.user(id));
  const reports = useQuery("admin-user-reports", () => adminApi.reports({ size: 100 }));
  const requests = useQuery(user.data ? "admin-user-requests" : null, () => adminApi.requests({ size: 100 }));
  const [confirm, setConfirm] = useState(false);

  const u = user.data;
  const mine = (reports.data?.items ?? []).filter((r) => r.targetType === "USER" && r.targetId === id);
  const created = (requests.data?.items ?? []).filter((r) => !!u && r.requesterEmail === u.email);
  const protectedAdmin = !!u && u.roles.includes("ADMIN");

  async function toggle() {
    if (!u) return;
    const action = u.status === "ACTIVE" ? "suspend" : "activate";
    try {
      const next = await adminApi.setUserStatus(u.id, action);
      user.mutate(() => next);
      toast.success(action === "suspend" ? "Đã khóa người dùng" : "Đã kích hoạt người dùng");
    } catch (e) { toast.error(toApiError(e).message); }
  }

  return (
    <>
      <Link href="/admin/users" className="press mb-3 inline-flex items-center gap-1 text-sm font-medium text-primary"><ChevronLeft className="size-4" aria-hidden />Danh sách người dùng</Link>
      <PageHeader title={u?.fullName ?? "Chi tiết người dùng"} description={u?.email} />
      {user.error && !u ? <ErrorState message={user.error.message} onRetry={user.reload} /> : !u ? <Skeleton className="h-48" /> : (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Tài khoản</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {([["Họ tên", u.fullName], ["Email", u.email], ["Số điện thoại", u.phone || "–"], ["Ngày tham gia", formatDate(u.createdAt)]] as const).map(([k, v]) => (
                <div key={k} className="flex gap-4"><span className="w-32 shrink-0 text-muted-foreground">{k}</span><span className="min-w-0 flex-1 break-words font-medium">{v}</span></div>
              ))}
              <div className="flex gap-4"><span className="w-32 shrink-0 text-muted-foreground">Vai trò</span><span className="flex flex-wrap gap-1.5">{u.roles.map((r) => <Pill key={r} t="slate">{ROLE_LABEL[r]}</Pill>)}</span></div>
              <div className="flex items-center gap-4"><span className="w-32 shrink-0 text-muted-foreground">Trạng thái</span><Pill t={u.status === "ACTIVE" ? "green" : "red"}>{u.status === "ACTIVE" ? "Hoạt động" : "Tạm khóa"}</Pill></div>
              <div className="pt-2">{protectedAdmin ? <span className="text-xs text-muted-foreground">Tài khoản quản trị được bảo vệ.</span>
                : <Button variant="outline" size="sm" onClick={() => setConfirm(true)}>{u.status === "ACTIVE" ? "Tạm khóa" : "Kích hoạt"}</Button>}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Báo cáo vi phạm nhắm vào người này ({mine.length})</CardTitle></CardHeader>
            <CardContent>
              {mine.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có báo cáo nào.</p> : (
                <ul className="divide-y divide-border text-sm">{mine.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2.5"><span><span className="font-medium">{REPORT_REASON_LABEL[r.reason] ?? r.reason}</span><span className="block text-xs text-muted-foreground">{formatDate(r.createdAt)}</span></span><Pill t="slate">{REPORT_STATUS_LABEL[r.status] ?? r.status}</Pill></li>
                ))}</ul>
              )}
              <Link href="/admin/reports" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">Mở trang báo cáo</Link>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Yêu cầu máu đã tạo ({created.length})</CardTitle></CardHeader>
            <CardContent>
              {created.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có yêu cầu nào trong 100 yêu cầu gần nhất.</p> : (
                <ul className="divide-y divide-border text-sm">{created.slice(0, 10).map((r) => (
                  <li key={r.request.id}><Link href={`/admin/requests/${r.request.id}`} className="press flex items-center justify-between gap-3 py-2.5"><span><span className="font-medium">{r.request.bloodType} · {r.request.hospitalName}</span><span className="block text-xs text-muted-foreground">{formatDate(r.request.createdAt)} · {URGENCY_LABEL[r.request.urgency]}</span></span><span className="text-xs text-muted-foreground">{r.request.unitsReceived}/{r.request.unitsRequired} đơn vị</span></Link></li>
                ))}</ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={u?.status === "ACTIVE" ? "Khóa người dùng này?" : "Kích hoạt người dùng này?"}
        description={u?.status === "ACTIVE" ? `${u?.fullName} sẽ không còn được kết nối với yêu cầu nào và không thể đăng nhập.` : `${u?.fullName} sẽ có thể đăng nhập lại.`}
        confirmLabel={u?.status === "ACTIVE" ? "Tạm khóa" : "Kích hoạt"} destructive={u?.status === "ACTIVE"} onConfirm={toggle} />
    </>
  );
}
