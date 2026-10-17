"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { InstallButton } from "@/components/pwa/install-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { homeFor, useAuth } from "@/providers/auth-provider";

const LINKS = [
  { href: "/#how-it-works", label: "Cách hoạt động" },
  { href: "/#requests", label: "Yêu cầu khẩn cấp" },
  { href: "/#donors", label: "Dành cho người hiến máu" },
  { href: "/#organizations", label: "Dành cho tổ chức" },
  { href: "/#about", label: "Giới thiệu" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { status, role } = useAuth();
  const authed = status === "authenticated";

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Logo />
        <nav aria-label="Chính" className="hidden items-center gap-5 xl:gap-7 lg:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">{l.label}</Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <InstallButton compact />
          <ThemeToggle />
          {authed ? (
            <Link href={homeFor(role)} className={buttonVariants({ size: "sm" })}>Vào trang của tôi</Link>
          ) : (
            <>
              <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>Đăng nhập</Link>
              <Link href="/register" className={buttonVariants({ size: "sm" })}>Bắt đầu</Link>
            </>
          )}
        </div>
        <button className="grid size-10 place-items-center rounded-xl border border-border lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Đóng menu" : "Mở menu"} onClick={() => setOpen((o) => !o)}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      <div id="mobile-menu" className={cn("border-t border-border bg-background px-5 pb-5 lg:hidden", open ? "block" : "hidden")}>
        <nav aria-label="Di động" className="flex flex-col py-2">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-1 py-3 text-base">{l.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {authed ? (
            <Link href={homeFor(role)} className={cn(buttonVariants(), "flex-1")}>Vào trang của tôi</Link>
          ) : (
            <>
              <Link href="/login" className={cn(buttonVariants({ variant: "outline" }), "flex-1")}>Đăng nhập</Link>
              <Link href="/register" className={cn(buttonVariants(), "flex-1")}>Bắt đầu</Link>
            </>
          )}
          <InstallButton compact />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
