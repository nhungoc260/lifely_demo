"use client";

import { Home, LogOut } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { initialsOf, type NavItem } from "@/components/shell/nav";
import { cn } from "@/lib/utils";

/** Menu tài khoản: nút avatar mở danh sách. Đóng khi bấm ra ngoài hoặc nhấn Esc. */
export function UserMenu({ fullName, email, roleLabel, items, onSignOut }: { fullName: string; email: string; roleLabel: string; items: NavItem[]; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const row = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Tài khoản của ${fullName}`}
        className="grid size-9 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground ring-1 ring-border hover:ring-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {initialsOf(fullName)}
      </button>
      <div role="menu" aria-label="Tài khoản" className={cn("absolute right-0 top-11 z-50 w-64 rounded-2xl border border-border bg-card p-2 shadow-lg", open ? "block" : "hidden")}>
        <div className="border-b border-border px-3 pb-2 pt-1">
          <p className="truncate text-sm font-medium">{fullName}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
          <p className="mt-1 text-xs font-medium text-secondary-foreground">{roleLabel}</p>
        </div>
        <div className="py-1">
          {items.map((i) => (
            <Link key={i.href} href={i.href} role="menuitem" onClick={() => setOpen(false)} className={row}>
              <i.icon className="size-4 text-muted-foreground" aria-hidden />{i.label}
            </Link>
          ))}
          <Link href="/" role="menuitem" onClick={() => setOpen(false)} className={row}>
            <Home className="size-4 text-muted-foreground" aria-hidden />Trang giới thiệu LIFELY
          </Link>
        </div>
        <div className="border-t border-border pt-1">
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onSignOut(); }} className={row}>
            <LogOut className="size-4 text-muted-foreground" aria-hidden />Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}
