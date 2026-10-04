"use client";

import { createContext, useContext, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";

import { useQuery } from "@/hooks/use-query";
import { useRealtime } from "@/hooks/use-realtime";
import { notificationApi } from "@/services";
import { useAuth } from "@/providers/auth-provider";
import type { NotificationEvent } from "@/types/domain";

interface Ctx {
  unread: number;
  /** Tăng mỗi khi có thông báo mới: các màn hình danh sách dựa vào đây để tải lại. */
  version: number;
  setUnread: (n: number) => void;
  refreshUnread: () => void;
}

const NotificationsContext = createContext<Ctx>({ unread: 0, version: 0, setUnread: () => {}, refreshUnread: () => {} });

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [override, setOverride] = useState<{ version: number; value: number } | null>(null);
  const [version, setVersion] = useState(0);
  const q = useQuery(user ? `unread:${user.id}` : null, notificationApi.unread);

  useRealtime<NotificationEvent>(user ? "/user/queue/notifications" : null, (e) => {
    setOverride({ version: version + 1, value: e.unreadCount });
    setVersion((v) => v + 1);
    toast(e.notification.title, { description: e.notification.message });
  });

  const unread = override && override.version === version && version > 0 ? override.value : (q.data?.unread ?? 0);
  const setUnread = useCallback((n: number) => setOverride({ version, value: n }), [version]);

  const value = useMemo(() => ({ unread, version, setUnread, refreshUnread: q.reload }), [unread, version, setUnread, q.reload]);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export const useNotifications = () => useContext(NotificationsContext);
