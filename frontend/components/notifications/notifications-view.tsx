"use client";

import { AlertTriangle, Bell, CalendarCheck, CalendarX2, CheckCheck, CircleCheck, CircleX, Clock, HeartPulse, Info, Siren, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useRef, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppMode } from "@/hooks/use-app-mode";
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
  APPOINTMENT_CONFIRMED: CalendarCheck, APPOINTMENT_CANCELLED: CalendarX2, APPOINTMENT_REMINDER: Bell,
  STAFF_NEW_REQUEST: Siren, STAFF_DONOR_RESPONDED: HeartPulse, REJOIN_REMINDER: HeartPulse,
};

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

export function NotificationsView() {
  const appMode = useAppMode();
  const startX = useRef<number | null>(null);
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
    if (n.referenceType === "APPOINTMENT" && role === "DONOR") return "/donor/appointments";
    if (n.referenceType === "HEALTH" && role === "DONOR") return "/donor/health";
    if (n.referenceType === "ORGANIZATION" && role === "ORGANIZATION") return "/organization/profile";
    if (role === "ADMIN") {
      if (n.referenceType === "REQUEST") return "/admin/requests";
      if (n.referenceType === "REPORT") return "/admin/reports";
      if (n.referenceType === "ORGANIZATION") return "/admin/organizations";
      if (n.referenceType === "CONTACT") return "/admin/messages";
    }
    return null;
  }

  async function markRead(n: AppNotification) {
    if (n.read) return;
    try {
      await notificationApi.read(n.id);
      q.mutate((p) => p && { ...p, items: p.items.map((x) => (x.id === n.id ? { ...x, read: true } : x)) });
      setUnread(Math.max(0, unread - 1));
    } catch { /* không chặn điều hướng */ }
  }

  /** Giao diện app: vuốt trái trên một thông báo để đánh dấu đã đọc. */
  const swipe = (n: AppNotification) => appMode ? {
    onTouchStart: (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; },
    onTouchEnd: (e: React.TouchEvent) => { if (startX.current !== null && e.changedTouches[0].clientX - startX.current < -60) void markRead(n); startX.current = null; },
  } : {};

  async function open(n: AppNotification) {
    await markRead(n);
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
      {appMode && unread > 0 && <p className="mb-2 text-xs text-muted-foreground">Vuốt trái trên một thông báo để đánh dấu đã đọc.</p>}
      {q.initialLoading ? <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
        : q.error && !q.data ? <ErrorState message={q.error.message} onRetry={q.reload} />
        : q.data && q.data.items.length === 0 ? <EmptyState title={onlyUnread ? "Không có thông báo chưa đọc" : "Chưa có thông báo nào"} description="Chúng tôi sẽ báo ở đây khi có việc cần bạn chú ý." />
        : (
          <>
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {q.data?.items.map((n, idx, arr) => {
                const Icon = ICONS[n.type] ?? Bell;
                const critical = n.type === "NEW_MATCH" || n.type === "EMERGENCY_ESCALATION";
                return (
                  <Fragment key={n.id}>
                  {appMode && (idx === 0 || isToday(arr[idx - 1].createdAt) !== isToday(n.createdAt)) && <li role="presentation" className="bg-muted px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{isToday(n.createdAt) ? "Hôm nay" : "Trước đó"}</li>}
                  <li>
                    <button onClick={() => open(n)} {...swipe(n)} className={cn("flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", !n.read && "bg-secondary/40")}>
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
                  </Fragment>
                );
              })}
            </ul>
            {q.data && <Pagination page={q.data} onChange={setPage} />}
          </>
        )}
    </>
  );
}
