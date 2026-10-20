"use client";

import { Activity, CalendarDays, ChevronLeft, ChevronRight, History, LogOut, Moon, Pencil, Repeat, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useModeSwitch } from "@/components/shell/mode-switch";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type { DonorProfile } from "@/types/domain";

export function initialsOf(name?: string | null): string {
  return (name ?? "").split(" ").filter(Boolean).slice(-2).map((w) => w[0]).join("").toUpperCase() || "·";
}

function Row({ icon: Icon, tone, title, hint, href, onClick, danger }: { icon: LucideIcon; tone: string; title: string; hint?: string; href?: string; onClick?: () => void; danger?: boolean }) {
  const cls = "press flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left last:border-b-0";
  const body = <><span className={cn("grid size-10 place-items-center rounded-xl", tone)}><Icon className="size-5" aria-hidden /></span>
    <span className="min-w-0 flex-1"><span className={cn("block font-medium", danger && "text-critical")}>{title}</span>{hint && <span className="block truncate text-xs text-muted-foreground">{hint}</span>}</span>
    <ChevronRight className="size-4 text-muted-foreground" aria-hidden /></>;
  return href ? <Link href={href} className={cls}>{body}</Link> : <button type="button" onClick={onClick} className={cls}>{body}</button>;
}

/** Hồ sơ kiểu app: menu tài khoản → thông tin cơ bản (có nút bút chì) → chỉnh sửa. Biểu mẫu chỉnh sửa là chính biểu mẫu của web (cùng API, cùng kiểm tra dữ liệu). */
export function AppProfile({ profile, editor }: { profile: DonorProfile; editor: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [view, setView] = useState<"menu" | "info" | "edit">("menu");
  const sw = useModeSwitch();
  const name = profile.fullName || user?.fullName;
  const area = [profile.district, profile.city].filter(Boolean).join(", ") || "Chưa cập nhật";

  if (view === "edit") return (
    <div className="pt-3"><button type="button" onClick={() => setView("info")} className="press mb-3 inline-flex items-center gap-1 text-sm font-medium text-primary"><ChevronLeft className="size-4" aria-hidden />Quay lại</button>{editor}</div>
  );

  if (view === "info") return (
    <div className="pt-3">
      <button type="button" onClick={() => setView("menu")} className="press mb-3 inline-flex items-center gap-1 text-sm font-medium text-primary"><ChevronLeft className="size-4" aria-hidden />Quay lại</button>
      <div className="flex items-center gap-4"><span className="grid size-16 place-items-center rounded-full bg-primary text-xl font-bold text-primary-foreground">{initialsOf(name)}</span>
        <div><h2 className="text-2xl font-bold">{name}</h2><p className="text-sm text-muted-foreground">Người hiến máu · Nhóm {profile.bloodType ?? "chưa rõ"} · {profile.totalDonations} lần hiến</p></div></div>
      <section className="mt-5 rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Thông tin cơ bản</h3>
          <button type="button" onClick={() => setView("edit")} aria-label="Chỉnh sửa thông tin" className="press grid size-9 place-items-center rounded-full bg-muted text-primary"><Pencil className="size-4" /></button></div>
        <dl className="space-y-3 text-sm">
          {([["Họ tên", name], ["Email", user?.email], ["Số điện thoại", profile.phone], ["Nhóm máu", profile.bloodType ?? "Chưa cập nhật"], ["Khu vực", area], ["Lần hiến gần nhất", profile.lastDonationDate ?? "Chưa có"]] as const).map(([k, v]) => (
            <div key={k} className="flex gap-4"><dt className="w-32 shrink-0 text-muted-foreground">{k}</dt><dd className="min-w-0 flex-1 break-words font-medium">{v}</dd></div>
          ))}
        </dl>
      </section>
    </div>
  );

  return (
    <div className="pt-4">
      <h2 className="mb-3 text-2xl font-bold">Hồ sơ</h2>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <button type="button" onClick={() => setView("info")} className="press flex w-full items-center gap-3 px-4 py-4 text-left">
          <span className="grid size-12 place-items-center rounded-full bg-primary font-bold text-primary-foreground">{initialsOf(name)}</span>
          <span className="min-w-0 flex-1"><span className="block text-lg font-semibold">{name}</span><span className="block text-sm text-muted-foreground">Chỉnh sửa thông tin cá nhân</span></span>
          <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
        </button>
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
        <Row icon={Activity} tone="bg-rose-100 text-rose-700" title="Sức khỏe của tôi" hint="Nhịp tim, huyết áp, khả năng hiến lại" href="/donor/health" />
        <Row icon={CalendarDays} tone="bg-sky-100 text-sky-700" title="Đặt lịch hiến" href="/donor/appointments" />
        <Row icon={History} tone="bg-emerald-100 text-emerald-700" title="Lịch sử hiến máu" href="/donor/history" />
        <div className="flex items-center gap-3 px-4 py-3.5"><span className="grid size-10 place-items-center rounded-xl bg-violet-100 text-violet-700"><Moon className="size-5" aria-hidden /></span><span className="flex-1 font-medium">Giao diện</span><ThemeToggle /></div>
      </div>
      {sw.eligible && <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card"><Row icon={Repeat} tone="bg-amber-100 text-amber-700" title={`Chuyển sang “${sw.label}”`} hint="Dùng cùng một tài khoản" onClick={() => void sw.go()} /></div>}
      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
        <Row icon={LogOut} tone="bg-rose-100 text-rose-700" title="Đăng xuất" danger onClick={() => { signOut(); router.replace("/login"); }} />
      </div>
    </div>
  );
}
