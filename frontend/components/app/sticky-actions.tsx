"use client";

import { useAppMode } from "@/hooks/use-app-mode";

/** Hàng nút hành động chính. Trên web hiển thị bình thường; trong app thì dính sát phía trên thanh tab dưới để luôn bấm được mà không cần cuộn. */
export function StickyActions({ children, className }: { children: React.ReactNode; className?: string }) {
  const appMode = useAppMode();
  if (!appMode) return <div className={className}>{children}</div>;
  return (
    <>
      <div className="h-16" aria-hidden />
      <div className="fixed inset-x-0 bottom-[calc(58px+env(safe-area-inset-bottom))] z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-lg justify-between gap-3 [&>*]:flex-1">{children}</div>
      </div>
    </>
  );
}
