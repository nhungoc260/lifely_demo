"use client";

import { useAppMode } from "@/hooks/use-app-mode";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  const appMode = useAppMode();
  // Giao diện app: tiêu đề đã nằm trên thanh trên cùng, chỉ giữ lại nút hành động.
  if (appMode) return actions ? <div className="flex flex-wrap items-center justify-end gap-2 pt-3">{actions}</div> : null;
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight md:text-3xl md:font-semibold">{title}</h1>
        {description && <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground md:line-clamp-none md:text-sm">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
