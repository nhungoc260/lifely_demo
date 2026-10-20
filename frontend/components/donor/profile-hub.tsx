"use client";

import { Activity, CalendarDays, History, Home, LifeBuoy, LogOut, Moon } from "lucide-react";
import { useRouter } from "next/navigation";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { InstallButton } from "@/components/pwa/install-button";
import { initialsOf } from "@/components/shell/nav";
import { IconTile, ListGroup, ListRow } from "@/components/ui/mobile";
import { useAuth } from "@/providers/auth-provider";

/**
 * Màn "Tôi" cho điện thoại: tên, các mục hay dùng, cài đặt ứng dụng, trợ giúp, đăng xuất.
 * Gom những thứ không cần nằm trên thanh trên cùng (đổi giao diện, cài ứng dụng, hỗ trợ).
 */
export function DonorProfileHub() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  if (!user) return null;
  return (
    <div className="mb-6 space-y-5 lg:hidden">
      <div className="flex items-center gap-4 rounded-2xl bg-card p-4 ring-1 ring-border/60">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-secondary text-lg font-bold text-secondary-foreground">{initialsOf(user.fullName)}</span>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold leading-tight">{user.fullName}</p>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <ListGroup>
        <ListRow icon={Activity} tint="rose" label="Sức khỏe của tôi" hint="Nhịp tim, huyết áp, khả năng hiến lại" href="/donor/health" />
        <ListRow icon={CalendarDays} tint="sky" label="Lịch hiến" href="/donor/appointments" />
        <ListRow icon={History} tint="emerald" label="Lịch sử hiến máu" href="/donor/history" />
      </ListGroup>

      <ListGroup title="Ứng dụng">
        <div className="flex min-h-[52px] items-center gap-3 px-4 py-2.5">
          <IconTile icon={Moon} tint="violet" />
          <span className="flex-1 text-[15px] font-medium">Giao diện</span>
          <ThemeToggle />
        </div>
        <div className="px-4 py-2.5 empty:hidden"><InstallButton className="w-full" /></div>
        <ListRow icon={LifeBuoy} tint="amber" label="Trợ giúp và hỗ trợ" onClick={() => window.dispatchEvent(new Event("lifely:open-help"))} />
        <ListRow icon={Home} tint="slate" label="Giới thiệu LIFELY" href="/" />
      </ListGroup>

      <ListGroup>
        <ListRow icon={LogOut} danger label="Đăng xuất" chevron={false} onClick={() => { signOut(); router.replace("/login"); }} />
      </ListGroup>
    </div>
  );
}
