"use client";

import { CheckCircle2, ClipboardList, Plus, UsersRound } from "lucide-react";
import Link from "next/link";

import { ModeSwitchBanner } from "@/components/shell/mode-switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { BloodRequest } from "@/types/domain";

/** Trang chủ người cần máu kiểu app: hero đỏ + nút tạo yêu cầu lớn, số liệu nhanh, tiến độ từng yêu cầu đang mở. Dữ liệu từ cùng hook với web. */
export function RequesterAppHome(p: {
  name?: string; loading: boolean; active?: number; confirmed?: number; completed?: number; open: BloodRequest[];
  /** Tiền tố đường dẫn theo vai trò (mặc định người cần máu). */
  base?: string; canCreate?: boolean; stats?: { label: string; value?: number }[];
}) {
  const base = p.base ?? "/requester";
  const ICONS = [ClipboardList, UsersRound, CheckCircle2];
  const stats = p.stats ?? [{ label: "Đang mở", value: p.active }, { label: "Đã nhận lời", value: p.confirmed }, { label: "Đã đủ người", value: p.completed }];
  return (
    <div>
      <section className="-mx-4 rounded-b-[28px] bg-primary px-4 pb-10 pt-1 text-primary-foreground">
        <p className="text-sm opacity-80">Xin chào</p>
        <h2 className="text-2xl font-bold leading-tight">{p.name}</h2>
        {p.canCreate !== false && <Link href={`${base}/requests/create`} className="press mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-base font-bold text-primary"><Plus className="size-5" aria-hidden />Tạo yêu cầu máu</Link>}
      </section>

      <section aria-label="Tóm tắt" className="-mt-6 grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-card py-4 shadow-sm">
        {stats.map((s, i) => { const Ic = ICONS[i % 3]; return (
          <div key={s.label} className="flex flex-col items-center gap-0.5"><Ic className="size-5 text-primary" aria-hidden />{p.loading ? <Skeleton className="h-7 w-10" /> : <span className="text-2xl font-extrabold">{s.value ?? 0}</span>}<span className="text-xs text-muted-foreground">{s.label}</span></div>
        ); })}
      </section>

      <ModeSwitchBanner hint="Bạn muốn đi hiến máu?" />

      <section className="mt-6" aria-label="Yêu cầu đang mở">
        <div className="mb-2 flex items-end justify-between"><h3 className="text-lg font-bold">Yêu cầu đang mở</h3><Link href={`${base}/requests`} className="text-sm font-medium text-primary">Xem tất cả</Link></div>
        {p.loading ? <Skeleton className="h-28" /> : p.open.length === 0
          ? <p className="rounded-2xl border border-border bg-card px-4 py-5 text-center text-sm text-muted-foreground">Chưa có yêu cầu nào đang mở. Cần máu? Hãy tạo yêu cầu, LIFELY sẽ tìm người hiến gần bệnh viện.</p>
          : <ul className="space-y-3">{p.open.map((r) => {
              const pct = Math.min(100, Math.round((r.unitsReceived / Math.max(1, r.unitsRequired)) * 100));
              return (
                <li key={r.id}><Link href={`${base}/requests/${r.id}`} className="press block rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-xl bg-primary text-lg font-extrabold text-primary-foreground">{r.bloodType}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{r.hospitalName}</span><span className="block text-xs text-muted-foreground">{[r.district, r.city].filter(Boolean).join(", ")}</span></span></div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Tiến độ hiến máu"><div className={cn("h-full rounded-full bg-primary")} style={{ width: `${pct}%` }} /></div>
                  <p className="mt-2 text-xs text-muted-foreground">{r.unitsConfirmed} người nhận lời · {r.unitsReceived}/{r.unitsRequired} đơn vị đã hiến thực tế</p>
                </Link></li>
              );
            })}</ul>}
      </section>
    </div>
  );
}
