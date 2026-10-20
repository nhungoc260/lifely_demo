"use client";

import { Activity, CalendarDays, CheckCircle2, Droplets, HeartPulse, History, Map, UserRound } from "lucide-react";
import Link from "next/link";

import { ModeSwitchBanner } from "@/components/shell/mode-switch";
import { MatchRow } from "@/components/donor/match-card";
import { ListGroup } from "@/components/ui/mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/shell/avatar";
import { cn } from "@/lib/utils";

type RowProps = React.ComponentProps<typeof MatchRow>;

const TILES = [
  { href: "/donor/requests", label: "Yêu cầu", icon: HeartPulse, tone: "bg-rose-100 text-rose-700" },
  { href: "/donor/map", label: "Bản đồ", icon: Map, tone: "bg-amber-100 text-amber-700" },
  { href: "/donor/appointments", label: "Đặt lịch", icon: CalendarDays, tone: "bg-sky-100 text-sky-700" },
  { href: "/donor/history", label: "Lịch sử", icon: History, tone: "bg-emerald-100 text-emerald-700" },
  { href: "/donor/health", label: "Sức khỏe", icon: Activity, tone: "bg-violet-100 text-violet-700" },
  { href: "/donor/profile", label: "Hồ sơ", icon: UserRound, tone: "bg-slate-100 text-slate-700" },
];

/** Trang chủ người hiến kiểu app: hero đỏ + công tắc sẵn sàng, thẻ người hiến, lưới tiện ích, danh sách cần phản hồi. Dữ liệu do trang dashboard truyền vào (cùng hook với web). */
export function DonorAppHome(p: {
  greet: string; name?: string; avatarUrl?: string | null; available: boolean; saving: boolean; onToggle: (v: boolean) => void;
  loading: boolean; bloodType?: string | null; donations?: number; nearby?: number; matches: RowProps["m"][];
}) {
  return (
    <div>
      <section className="-mx-4 rounded-b-[28px] bg-primary px-4 pb-10 pt-1 text-primary-foreground">
        <p className="text-sm opacity-80">{p.greet}</p>
        <div className="mt-1 flex items-center gap-3"><Link href="/donor/profile" aria-label="Hồ sơ của tôi" className="press rounded-full"><Avatar src={p.avatarUrl} name={p.name} className="size-12 bg-white/90 text-primary" /></Link>
          <div><h2 className="text-xl font-bold leading-tight">{p.name}</h2><span className="mt-0.5 inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium">Người hiến máu{p.bloodType ? ` · Nhóm ${p.bloodType}` : ""}</span></div></div>
        <button type="button" role="switch" aria-checked={p.available} disabled={p.saving} onClick={() => p.onToggle(!p.available)}
          className="press mt-4 flex w-full items-center justify-between rounded-2xl bg-white/15 px-4 py-3 text-left disabled:opacity-60">
          <span><span className="block text-sm font-semibold">{p.available ? "Bạn đang sẵn sàng hiến máu" : "Đang tắt nhận yêu cầu"}</span><span className="block text-xs opacity-80">Nhận yêu cầu hiến máu</span></span>
          <span className={cn("relative h-7 w-12 rounded-full transition-colors", p.available ? "bg-white" : "bg-white/30")}><span className={cn("absolute top-0.5 size-6 rounded-full transition-all", p.available ? "left-[22px] bg-primary" : "left-0.5 bg-white")} /></span>
        </button>
      </section>

      <section aria-label="Thẻ người hiến" className="-mt-6 grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-card py-4 shadow-sm">
        {[{ i: Droplets, v: p.bloodType ?? "–", l: "Nhóm máu" }, { i: CheckCircle2, v: p.donations ?? 0, l: "Lần hiến" }, { i: HeartPulse, v: p.nearby ?? 0, l: "Gần bạn" }].map((s) => (
          <div key={s.l} className="flex flex-col items-center gap-0.5"><s.i className="size-5 text-primary" aria-hidden />{p.loading ? <Skeleton className="h-7 w-10" /> : <span className="text-2xl font-extrabold">{s.v}</span>}<span className="text-xs text-muted-foreground">{s.l}</span></div>
        ))}
      </section>

      <nav aria-label="Tiện ích" className="mt-4 grid grid-cols-3 gap-3">
        {TILES.map((t) => <Link key={t.href} href={t.href} className="press flex flex-col items-center gap-2 rounded-2xl border border-border bg-card py-4 text-sm font-medium"><span className={cn("grid size-12 place-items-center rounded-2xl", t.tone)}><t.icon className="size-6" aria-hidden /></span>{t.label}</Link>)}
      </nav>

      <ModeSwitchBanner hint="Người nhà cần máu?" />

      <section className="mt-6" aria-label="Cần bạn phản hồi">
        <div className="mb-2 flex items-end justify-between"><h3 className="text-lg font-bold">Cần bạn phản hồi</h3><Link href="/donor/requests" className="text-sm font-medium text-primary">Xem tất cả</Link></div>
        {p.matches.length === 0
          ? <p className="rounded-2xl border border-border bg-card px-4 py-5 text-center text-sm text-muted-foreground">Chưa có yêu cầu nào đang chờ bạn. LIFELY sẽ báo ngay khi có yêu cầu phù hợp.</p>
          : <ListGroup>{p.matches.slice(0, 3).map((m) => <MatchRow key={m.matchId} m={m} />)}</ListGroup>}
      </section>
    </div>
  );
}
