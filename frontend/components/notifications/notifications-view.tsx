"use client";

import { AlertTriangle, Bell, CheckCheck, CircleCheck, CircleX, Clock, HeartPulse, Info, Siren, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@/hooks/use-query";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { notificationApi } from "@/services";
import { useAuth } from "@/providers/auth-provider";
import { useNotifications } from "@/providers/notifications-provider";
import type { AppNotification, NotificationType } from "@/types/domain";

const ICONS: Record<NotificationType, LucideIcon> = {
  NEW_MATCH: HeartPulse, REQUEST_ACCEPTED: CircleCheck, REQUEST_REJECTED: CircleX, REQUEST_CANCELLED: CircleX,
  REQUEST_VERIFIED: CheckCheck, REQUEST_EXPIRED: Clock, EMERGENCY_ESCALATION: Siren, SYSTEM: Info,
};

export function NotificationsView() {
  const router = useRouter();
  const { role } = useAuth();
  const { version, unread, setUnread, refreshUnread } = useNotifications();
  const [page, setPage] = useState(0);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const q = useQuery(`notifications:${page}:${onlyUnread}:${version}`, () => notificationApi.list({ page, size: 15, unreadOnly: onlyUnread }));

  function target(n: AppNotification): string | null {
    if (n.referenceType === "MATCH" && n.referenceId && role === "DONOR") return `/donor/requests/${n.referenceId}`;
    if (n.referenceType === "REQUEST" && n.referenceId) {
      if (role === "DONOR") return "/donor/requests";
      if (role === "REQUESTER") return `/requester/requests/${n.referenceId}`;
      if (role === "ORGANIZATION") return `/organization/requests/${n.referenceId}`;
    }
    if (n.referenceType === "ORGANIZATION" && role === "ORGANIZATION") return "/organization/profile";
    return null;
  }

  async function open(n: AppNotification) {
    if (!n.read) {
      try {
        await notificationApi.read(n.id);
        q.mutate((p) => p && { ...p, items: p.items.map((x) => (x.id === n.id ? { ...x, read: true } : x)) });
        setUnread(Math.max(0, unread - 1));
      } catch { /* không chặn điều hướng */ }
    }
    const t = target(n);
    if (t) router.push(t);
  }

  async function markAll() {
    try {
      await notificationApi.readAll();
      q.mutate((p) => p && { ...p, items: p.items.map((x) => ({ ...x, read: true })) });
      setUnread(0);
      refreshUnread();
      toast.success("Đã đánh dấu tất cả thông báo là đã đọc");
    } catch { toast.error("Không cập nhật được thông báo. Vui lòng thử lại."); }
  }

  return (
    <>
      <PageHeader
        title="Thông báo"
        description={unread > 0 ? `${unread} chưa đọc` : "Bạn đã xem hết thông báo"}
        actions={
          <>
            <Button variant={onlyUnread ? "default" : "outline"} size="sm" aria-pressed={onlyUnread} onClick={() => { setOnlyUnread((v) => !v); setPage(0); }}>Chỉ chưa đọc</Button>
            <Button variant="outline" size="sm" onClick={markAll} disabled={unread === 0}><CheckCheck /> Đánh dấu tất cả đã đọc</Button>
          </>
        }
      />
      {q.initialLoading ? <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
        : q.error && !q.data ? <ErrorState message={q.error.message} onRetry={q.reload} />
        : q.data && q.data.items.length === 0 ? <EmptyState title={onlyUnread ? "Không có thông báo chưa đọc" : "Chưa có thông báo nào"} description="Chúng tôi sẽ báo ở đây khi có việc cần bạn chú ý." />
        : (
          <>
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {q.data?.items.map((n) => {
                const Icon = ICONS[n.type] ?? Bell;
                const critical = n.type === "NEW_MATCH" || n.type === "EMERGENCY_ESCALATION";
                return (
                  <li key={n.id}>
                    <button onClick={() => open(n)} className={cn("flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", !n.read && "bg-secondary/40")}>
                      <span className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl", critical ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                        {n.type === "EMERGENCY_ESCALATION" ? <AlertTriangle className="size-4" aria-hidden /> : <Icon className="size-4" aria-hidden />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2"><span className={cn("truncate text-sm", !n.read ? "font-semibold" : "font-medium")}>{n.title}</span>{!n.read && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Chưa đọc" />}</span>
                        <span className="mt-0.5 block text-sm text-muted-foreground">{n.message}</span>
                      </span>
                      <time dateTime={n.createdAt} className="shrink-0 pt-0.5 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</time>
                    </button>
                  </li>
                );
              })}
            </ul>
            {q.data && <Pagination page={q.data} onChange={setPage} />}
          </>
        )}
    </>
  );
}
