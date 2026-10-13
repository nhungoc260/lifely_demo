"use client";

import { Droplets, Info, Minus, Plus, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { toApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { orgApi } from "@/services";
import type { InventoryItem } from "@/types/domain";

const MAX = 100000;
const clamp = (n: number) => Math.max(0, Math.min(MAX, Math.floor(Number.isFinite(n) ? n : 0)));

type Edit = { units?: number; lowThreshold?: number };

export default function OrganizationInventory() {
  const me = useQuery("org-me", orgApi.me);
  const res = useQuery(me.data ? "org-inventory" : null, orgApi.inventory);
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);

  const rows = useMemo(
    () => (res.data ?? []).map((it) => {
      const units = edits[it.bloodType]?.units ?? it.units;
      const lowThreshold = edits[it.bloodType]?.lowThreshold ?? it.lowThreshold;
      return { ...it, units, lowThreshold, low: units <= lowThreshold, changed: units !== it.units || lowThreshold !== it.lowThreshold };
    }),
    [res.data, edits],
  );
  const dirty = rows.some((r) => r.changed);
  const total = rows.reduce((s, r) => s + r.units, 0);
  const lowCount = rows.filter((r) => r.low && r.units > 0).length;
  const emptyCount = rows.filter((r) => r.units === 0).length;

  function change(type: string, patch: Edit) {
    setEdits((e) => ({ ...e, [type]: { ...e[type], ...patch } }));
  }

  async function save() {
    setSaving(true);
    try {
      const saved = await orgApi.saveInventory(rows.map((r) => ({ bloodType: r.bloodType, units: r.units, lowThreshold: r.lowThreshold })));
      res.mutate(() => saved);
      setEdits({});
      toast.success("Đã cập nhật kho máu");
    } catch (e) {
      toast.error(toApiError(e).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Kho máu"
        description="Theo dõi số đơn vị máu đang có trong kho của cơ sở, nhóm nào sắp hết sẽ được cảnh báo."
        actions={dirty ? <><Button variant="outline" onClick={() => setEdits({})} disabled={saving}>Hoàn tác</Button><Button onClick={save} disabled={saving}>{saving ? "Đang lưu..." : "Lưu thay đổi"}</Button></> : undefined}
      />
      {me.data === null ? <ErrorState message="Hãy hoàn tất hồ sơ tổ chức trước khi quản lý kho máu." />
        : res.error && !res.data ? <ErrorState message={res.error.message} onRetry={res.reload} />
        : res.initialLoading || !res.data ? <Skeleton className="h-72" />
        : (
          <>
            <Card className="mb-6 flex gap-3 p-4 text-sm">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div className="space-y-1">
                <p className="font-medium">Cách dùng</p>
                <p className="text-muted-foreground">LIFELY không tự biết kho của bạn: nhân viên kho nhập theo sổ sách của bệnh viện. Bấm <b>Nhập</b> khi nhận thêm máu, bấm <b>Xuất</b> khi cấp máu cho bệnh nhân, hoặc gõ thẳng số đang có. Xong nhớ bấm <b>Lưu thay đổi</b>.</p>
              </div>
            </Card>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Mỗi lần bấm Nhập / Xuất:</span>
              {[1, 5, 10].map((n) => (
                <Button key={n} size="sm" variant={step === n ? "default" : "outline"} onClick={() => setStep(n)} aria-pressed={step === n}>{n} đơn vị</Button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <StatCard label="Tổng đơn vị" value={total} icon={Droplets} accent />
              <StatCard label="Nhóm sắp hết" value={lowCount} icon={TriangleAlert} hint="Còn ít hơn ngưỡng cảnh báo" />
              <StatCard label="Nhóm hết máu" value={emptyCount} icon={TriangleAlert} />
            </div>

            <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {rows.map((r) => (
                <li key={r.bloodType}>
                  <StockCard r={r} step={step} onUnits={(n) => change(r.bloodType, { units: clamp(n) })} onThreshold={(n) => change(r.bloodType, { lowThreshold: clamp(n) })} />
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">Số liệu do cơ sở tự cập nhật; LIFELY không tự trừ hay cộng đơn vị máu.</p>
          </>
        )}
    </>
  );
}

function StockCard({ r, step, onUnits, onThreshold }: {
  r: InventoryItem & { changed: boolean };
  step: number;
  onUnits: (n: number) => void;
  onThreshold: (n: number) => void;
}) {
  const empty = r.units === 0;
  return (
    <Card className={cn("p-5", empty ? "border-primary/40 bg-primary/5" : r.low && "border-warning/40 bg-warning/5")}>
      <div className="flex items-center justify-between">
        <p className="text-2xl font-semibold tracking-tight">{r.bloodType}</p>
        {empty ? <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">Hết máu</span>
          : r.low ? <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium">Sắp hết</span> : null}
      </div>
      <label className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        Đang có (đơn vị)
        <Input type="number" inputMode="numeric" min={0} max={MAX} value={r.units} aria-label={`Số đơn vị nhóm ${r.bloodType}`} className="h-10 w-24 text-center text-lg font-semibold tabular-nums text-foreground" onChange={(e) => onUnits(Number(e.target.value))} />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" aria-label={`Xuất ${step} đơn vị nhóm ${r.bloodType}`} onClick={() => onUnits(r.units - step)} disabled={r.units <= 0}><Minus /> Xuất {step}</Button>
        <Button variant="outline" size="sm" aria-label={`Nhập ${step} đơn vị nhóm ${r.bloodType}`} onClick={() => onUnits(r.units + step)}><Plus /> Nhập {step}</Button>
      </div>
      <label className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        Cảnh báo khi còn ≤
        <Input type="number" inputMode="numeric" min={0} max={MAX} value={r.lowThreshold} className="h-8 w-20 text-center" onChange={(e) => onThreshold(Number(e.target.value))} />
      </label>
      <p className="mt-3 text-[11px] text-muted-foreground">{r.updatedAt ? `Cập nhật ${formatDateTime(r.updatedAt)}` : "Chưa cập nhật"}</p>
    </Card>
  );
}
