"use client";

import { Bell, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Avatar } from "@/components/shell/avatar";
import { isActive, NAV } from "@/components/shell/nav";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useNotifications } from "@/providers/notifications-provider";
import type { Role } from "@/types/domain";

/** Trang hồ sơ của từng vai trò (bấm vào ảnh đại diện trên thanh trên). Admin chưa có trang hồ sơ riêng. */
const PROFILE_HREF: Partial<Record<Role, string>> = { DONOR: "/donor/profile", REQUESTER: "/requester/account", ORGANIZATION: "/organization/profile", ADMIN: "/admin/profile" };

/** Khung giao diện app (mobile): thanh trên đậm màu, thanh tab dưới, trang con có nút quay lại. Chỉ dùng khi useAppMode() = true. */
export function AppModeShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { unread } = useNotifications();
  const items = NAV[role];
  const tabs = (items.filter((i) => i.mobile).length >= 3 ? items.filter((i) => i.mobile) : items).slice(0, 5);
  const notif = items.find((i) => i.badge === "unread")?.href;
  const isHome = pathname === tabs[0]?.href;
  const isRoot = items.some((i) => i.href === pathname);
  const title = items.find((i) => isActive(pathname, i, items))?.label ?? "LIFELY";

  return (
    <div data-role={role} data-app-mode className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-30 bg-primary pt-[env(safe-area-inset-top)] text-primary-foreground">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-2 px-4">
          {isHome
            ? <span className="text-lg font-extrabold tracking-[0.2em]">LIFELY</span>
            : isRoot ? <h1 className="truncate text-lg font-bold">{title}</h1>
            : <><button type="button" onClick={() => router.back()} aria-label="Quay lại" className="press -ml-2 grid size-10 place-items-center rounded-full"><ChevronLeft className="size-6" /></button><h1 className="truncate text-base font-semibold">{title}</h1></>}
          <div className="ml-auto flex items-center gap-2">
            {notif && <Link href={notif} aria-label={`Thông báo, ${unread} chưa đọc`} className="press relative grid size-10 place-items-center rounded-full bg-white/15"><Bell className="size-5" />{unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-white px-1 text-[10px] font-bold leading-4 text-primary">{unread > 9 ? "9+" : unread}</span>}</Link>}
            {PROFILE_HREF[role]
              ? <Link href={PROFILE_HREF[role]} aria-label="Hồ sơ của tôi" className="press rounded-full"><Avatar src={user?.avatarUrl} name={user?.fullName} className="size-9 bg-white/90 text-xs text-primary" /></Link>
              : <Avatar src={user?.avatarUrl} name={user?.fullName} className="size-9 bg-white/90 text-xs text-primary" />}
          </div>
        </div>
      </header>
      <main key={pathname} className="page-in mx-auto w-full max-w-lg px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">{children}</main>
      <nav aria-label="Chính" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map((t) => {
            const on = isActive(pathname, t, items);
            return (
              <li key={t.href}><Link href={t.href} aria-current={on ? "page" : undefined} className={cn("press relative flex h-[58px] flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground", on && "text-primary")}>
                {on && <span className="absolute inset-x-5 top-0 h-[3px] rounded-b-full bg-primary" aria-hidden />}
                <t.icon className="size-6" strokeWidth={on ? 2.4 : 1.8} aria-hidden /><span className="max-w-full truncate">{t.short ?? t.label}</span>
              </Link></li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
