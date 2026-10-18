"use client";

import { Building2, ChevronDown, Droplets, TriangleAlert } from "lucide-react";
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

/** Thanh tỉ lệ nhỏ: dùng chung cho ô nhóm máu và danh sách cơ sở. */
function Bar({ value, max, low }: { value: number; max: number; low?: boolean }) {
  const pct = max > 0 ? Math.max(3, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
      <div className={cn("h-full rounded-full transition-all", low ? "bg-critical" : "bg-primary/70")} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Một dòng bấm để mở/đóng chi tiết. */
function Expandable({ id, open, onToggle, summary, children }: { id: string; open: boolean; onToggle: () => void; summary: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="border-b border-border last:border-0">
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={id}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]">
        <div className="min-w-0 flex-1">{summary}</div>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && <div id={id} className="bg-muted/30 px-5 pb-5 pt-3">{children}</div>}
    </li>
  );
}

export default function AdminInventory() {
  const q = useQuery("admin-inventory", adminApi.inventory);
  const [picked, setPicked] = useState<string | null>(null);
  const [openOrg, setOpenOrg] = useState<string | null>(null);
  const d = q.data;
  const totalUnits = d?.byBloodType.reduce((s, t) => s + t.units, 0) ?? 0;
  const maxUnits = d ? Math.max(...d.byBloodType.map((t) => t.units), 1) : 1;
  const lowTypes = d?.byBloodType.filter((t) => t.lowFacilities > 0) ?? [];
  const orgName = (id: string) => d?.byOrganization.find((o) => o.organizationId === id)?.name ?? "Cơ sở";
  // Mặc định mở nhóm máu đang thấp nhiều nhất để admin thấy ngay chỗ cần chú ý.
  const selected = d ? (picked ?? lowTypes[0]?.bloodType ?? d.byBloodType[0]?.bloodType ?? null) : null;
  const selectedType = d?.byBloodType.find((t) => t.bloodType === selected);

  return (
    <>
      <PageHeader title="Kho máu toàn hệ thống" description="Chọn một nhóm máu để xem từng cơ sở đang giữ bao nhiêu, hoặc mở một cơ sở để xem đủ các nhóm máu. Admin chỉ xem; việc nhập, xuất và điều chỉnh do từng cơ sở thực hiện." />
      {q.initialLoading ? <Skeleton className="h-96" />
        : q.error && !d ? <ErrorState message={q.error.message} onRetry={q.reload} />
        : d && d.byBloodType.length === 0 ? <EmptyState title="Chưa có dữ liệu kho máu" description="Các cơ sở chưa khai báo kho." />
        : d && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label="Tổng số đơn vị" value={totalUnits.toLocaleString("vi-VN")} icon={Droplets} accent />
              <StatCard label="Cơ sở có kho" value={d.byOrganization.length} icon={Building2} />
              <Card className={cn("p-5", lowTypes.length > 0 && "border-critical/30")}>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Nhóm máu đang thấp</p>
                  <TriangleAlert className={cn("size-4", lowTypes.length ? "text-critical" : "text-muted-foreground")} aria-hidden />
                </div>
                <p className={cn("mt-2 text-3xl font-semibold tabular-nums tracking-tight", lowTypes.length > 0 && "text-critical")}>{lowTypes.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">{lowTypes.length ? lowTypes.map((t) => t.bloodType).join(", ") : "Tất cả nhóm máu đều ổn"}</p>
              </Card>
            </div>

            <Card className="mt-6">
              <CardHeader>
                <div>
                  <CardTitle>Theo nhóm máu</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">Một ô kho được tính là thấp khi số đơn vị ≤ ngưỡng cảnh báo mà cơ sở đặt cho nhóm máu đó.</p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4" role="tablist" aria-label="Nhóm máu">
                  {d.byBloodType.map((t) => {
                    const low = t.lowFacilities > 0;
                    const active = t.bloodType === selected;
                    return (
                      <button key={t.bloodType} type="button" role="tab" aria-selected={active} onClick={() => setPicked(t.bloodType)}
                        className={cn(
                          "rounded-xl border bg-background p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
                          active ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40 hover:bg-muted/40",
                        )}>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold">{t.bloodType}</span>
                          <span className={cn("size-2 rounded-full", low ? "bg-critical" : "bg-success")} aria-hidden />
                        </div>
                        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{t.units}<span className="ml-1 text-xs font-normal text-muted-foreground">đơn vị</span></p>
                        <div className="mt-3"><Bar value={t.units} max={maxUnits} low={low} /></div>
                        <p className={cn("mt-2 text-xs", low ? "font-medium text-critical" : "text-muted-foreground")}>
                          {low ? `Thấp ở ${t.lowFacilities}/${t.facilities} cơ sở` : `Ổn · ${t.facilities} cơ sở`}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {selectedType && (
                  <div className="mt-5 rounded-xl border border-border">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                      <p className="text-sm font-semibold">Nhóm {selectedType.bloodType} tại từng cơ sở</p>
                      <span className="text-xs text-muted-foreground">Thấp xếp trước</span>
                    </div>
                    <ul className="max-h-[420px] divide-y divide-border overflow-y-auto">
                      {cellsOfType(d.cells, selectedType.bloodType).map((c) => {
                        const low = isLowStock(c);
                        return (
                          <li key={c.organizationId} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
                            <span className="truncate text-sm font-medium">{orgName(c.organizationId)}</span>
                            <div className="order-3 col-span-2 flex items-center gap-3 sm:order-none sm:col-span-1">
                              <Bar value={c.units} max={Math.max(c.lowThreshold * 3, c.units, 1)} low={low} />
                              <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{c.units} / ngưỡng {c.lowThreshold}</span>
                            </div>
                            {low ? <Pill t="red" className="min-w-[4.5rem]">Thấp</Pill> : <Pill t="green" className="min-w-[4.5rem]">Ổn</Pill>}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader><CardTitle>Theo cơ sở</CardTitle></CardHeader>
              <CardContent className="px-0 pb-0">
                <ul className="mt-2 border-t border-border">
                  {d.byOrganization.map((o) => {
                    const key = o.organizationId;
                    const low = lowCellsOf(d.cells, o.organizationId);
                    return (
                      <Expandable key={key} id={`panel-org-${key}`} open={openOrg === key} onToggle={() => setOpenOrg((x) => (x === key ? null : key))} summary={
                        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{o.name}</p>
                            <p className="text-xs text-muted-foreground">{[o.city, `Cập nhật ${formatDateTime(o.updatedAt)}`].filter(Boolean).join(" · ")}</p>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="whitespace-nowrap tabular-nums font-medium">{o.totalUnits} đơn vị</span>
                            {low.length > 0 ? <Pill t="red">{low.length} nhóm thấp</Pill> : <Pill t="green">Ổn</Pill>}
                          </div>
                        </div>
                      }>
                        <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                          {d.cells.filter((c) => c.organizationId === o.organizationId).map((c) => {
                            const isLow = isLowStock(c);
                            return (
                              <li key={c.bloodType} className={cn("rounded-lg border bg-card px-3 py-2", isLow ? "border-critical/40" : "border-border")}>
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold">{c.bloodType}</span>
                                  <span className={cn("size-2 rounded-full", isLow ? "bg-critical" : "bg-success")} aria-label={isLow ? "Thấp" : "Ổn"} />
                                </div>
                                <p className={cn("mt-1 text-lg font-semibold tabular-nums", isLow && "text-critical")}>{c.units}</p>
                                <p className="text-[11px] text-muted-foreground">ngưỡng {c.lowThreshold}</p>
                              </li>
                            );
                          })}
                        </ul>
                      </Expandable>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          </>
        )}
    </>
  );
}
