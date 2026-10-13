"use client";

import { UserMinus, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { toApiError } from "@/lib/api";
import { orgApi } from "@/services";

export default function OrganizationStaff() {
  const me = useQuery("org-me", orgApi.me);
  const res = useQuery(me.data ? "org-staff" : null, orgApi.staff);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const data = res.data;

  async function add() {
    if (!email.trim()) return;
    setBusy(true);
    try {
      const next = await orgApi.addStaff(email.trim());
      res.mutate(() => next);
      setEmail("");
      toast.success("Đã thêm nhân viên");
    } catch (e) {
      toast.error(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(userId: string, name: string) {
    if (!window.confirm(`Gỡ ${name} khỏi tổ chức? Tài khoản này sẽ không còn xem được yêu cầu của cơ sở.`)) return;
    setBusy(true);
    try {
      const next = await orgApi.removeStaff(userId);
      res.mutate(() => next);
      toast.success("Đã gỡ nhân viên");
    } catch (e) {
      toast.error(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Nhân viên"
        description="Những tài khoản cùng quản lý yêu cầu, kho máu và xác nhận hiến máu của cơ sở."
      />
      {me.data === null ? <ErrorState message="Hãy hoàn tất hồ sơ tổ chức trước." />
        : res.error && !res.data ? <ErrorState message={res.error.message} onRetry={res.reload} />
        : res.initialLoading || !data ? <Skeleton className="h-60" />
        : (
          <>
            <Card className="divide-y">
              {data.members.map((m) => (
                <div key={m.userId} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{m.fullName}</p>
                    <p className="truncate text-sm text-muted-foreground">{m.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">{m.role === "OWNER" ? "Chủ tài khoản" : "Nhân viên"}</span>
                    {data.owner && m.role === "STAFF" && (
                      <Button variant="outline" size="sm" disabled={busy} onClick={() => remove(m.userId, m.fullName)}><UserMinus /> Gỡ</Button>
                    )}
                  </div>
                </div>
              ))}
            </Card>

            {data.owner ? (
              <Card className="mt-6 p-5">
                <h2 className="font-semibold">Thêm nhân viên</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Nhân viên cần đăng ký tài khoản với vai trò <b>Tổ chức</b> trước, sau đó nhập email của họ ở đây. Mỗi tổ chức có tối đa 10 nhân viên.
                  Nhân viên xem và tạo yêu cầu, quản lý kho máu, xác nhận hiến máu; chỉ chủ tài khoản được sửa hồ sơ và thêm hoặc gỡ nhân viên.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Input type="email" placeholder="email-nhan-vien@example.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void add(); }} aria-label="Email nhân viên" />
                  <Button onClick={add} disabled={busy || !email.trim()} className="shrink-0"><UserPlus /> Thêm</Button>
                </div>
              </Card>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">Chỉ chủ tài khoản mới thêm hoặc gỡ được nhân viên.</p>
            )}
          </>
        )}
    </>
  );
}
