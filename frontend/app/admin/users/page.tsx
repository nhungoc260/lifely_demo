"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/page-header";
import { Pill } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { Input, Select } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { toApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/labels";
import { adminApi } from "@/services";
import type { AdminUser } from "@/types/domain";

export default function AdminUsers() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("createdAt:desc");
  const [page, setPage] = useState(0);
  const [target, setTarget] = useState<AdminUser | null>(null);
  const [field, dir] = sort.split(":");
  const res = useQuery(`admin-users:${search}:${role}:${status}:${sort}:${page}`, () => adminApi.users({ q: search || undefined, role: role || undefined, status: status || undefined, sort: field, dir, page, size: 15 }));

  async function toggle() {
    if (!target) return;
    const action = target.status === "ACTIVE" ? "suspend" : "activate";
    try { await adminApi.setUserStatus(target.id, action); toast.success(action === "suspend" ? "Đã khóa người dùng" : "Đã kích hoạt người dùng"); res.reload(); }
    catch (e) { toast.error(toApiError(e).message); throw e; }
  }

  return (
    <>
      <PageHeader title="Người dùng" description="Tìm kiếm, lọc và quản lý tài khoản." />
      <form onSubmit={(e) => { e.preventDefault(); setSearch(q); setPage(0); }} className="mb-5 grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]" role="search">
        <Input aria-label="Tìm người dùng" placeholder="Tìm theo tên hoặc email" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select aria-label="Vai trò" value={role} onChange={(e) => { setRole(e.target.value); setPage(0); }}><option value="">Tất cả vai trò</option><option value="DONOR">Người hiến máu</option><option value="REQUESTER">Người cần máu</option><option value="ORGANIZATION">Tổ chức</option><option value="ADMIN">Quản trị viên</option></Select>
        <Select aria-label="Trạng thái" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}><option value="">Tất cả trạng thái</option><option value="ACTIVE">Hoạt động</option><option value="SUSPENDED">Tạm khóa</option></Select>
        <Select aria-label="Sắp xếp" value={sort} onChange={(e) => { setSort(e.target.value); setPage(0); }}><option value="createdAt:desc">Mới nhất trước</option><option value="createdAt:asc">Cũ nhất trước</option><option value="fullName:asc">Tên A–Z</option><option value="email:asc">Email A–Z</option></Select>
        <Button type="submit" variant="outline"><Search /> Tìm kiếm</Button>
      </form>
      {res.initialLoading ? <Skeleton className="h-96" />
        : res.error && !res.data ? <ErrorState message={res.error.message} onRetry={res.reload} />
        : res.data && res.data.items.length === 0 ? <EmptyState title="Không tìm thấy người dùng" description="Thử từ khóa hoặc bộ lọc khác." />
        : res.data && (
          <>
            <DataTable caption="Người dùng" rows={res.data.items} rowKey={(u) => u.id} columns={[
              { key: "name", header: "Tên", cell: (u) => <span className="font-medium">{u.fullName}</span> },
              { key: "email", header: "Email", cell: (u) => u.email },
              { key: "role", header: "Vai trò", cell: (u) => <Pill t="slate">{u.roles.map((r) => ROLE_LABEL[r]).join(", ")}</Pill> },
              { key: "created", header: "Ngày tham gia", cell: (u) => <span className="whitespace-nowrap">{formatDate(u.createdAt)}</span> },
              { key: "status", header: "Trạng thái", cell: (u) => <Pill t={u.status === "ACTIVE" ? "green" : "red"} className="min-w-[5.5rem]">{u.status === "ACTIVE" ? "Hoạt động" : "Tạm khóa"}</Pill> },
              { key: "act", header: "Hành động", align: "right", cell: (u) => u.roles.includes("ADMIN") ? <span className="text-xs text-muted-foreground">Được bảo vệ</span> : <Button size="sm" variant="outline" className="min-w-[5.5rem] whitespace-nowrap" onClick={() => setTarget(u)}>{u.status === "ACTIVE" ? "Tạm khóa" : "Kích hoạt"}</Button> },
            ]} />
            <Pagination page={res.data} onChange={setPage} />
          </>
        )}
      <ConfirmDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)} title={target?.status === "ACTIVE" ? "Khóa người dùng này?" : "Kích hoạt người dùng này?"} description={target?.status === "ACTIVE" ? `${target?.fullName} sẽ không còn được kết nối với yêu cầu nào và không thể đăng nhập.` : `${target?.fullName} sẽ có thể đăng nhập lại.`} confirmLabel={target?.status === "ACTIVE" ? "Tạm khóa" : "Kích hoạt"} destructive={target?.status === "ACTIVE"} onConfirm={toggle} />
    </>
  );
}
