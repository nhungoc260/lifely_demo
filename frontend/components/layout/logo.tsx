import Link from "next/link";
import { useId } from "react";

import { cn } from "@/lib/utils";

const HEART = "M14.4 6.6C12.6 4.4 8.6 3.9 6.2 6.3C3.8 8.7 3.8 12.2 6.4 15.2C9 18.6 12.6 22.6 16 27C19.4 22.6 23 18.6 25.6 15.2C28.2 12.2 28.2 8.7 25.8 6.3C23.4 3.9 19.4 4.4 17.4 7.2C16 9 14.6 11 13.6 13.2";
const DROP = "M16 15.6C15.2 17.2 13.7 18.5 13.7 19.9C13.7 21 14.7 21.8 16 21.8C17.3 21.8 18.3 21 18.3 19.9C18.3 18.5 16.8 17.2 16 15.6Z";

/** Biểu tượng LIFELY: trái tim viền đậm ôm giọt máu. `tone="light"` (toàn trắng) dùng trên nền đỏ. */
export function LogoMark({ className, tone = "brand" }: { className?: string; tone?: "brand" | "light" }) {
  const id = useId();
  const light = tone === "light";
  const paint = light ? "#fff" : `url(#${id})`;
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--accent)" /><stop offset="1" stopColor="var(--primary)" /></linearGradient></defs>
      <path d={HEART} fill="none" stroke={paint} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={DROP} fill={paint} />
    </svg>
  );
}

export function Logo({ href = "/", className, tone = "brand" }: { href?: string; className?: string; tone?: "brand" | "light" }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)} aria-label="Trang chủ LIFELY">
      <LogoMark tone={tone} className="size-8 transition-transform duration-300 group-hover:scale-110" />
      <span className={cn("text-lg font-extrabold tracking-[0.16em]", tone === "brand" && "text-foreground")}>LIFELY</span>
    </Link>
  );
}
