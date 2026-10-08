import Link from "next/link";

import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <path d="M16 3.5c-3.2 4.6-8.4 9.6-8.4 15.2A8.4 8.4 0 0 0 16 27a8.4 8.4 0 0 0 8.4-8.3C24.4 13.1 19.2 8.1 16 3.5Z" fill="var(--primary)" />
      <path d="M10.5 18.2h3.1l1.7-3.6 2.5 6.2 1.6-2.6h2.1" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)} aria-label="Trang chủ LIFELY">
      <LogoMark />
      <span className="text-lg font-semibold tracking-[0.12em]">LIFELY</span>
    </Link>
  );
}
