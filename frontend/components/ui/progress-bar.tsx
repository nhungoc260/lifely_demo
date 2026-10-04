import { cn } from "@/lib/utils";

export function ProgressBar({ value, max, label, className }: { value: number; max: number; label?: string; className?: string }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label ?? "Progress"}
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500 ease-out", pct >= 100 ? "bg-success" : "bg-primary")} style={{ width: `${pct}%` }} />
    </div>
  );
}
