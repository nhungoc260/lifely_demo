"use client";

import { Bell, Home, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { InstallButton } from "@/components/pwa/install-button";
import { isActive, NAV, ROLE_META, TOPNAV } from "@/components/shell/nav";
import { LiveDot } from "@/components/shell/parts";
import { UserMenu } from "@/components/shell/user-menu";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useNotifications } from "@/providers/notifications-provider";
import type { Role } from "@/types/domain";

const LINK = "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Giao diện công khai dành cho người dùng cuối (người hiến máu, người cần máu): thanh menu ngang giống trang chủ,
 * có nút Trang chủ, chuông thông báo, menu tài khoản và chân trang. Khác hẳn khung quản trị có thanh bên.
 */
export function TopNavShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { unread } = useNotifications();
  const cfg = TOPNAV[role];
  const meta = ROLE_META[role];
  // Mục đầu của thanh dưới (di động) gọi là "Trang chủ", khớp với thanh menu trên máy tính.
  const mobile = NAV[role].filter((i) => i.mobile).map((i, idx) => (idx === 0 ? { ...i, label: "Trang chủ" } : i));
  const all = NAV[role];
  const logout = () => { signOut(); router.replace("/login"); };
  if (!cfg) return null;

  return (
    <div data-role={role} className="flex min-h-dvh flex-col bg-surface">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="hidden h-0.5 w-full bg-[var(--role-line)] lg:block" aria-hidden />
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 md:px-8 lg:h-16">
          <Logo href={cfg.links[0].href} />
          <span className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground 2xl:inline-flex">
            <meta.icon className="size-3.5" aria-hidden />{meta.title}
          </span>
          <nav aria-label="Chính" className="ml-2 hidden items-center gap-1 lg:flex">
            {cfg.links.map((l) => {
              const active = isActive(pathname, l, all);
              return (
                <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={cn(LINK, active && "bg-secondary text-secondary-foreground")}>
                  {l === cfg.links[0] && <Home className="size-4" aria-hidden />}{l.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {cfg.cta && (
              <Link href={cfg.cta.href} className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}>
                <Plus aria-hidden />{cfg.cta.label}
              </Link>
            )}
            <span className="hidden lg:contents"><LiveDot labelFrom="2xl" /></span>
            <span className="hidden lg:contents"><InstallButton compact /></span>
            <span className="hidden lg:contents"><ThemeToggle /></span>
            <Link href={cfg.bell} className="relative grid size-9 place-items-center rounded-full border border-border bg-card hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Thông báo, ${unread} chưa đọc`}>
              <Bell className="size-4" aria-hidden />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">{unread > 9 ? "9+" : unread}</span>
              )}
            </Link>
            {user && <UserMenu fullName={user.fullName} email={user.email} roleLabel={meta.title} items={cfg.menu} onSignOut={logout} />}
          </div>
        </div>
      </header>

      <main id="main" key={pathname} className="page-in mx-auto w-full max-w-6xl flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 md:px-8 md:py-10 lg:pb-12">{children}</main>

      <footer className="hidden border-t border-border bg-background/60 lg:block">
        <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-6 px-8 py-6 text-xs text-muted-foreground">
          <div className="max-w-xl space-y-1.5">
            <p className="font-medium text-foreground">LIFELY · Connect. Donate. Save a Life.</p>
            <p>LIFELY là nền tảng điều phối, không cung cấp chẩn đoán, chỉ định truyền máu hay quyết định đủ điều kiện hiến máu. Quyết định cuối cùng thuộc về nhân viên y tế có chuyên môn.</p>
          </div>
          <nav aria-label="Liên kết" className="flex gap-4">
            <Link href="/" className="hover:text-foreground">Giới thiệu LIFELY</Link>
            <Link href={role === "DONOR" ? "/donor/map" : "/requester/map"} className="hover:text-foreground">Bản đồ</Link>
            <Link href="/info/faq" className="hover:text-foreground">Câu hỏi thường gặp</Link>
          </nav>
        </div>
      </footer>

      {/* Thanh điều hướng dưới: di động, kiểu ứng dụng gốc */}
      <nav aria-label="Chính" className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${mobile.length}, minmax(0, 1fr))` }}>
          {mobile.map((item) => {
            const active = isActive(pathname, item, all);
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
        </ul>
      </nav>
    </div>
  );
}
