"use client";

import { ChevronDown, Droplets } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill } from "@/components/ui/badges";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { formatDateTime } from "@/lib/format";
import { cellsOfType, isLowStock, lowCellsOf } from "@/lib/inventory";
import { cn } from "@/lib/utils";
import { adminApi } from "@/services";

/** Một dòng bấm để mở/đóng chi tiết. */
function Expandable({ id, open, onToggle, summary, children }: { id: string; open: boolean; onToggle: () => void; summary: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="border-b border-border last:border-0">
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={id}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]">
        <div className="min-w-0 flex-1">{summary}</div>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && <div id={id} className="bg-muted/30 px-4 pb-4 pt-1">{children}</div>}
    </li>
  );
}

export default function AdminInventory() {
  const q = useQuery("admin-inventory", adminApi.inventory);
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (key: string) => setOpen((o) => (o === key ? null : key));
  const d = q.data;
  const totalUnits = d?.byBloodType.reduce((s, t) => s + t.units, 0) ?? 0;
  const lowTypes = d?.byBloodType.filter((t) => t.lowFacilities > 0) ?? [];
  const orgName = (id: string) => d?.byOrganization.find((o) => o.organizationId === id)?.name ?? "Cơ sở";

  return (
    <>
      <PageHeader title="Kho máu toàn hệ thống" description="Bấm vào một nhóm máu để xem từng cơ sở đang giữ bao nhiêu, hoặc bấm vào một cơ sở để xem đủ các nhóm máu. Admin chỉ xem; việc nhập, xuất và điều chỉnh do từng cơ sở thực hiện." />
      {q.initialLoading ? <Skeleton className="h-96" />
        : q.error && !d ? <ErrorState message={q.error.message} onRetry={q.reload} />
        : d && d.byBloodType.length === 0 ? <EmptyState title="Chưa có dữ liệu kho máu" description="Các cơ sở chưa khai báo kho." />
        : d && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Tổng số đơn vị" value={totalUnits} icon={Droplets} accent />
              <StatCard label="Nhóm máu đang thấp" value={lowTypes.length} hint={lowTypes.length ? "Xem chi tiết ở bảng bên dưới" : "Không có"} />
            </div>
            {lowTypes.length > 0 && (
              <Card className="mt-6 border-warning/40 bg-warning/5 p-5">
                <p className="font-medium">Nhóm máu đang thấp</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {lowTypes.map((t) => <li key={t.bloodType}><span className="font-semibold">{t.bloodType}</span>: thấp ở {t.lowFacilities}/{t.facilities} cơ sở, tổng {t.units} đơn vị. <button type="button" className="font-medium text-primary hover:underline" onClick={() => { setOpen(`type:${t.bloodType}`); document.getElementById("kho-theo-nhom")?.scrollIntoView({ behavior: "smooth" }); }}>Xem từng cơ sở</button></li>)}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">Một ô kho gọi là thấp khi số đơn vị nhỏ hơn hoặc bằng ngưỡng cảnh báo mà cơ sở đặt cho nhóm máu đó.</p>
              </Card>
            )}
            <Card id="kho-theo-nhom" className="mt-6"><CardHeader><CardTitle>Theo nhóm máu (bấm để xem từng cơ sở)</CardTitle></CardHeader><CardContent className="px-0">
              <ul>
                {d.byBloodType.map((t) => {
                  const key = `type:${t.bloodType}`;
                  return (
                    <Expandable key={key} id={`panel-${key}`} open={open === key} onToggle={() => toggle(key)} summary={
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                        <span className="w-12 text-base font-semibold">{t.bloodType}</span>
                        <span className="text-sm">{t.units} đơn vị</span>
                        <span className="text-sm text-muted-foreground">{t.facilities} cơ sở có kho</span>
                        {t.lowFacilities > 0 ? <Pill t="red">Thấp ở {t.lowFacilities}/{t.facilities} cơ sở</Pill> : <Pill t="green">Ổn</Pill>}
                      </div>
                    }>
                      <ul className="divide-y divide-border text-sm">
                        {cellsOfType(d.cells, t.bloodType).map((c) => (
                          <li key={c.organizationId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                            <span className="font-medium">{orgName(c.organizationId)}</span>
                            <span className="flex items-center gap-3"><span className="tabular-nums">{c.units} đơn vị <span className="text-xs text-muted-foreground">(ngưỡng {c.lowThreshold})</span></span>{isLowStock(c) ? <Pill t="red">Thấp</Pill> : <Pill t="green">Ổn</Pill>}</span>
                          </li>
                        ))}
                      </ul>
                    </Expandable>
                  );
                })}
              </ul>
            </CardContent></Card>
            <Card className="mt-6"><CardHeader><CardTitle>Theo cơ sở (bấm để xem đủ các nhóm máu)</CardTitle></CardHeader><CardContent className="px-0">
              <ul>
                {d.byOrganization.map((o) => {
                  const key = `org:${o.organizationId}`;
                  const low = lowCellsOf(d.cells, o.organizationId);
                  return (
                    <Expandable key={key} id={`panel-${key}`} open={open === key} onToggle={() => toggle(key)} summary={
                      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
                        <div><p className="font-medium">{o.name}</p>{o.city && <p className="text-xs text-muted-foreground">{o.city}</p>}</div>
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <span className="tabular-nums">{o.totalUnits} đơn vị</span>
                          {low.length > 0 ? <Pill t="amber">Thấp: {low.map((c) => `${c.bloodType} (${c.units})`).join(", ")}</Pill> : <Pill t="green">Ổn</Pill>}
                          <span className="text-xs text-muted-foreground">Cập nhật {formatDateTime(o.updatedAt)}</span>
                        </div>
                      </div>
                    }>
                      <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        {d.cells.filter((c) => c.organizationId === o.organizationId).map((c) => (
                          <li key={c.bloodType} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
                            <span className="font-semibold">{c.bloodType}</span>
                            <span className="flex items-center gap-2"><span className="tabular-nums">{c.units}</span>{isLowStock(c) ? <Pill t="red">Thấp</Pill> : <Pill t="green">Ổn</Pill>}</span>
                          </li>
                        ))}
                      </ul>
                    </Expandable>
                  );
                })}
              </ul>
            </CardContent></Card>
          </>
        )}
    </>
  );
}
