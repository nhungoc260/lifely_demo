"use client";

import { Bell, LogOut, PanelLeftClose, PanelLeftOpen, Radio } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Logo, LogoMark } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NAV, type NavItem } from "@/components/shell/nav";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeStatus } from "@/hooks/use-realtime";
import { cn } from "@/lib/utils";
import { homeFor, useAuth } from "@/providers/auth-provider";
import { NotificationsProvider, useNotifications } from "@/providers/notifications-provider";
import type { Role } from "@/types/domain";

function isActive(pathname: string, item: NavItem, all: NavItem[]) {
  if (pathname === item.href) return true;
  // mục cha chỉ active khi không có mục con khớp tốt hơn
  const better = all.some((o) => o !== item && o.href.startsWith(item.href + "/") && pathname.startsWith(o.href));
  return pathname.startsWith(item.href + "/") && !better;
}

function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-5 text-primary-foreground" aria-label={`${n} unread`}>
      {n > 99 ? "99+" : n}
    </span>
  );
}

function LiveDot() {
  const status = useRealtimeStatus();
  const label = status === "live" ? "Live updates on" : status === "connecting" ? "Reconnecting…" : "Live updates off";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" title={label}>
      <Radio className={cn("size-3.5", status === "live" ? "text-success" : "text-muted-foreground")} aria-hidden />
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}

function Shell({ role, children }: { role: Role; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { unread } = useNotifications();
  const [collapsed, setCollapsed] = useState(false);
  const items = NAV[role];
  const mobile = items.filter((i) => i.mobile);
  const notifHref = items.find((i) => i.badge === "unread")?.href;

  return (
    <div className="flex min-h-dvh bg-surface">
      {/* Sidebar: tablet + desktop (thu gọn được) */}
      <aside className={cn("sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 md:flex", collapsed ? "w-[72px]" : "w-64")}>
        <div className={cn("flex h-16 items-center px-4", collapsed && "justify-center px-0")}>
          {collapsed ? <LogoMark /> : <Logo href={homeFor(role)} />}
        </div>
        <nav aria-label="Main" className="flex-1 space-y-1 px-3 py-2">
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
                {!collapsed && item.badge === "unread" && <Badge n={unread} />}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-border p-3">
          {!collapsed && user && (
            <div className="px-2 pb-1">
              <p className="truncate text-sm font-medium">{user.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          )}
          <button
            onClick={() => { signOut(); router.replace("/login"); }}
            className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", collapsed && "justify-center px-0")}
            aria-label="Log out"
          >
            <LogOut className="size-[18px]" aria-hidden />
            {!collapsed && "Log out"}
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden w-full items-center gap-3 rounded-xl px-3 py-2 text-xs text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <><PanelLeftClose className="size-4" /> Collapse</>}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:h-16 md:px-8">
          <div className="md:hidden"><Logo href={homeFor(role)} /></div>
          <div className="ml-auto flex items-center gap-3">
            <LiveDot />
            <ThemeToggle />
            {notifHref && (
              <Link href={notifHref} className="relative grid size-9 place-items-center rounded-full border border-border bg-card hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Notifications, ${unread} unread`}>
                <Bell className="size-4" aria-hidden />
                {unread > 0 && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-primary ring-2 ring-background" />}
              </Link>
            )}
            <button
              onClick={() => { signOut(); router.replace("/login"); }}
              className="grid size-9 place-items-center rounded-full border border-border bg-card hover:bg-muted md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Log out"
            >
              <LogOut className="size-4" aria-hidden />
            </button>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-28 md:px-8 md:py-8 md:pb-10">{children}</main>
      </div>

      {/* Bottom navigation: mobile */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${mobile.length}, minmax(0, 1fr))` }}>
          {mobile.map((item) => {
            const active = isActive(pathname, item, items);
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("relative flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", active && "text-primary")}>
                  <item.icon className="size-5" aria-hidden />
                  <span className="truncate">{item.label}</span>
                  {item.badge === "unread" && unread > 0 && <span className="absolute right-[28%] top-1.5 size-2 rounded-full bg-primary" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/** Bảo vệ route theo role + khung ứng dụng. Phân quyền thật sự nằm ở backend; đây chỉ là điều hướng UX. */
export function RoleShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const { status, user, role: current } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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
          <p className="text-center text-sm text-muted-foreground">Loading your workspace…</p>
        </div>
      </div>
    );
  }
  return (
    <NotificationsProvider>
      <Shell role={role}>{children}</Shell>
    </NotificationsProvider>
  );
}
