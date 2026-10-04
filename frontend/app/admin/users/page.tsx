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
    try { await adminApi.setUserStatus(target.id, action); toast.success(action === "suspend" ? "User suspended" : "User activated"); res.reload(); }
    catch (e) { toast.error(toApiError(e).message); throw e; }
  }

  return (
    <>
      <PageHeader title="Users" description="Search, filter and manage accounts." />
      <form onSubmit={(e) => { e.preventDefault(); setSearch(q); setPage(0); }} className="mb-5 grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]" role="search">
        <Input aria-label="Search users" placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select aria-label="Role" value={role} onChange={(e) => { setRole(e.target.value); setPage(0); }}><option value="">All roles</option><option value="DONOR">Donor</option><option value="REQUESTER">Requester</option><option value="ORGANIZATION">Organization</option><option value="ADMIN">Admin</option></Select>
        <Select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option></Select>
        <Select aria-label="Sort" value={sort} onChange={(e) => { setSort(e.target.value); setPage(0); }}><option value="createdAt:desc">Newest first</option><option value="createdAt:asc">Oldest first</option><option value="fullName:asc">Name A–Z</option><option value="email:asc">Email A–Z</option></Select>
        <Button type="submit" variant="outline"><Search /> Search</Button>
      </form>
      {res.initialLoading ? <Skeleton className="h-96" />
        : res.error && !res.data ? <ErrorState message={res.error.message} onRetry={res.reload} />
        : res.data && res.data.items.length === 0 ? <EmptyState title="No users found" description="Try a different search or filter." />
        : res.data && (
          <>
            <DataTable caption="Users" rows={res.data.items} rowKey={(u) => u.id} columns={[
              { key: "name", header: "Name", cell: (u) => <span className="font-medium">{u.fullName}</span> },
              { key: "email", header: "Email", cell: (u) => u.email },
              { key: "role", header: "Role", cell: (u) => <Pill t="slate">{u.roles.join(", ")}</Pill> },
              { key: "created", header: "Joined", cell: (u) => formatDate(u.createdAt) },
              { key: "status", header: "Status", cell: (u) => <Pill t={u.status === "ACTIVE" ? "green" : "red"}>{u.status === "ACTIVE" ? "Active" : "Suspended"}</Pill> },
              { key: "act", header: "Action", align: "right", cell: (u) => u.roles.includes("ADMIN") ? <span className="text-xs text-muted-foreground">Protected</span> : <Button size="sm" variant="outline" onClick={() => setTarget(u)}>{u.status === "ACTIVE" ? "Suspend" : "Activate"}</Button> },
            ]} />
            <Pagination page={res.data} onChange={setPage} />
          </>
        )}
      <ConfirmDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)} title={target?.status === "ACTIVE" ? "Suspend this user?" : "Activate this user?"} description={target?.status === "ACTIVE" ? `${target?.fullName} will be signed out of every request and will no longer be matched or able to log in.` : `${target?.fullName} will be able to log in again.`} confirmLabel={target?.status === "ACTIVE" ? "Suspend" : "Activate"} destructive={target?.status === "ACTIVE"} onConfirm={toggle} />
    </>
  );
}
