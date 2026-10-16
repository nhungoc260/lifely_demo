"use client";

import { BellRing } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@/hooks/use-query";
import { toApiError } from "@/lib/api";
import { PushToggle } from "@/components/pwa/push-toggle";
import { consentApi } from "@/services";

type Key = "email" | "sms" | "voice" | "rejoinReminders";

/** Đồng ý nhận thông báo theo từng kênh. SMS và cuộc gọi mặc định TẮT; chỉ gửi khi bạn bật và quản trị đã bật kênh. */
export function ConsentCard() {
  const q = useQuery("consents", () => consentApi.get());
  const [busy, setBusy] = useState<Key | null>(null);
  const c = q.data;

  async function toggle(key: Key, value: boolean) {
    setBusy(key);
    try { const next = await consentApi.update({ [key]: value }); q.mutate(() => next); toast.success("Đã lưu lựa chọn nhận thông báo"); }
    catch (e) { toast.error(toApiError(e).message); }
    finally { setBusy(null); }
  }

  const rows: { key: Key | "inApp"; label: string; hint: string; on: boolean; locked?: boolean }[] = c ? [
    { key: "inApp", label: "Thông báo trong ứng dụng", hint: "Luôn bật để bạn không bỏ lỡ cập nhật quan trọng.", on: true, locked: true },
    { key: "email", label: "Email", hint: "Thông báo khẩn cấp và nhắc việc qua email.", on: c.email },
    { key: "rejoinReminders", label: "Nhắc khi có thể hiến máu lại", hint: "Tách riêng với thông báo khẩn cấp: tắt mục này không ảnh hưởng việc nhận yêu cầu máu.", on: c.rejoinReminders },
    { key: "sms", label: "SMS", hint: c.smsChannelEnabled ? "Nhận tin nhắn khi có yêu cầu gần bạn hoặc khi có lịch hẹn." : "Kênh SMS hiện chưa được bật ở hệ thống; lựa chọn của bạn vẫn được lưu.", on: c.sms },
    { key: "voice", label: "Cuộc gọi tự động", hint: c.voiceChannelEnabled ? "Chỉ dùng cho tình huống rất khẩn cấp." : "Kênh gọi tự động hiện chưa được bật ở hệ thống; lựa chọn của bạn vẫn được lưu.", on: c.voice },
  ] : [];

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><BellRing className="size-4" aria-hidden />Kênh nhận thông báo</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {q.initialLoading || !c ? <Skeleton className="h-32" /> : (
          <>
            {rows.map((r) => (
              <label key={r.key} className="flex items-start justify-between gap-4">
                <span>
                  <span className="block text-sm font-medium">{r.label}</span>
                  <span className="block text-xs text-muted-foreground">{r.hint}</span>
                </span>
                <input type="checkbox" className="mt-1 size-4 accent-primary" checked={r.on} disabled={r.locked || busy === r.key}
                  onChange={(e) => r.key !== "inApp" && toggle(r.key, e.target.checked)} aria-label={r.label} />
              </label>
            ))}
            <PushToggle />
            <p className="text-xs text-muted-foreground">
              Bạn có thể rút lại bất cứ lúc nào; tin chưa gửi sẽ bị hủy ngay. Nội dung chỉ báo có nhu cầu hỗ trợ, không khẳng định bạn đủ điều kiện hiến máu.
              {c.mockMode && " Hệ thống đang chạy chế độ thử nghiệm: SMS và cuộc gọi chưa được gửi thật."}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
