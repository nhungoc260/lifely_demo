"use client";

import { Bell, Ellipsis, Globe, Home, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Logo, LogoMark } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { InstallButton } from "@/components/pwa/install-button";
import { isActive, NAV, ROLE_META, TOPNAV_ROLES } from "@/components/shell/nav";
import { MoreSheet } from "@/components/shell/more-sheet";
import { LiveDot, UnreadBadge } from "@/components/shell/parts";
import { AppModeShell } from "@/components/app/app-shell";
import { useAppMode } from "@/hooks/use-app-mode";
import { TopNavShell } from "@/components/shell/top-nav-shell";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { homeFor, useAuth } from "@/providers/auth-provider";
import { NotificationsProvider, useNotifications } from "@/providers/notifications-provider";
import type { Role } from "@/types/domain";

/** Khung làm việc có thanh bên: dành cho tổ chức y tế và quản trị viên. */
function SidebarShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { unread } = useNotifications();
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const items = NAV[role];
  // Thanh tab dưới: tối đa 4 mục chính + "Thêm" (mở danh sách phần còn lại), giống ứng dụng gốc.
  const mobile = items.filter((i) => i.mobile).slice(0, 4);
  const more = items.filter((i) => !mobile.includes(i));
  const logout = () => { signOut(); router.replace("/login"); };
  const notifHref = items.find((i) => i.badge === "unread")?.href;
  const meta = ROLE_META[role];

  return (
    <div data-role={role} className="flex min-h-dvh bg-surface">
      {/* Sidebar: tablet + desktop (thu gọn được) */}
      <aside className={cn("sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 md:flex", collapsed ? "w-[72px]" : "w-64")}>
        <div className={cn("flex h-16 shrink-0 items-center px-4", collapsed && "justify-center px-0")}>
          {collapsed ? <LogoMark /> : <Logo href={homeFor(role)} />}
        </div>
        {/* Thẻ vai trò: luôn cho biết đang ở không gian nào (người hiến / người cần máu / tổ chức / quản trị) */}
        <div className={cn("shrink-0 px-4 pb-3", collapsed && "flex justify-center px-0")}>
          <div
            className={cn("rounded-xl bg-secondary text-secondary-foreground", collapsed ? "grid size-9 place-items-center" : "flex items-center gap-2.5 px-3 py-2")}
            title={collapsed ? meta.title : undefined}
          >
            <meta.icon className="size-4 shrink-0" aria-hidden />
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight">{meta.title}</p>
                <p className="truncate text-[11px] leading-tight opacity-80">{meta.hint}</p>
              </div>
            )}
          </div>
        </div>
        <nav aria-label="Chính" className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-2">
          {items.map((item) => {
            const active = isActive(pathname, item, items);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", active && "bg-secondary text-secondary-foreground", collapsed && "justify-center px-0")}
              >
                <item.icon className="size-[18px] shrink-0" aria-hidden />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && item.badge === "unread" && <UnreadBadge n={unread} />}
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0 space-y-1 border-t border-border p-3">
          <Link
            href="/"
            title={collapsed ? "Về trang chủ LIFELY" : undefined}
            className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", collapsed && "justify-center px-0")}
            aria-label="Về trang chủ LIFELY"
          >
            <Home className="size-[18px] shrink-0" aria-hidden />
            {!collapsed && "Trang chủ LIFELY"}
          </Link>
          {!collapsed && user && (
            <div className="px-2 pb-1">
              <p className="truncate text-sm font-medium">{user.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          )}
          <button
            onClick={() => { signOut(); router.replace("/login"); }}
            className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", collapsed && "justify-center px-0")}
            aria-label="Đăng xuất"
          >
            <LogOut className="size-[18px]" aria-hidden />
            {!collapsed && "Đăng xuất"}
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden w-full items-center gap-3 rounded-xl px-3 py-2 text-xs text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:flex"
            aria-label={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <><PanelLeftClose className="size-4" /> Thu gọn</>}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/85 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl md:h-16 md:px-8">
          <div className="absolute inset-x-0 top-0 hidden h-0.5 bg-[var(--role-line)] md:block" aria-hidden />
          <div className="md:hidden"><Logo href={homeFor(role)} /></div>
          <span className="hidden items-center gap-1.5 whitespace-nowrap rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground sm:inline-flex md:hidden">
            <meta.icon className="size-3.5" aria-hidden />{meta.title}
          </span>
          {role === "ADMIN" && (
            <span className="hidden text-xs text-muted-foreground md:inline">Khu vực quản trị · mọi thao tác được ghi vào nhật ký hoạt động</span>
          )}
          <div className="ml-auto flex items-center gap-3">
            <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden md:inline-flex")}>
              <Globe aria-hidden />Xem trang công khai
            </Link>
            <span className="hidden md:inline-flex"><LiveDot /></span>
            <span className="hidden md:contents"><InstallButton compact /></span>
            <span className="hidden md:contents"><ThemeToggle /></span>
            {notifHref && (
              <Link href={notifHref} className="relative grid size-9 place-items-center rounded-full border border-border bg-card hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Thông báo, ${unread} chưa đọc`}>
                <Bell className="size-4" aria-hidden />
                {unread > 0 && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-primary ring-2 ring-background" />}
              </Link>
            )}
          </div>
        </header>
        <main id="main" key={pathname} className="page-in mx-auto w-full max-w-6xl flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 md:px-8 md:py-8 md:pb-10">{children}</main>
      </div>

      {/* Bottom navigation: mobile */}
      <nav aria-label="Chính" className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {mobile.map((item) => {
            const active = isActive(pathname, item, items);
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("press relative flex h-[58px] flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", active && "text-primary")}>
                  {active && <span className="absolute inset-x-6 top-0 h-0.5 rounded-b-full bg-primary" aria-hidden />}
                  <item.icon className="size-[22px]" strokeWidth={active ? 2.4 : 1.8} aria-hidden />
                  <span className="max-w-full truncate">{item.short ?? item.label}</span>
                  {item.badge === "unread" && unread > 0 && <span className="absolute right-[26%] top-2 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold leading-4 text-primary-foreground">{unread > 9 ? "9+" : unread}</span>}
                </Link>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => setMoreOpen(true)} aria-haspopup="dialog" className={cn("press relative flex h-[58px] w-full flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", moreOpen && "text-primary")}>
              <Ellipsis className="size-[22px]" strokeWidth={1.8} aria-hidden />
              <span>Thêm</span>
              {unread > 0 && !mobile.some((i) => i.badge === "unread") && <span className="absolute right-[30%] top-2.5 size-2 rounded-full bg-primary" aria-hidden />}
            </button>
          </li>
        </ul>
      </nav>
      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} items={more} unread={unread} user={user} roleTitle={meta.title} onSignOut={logout} />
    </div>
  );
}

/** Bảo vệ route theo role + khung ứng dụng. Phân quyền thật sự nằm ở backend; đây chỉ là điều hướng UX. */
export function RoleShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const { status, user, role: current } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const appMode = useAppMode();

  const mustOnboard = role === "DONOR" && !!user && !user.onboardingCompleted && user.onboardingStep <= 1 && !pathname.startsWith("/onboarding");

  useEffect(() => {
    if (status === "anonymous") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (status === "authenticated" && current !== role) router.replace(homeFor(current));
    else if (mustOnboard) router.replace("/onboarding");
  }, [status, current, role, router, pathname, mustOnboard]);

  if (status !== "authenticated" || current !== role || mustOnboard) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface" aria-busy="true">
        <div className="w-full max-w-sm space-y-3 px-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-24 w-full" />
          <p className="text-center text-sm text-muted-foreground">Đang tải không gian làm việc…</p>
        </div>
      </div>
    );
  }
  return (
    <NotificationsProvider>
      {appMode ? <AppModeShell role={role}>{children}</AppModeShell> : TOPNAV_ROLES.includes(role) ? <TopNavShell role={role}>{children}</TopNavShell> : <SidebarShell role={role}>{children}</SidebarShell>}
    </NotificationsProvider>
  );
}
