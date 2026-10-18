import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/** Mỗi nhóm thông tin một màu riêng (giống ứng dụng Sức khỏe), giúp mắt phân biệt nhanh. */
export const TINT = {
  rose: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
  emerald: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  sky: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
  amber: "bg-amber-500/14 text-amber-600 dark:text-amber-400",
  violet: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
  slate: "bg-slate-500/12 text-slate-600 dark:text-slate-300",
} as const;
export type Tint = keyof typeof TINT;

export function IconTile({ icon: Icon, tint = "rose", className }: { icon: LucideIcon; tint?: Tint; className?: string }) {
  return (
    <span className={cn("grid size-9 shrink-0 place-items-center rounded-[10px]", TINT[tint], className)}>
      <Icon className="size-[18px]" aria-hidden />
    </span>
  );
}

/** Nhóm dòng bo tròn, ngăn cách bằng đường mảnh (kiểu danh sách của iOS). */
export function ListGroup({ title, footer, children, className }: { title?: string; footer?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      {title && <h2 className="mb-1.5 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>}
      <div className="divide-y divide-border/60 overflow-hidden rounded-2xl bg-card ring-1 ring-border/60">{children}</div>
      {footer && <p className="mt-1.5 px-4 text-xs leading-relaxed text-muted-foreground">{footer}</p>}
    </section>
  );
}

const ROW = "press-row flex min-h-[52px] w-full items-center gap-3 px-4 py-2.5 text-left text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";

/** Một dòng trong danh sách: icon màu, nhãn, giá trị/phần phụ, mũi tên khi bấm được. */
export function ListRow({
  icon, tint, label, hint, value, href, onClick, trailing, danger, chevron = true,
}: {
  icon?: LucideIcon; tint?: Tint; label: React.ReactNode; hint?: React.ReactNode; value?: React.ReactNode;
  href?: string; onClick?: () => void; trailing?: React.ReactNode; danger?: boolean; chevron?: boolean;
}) {
  const body = (
    <>
      {icon && <IconTile icon={icon} tint={danger ? "rose" : tint} />}
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate font-medium", danger && "text-critical")}>{label}</span>
        {hint && <span className="block truncate text-xs text-muted-foreground">{hint}</span>}
      </span>
      {value && <span className="shrink-0 text-sm text-muted-foreground">{value}</span>}
      {trailing}
      {(href || onClick) && chevron && !trailing && <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" aria-hidden />}
    </>
  );
  if (href) return <Link href={href} className={ROW}>{body}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={ROW}>{body}</button>;
  return <div className={ROW}>{body}</div>;
}

/** Ô số liệu nhỏ: icon màu, một con số lớn, một nhãn ngắn. */
export function MiniStat({ icon: Icon, tint, label, value, loading }: { icon: LucideIcon; tint: Tint; label: string; value: React.ReactNode; loading?: boolean }) {
  return (
    <div className="rounded-2xl bg-card p-3.5 ring-1 ring-border/60">
      <IconTile icon={Icon} tint={tint} className="size-8 rounded-lg" />
      <p className="mt-3 truncate text-[26px] font-bold leading-none tabular-nums tracking-tight">
        {loading ? <span className="inline-block h-6 w-8 animate-pulse rounded bg-muted align-middle" /> : value}
      </p>
      <p className="mt-1.5 truncate text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/** Thanh chọn kiểu phân đoạn (segmented control) của iOS. */
export function Segmented<T extends string>({ value, onChange, options, label, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string; className?: string }) {
  return (
    <div role="tablist" aria-label={label} className={cn("flex w-full rounded-xl bg-muted p-1", className)}>
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={cn("press min-h-9 flex-1 rounded-[10px] px-2 text-[13px] font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", value === o.value && "bg-card text-foreground shadow-sm")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
