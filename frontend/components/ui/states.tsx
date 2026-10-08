import { CircleAlert, Inbox, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  title, description, action, className,
}: { title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-12 text-center", className)}>
      <span className="mb-3 grid size-11 place-items-center rounded-full bg-muted text-muted-foreground"><Inbox className="size-5" aria-hidden /></span>
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center rounded-2xl border border-critical/25 bg-critical/5 px-6 py-10 text-center", className)}>
      <CircleAlert className="mb-2 size-6 text-critical" aria-hidden />
      <p className="font-medium">Đã xảy ra sự cố</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry && <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}><RefreshCw /> Thử lại</Button>}
    </div>
  );
}
