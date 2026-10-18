"use client";

import { Droplets } from "lucide-react";

import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill } from "@/components/ui/badges";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { formatDateTime } from "@/lib/format";
import { adminApi } from "@/services";

export default function AdminInventory() {
  const q = useQuery("admin-inventory", adminApi.inventory);
  const d = q.data;
  const totalUnits = d?.byBloodType.reduce((s, t) => s + t.units, 0) ?? 0;
  const lowTypes = d?.byBloodType.filter((t) => t.lowFacilities > 0) ?? [];
  return (
    <>
      <PageHeader title="Kho máu toàn hệ thống" description="Tổng hợp từ kho của các cơ sở y tế. Admin chỉ xem; việc nhập, xuất và điều chỉnh do từng cơ sở thực hiện." />
      {q.initialLoading ? <Skeleton className="h-96" />
        : q.error && !d ? <ErrorState message={q.error.message} onRetry={q.reload} />
        : d && d.byBloodType.length === 0 ? <EmptyState title="Chưa có dữ liệu kho máu" description="Các cơ sở chưa khai báo kho." />
        : d && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Tổng số đơn vị" value={totalUnits} icon={Droplets} accent />
              <StatCard label="Nhóm máu đang thấp" value={lowTypes.length} hint={lowTypes.length ? lowTypes.map((t) => t.bloodType).join(", ") : "Không có"} />
            </div>
            <Card className="mt-6"><CardHeader><CardTitle>Theo nhóm máu</CardTitle></CardHeader><CardContent>
              <DataTable caption="Kho máu theo nhóm máu" rows={d.byBloodType} rowKey={(r) => r.bloodType} columns={[
                { key: "t", header: "Nhóm máu", cell: (r) => <span className="font-semibold">{r.bloodType}</span> },
                { key: "u", header: "Số đơn vị", cell: (r) => r.units },
                { key: "f", header: "Số cơ sở có kho", cell: (r) => r.facilities },
                { key: "l", header: "Cơ sở đang ở mức thấp", cell: (r) => r.lowFacilities > 0 ? <Pill t="red">{r.lowFacilities}/{r.facilities}</Pill> : <Pill t="green">Ổn</Pill> },
              ]} />
            </CardContent></Card>
            <Card className="mt-6"><CardHeader><CardTitle>Theo cơ sở (cơ sở thiếu nhiều nhóm máu xếp trước)</CardTitle></CardHeader><CardContent>
              <DataTable caption="Kho máu theo cơ sở" rows={d.byOrganization} rowKey={(r) => r.organizationId} columns={[
                { key: "n", header: "Cơ sở", cell: (r) => <div><p className="font-medium">{r.name}</p>{r.city && <p className="text-xs text-muted-foreground">{r.city}</p>}</div> },
                { key: "u", header: "Tổng đơn vị", cell: (r) => r.totalUnits },
                { key: "l", header: "Nhóm máu thấp", cell: (r) => r.lowTypes > 0 ? <Pill t="amber">{r.lowTypes} nhóm</Pill> : <Pill t="green">Ổn</Pill> },
                { key: "t", header: "Cập nhật", cell: (r) => <span className="text-xs text-muted-foreground">{formatDateTime(r.updatedAt)}</span> },
              ]} />
            </CardContent></Card>
          </>
        )}
    </>
  );
}
